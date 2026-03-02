"""HuggingFace Cloud Training — upload data, submit jobs, deploy models.

Usage (from Node trainer.ts via subprocess):
  python hf_cloud.py upload-seeds  <jsonl_path> <repo_id>
  python hf_cloud.py submit-job    <repo_id> <config_json>
  python hf_cloud.py job-status    <job_id>
  python hf_cloud.py deploy        <model_repo> [endpoint_name]
  python hf_cloud.py teardown      <endpoint_name>
"""

import json
import os
import sys
import textwrap
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

from huggingface_hub import HfApi

HF_TOKEN = os.getenv("HF_TOKEN", "")
HF_ORG = os.getenv("HF_ORG", "GhostPeony")
WANDB_PROJECT = os.getenv("WANDB_PROJECT", "mistral-maker")

api = HfApi(token=HF_TOKEN)


# ---------------------------------------------------------------------------
# 1. Upload seed dataset to HF Hub
# ---------------------------------------------------------------------------


def upload_seeds(jsonl_path: str, repo_id: str) -> dict:
    """Upload a JSONL seed file to HF Hub as a dataset repo."""
    jsonl = Path(jsonl_path)
    if not jsonl.exists():
        return {"error": f"File not found: {jsonl_path}"}

    # Create dataset repo (idempotent)
    api.create_repo(repo_id=repo_id, repo_type="dataset", private=True, exist_ok=True)

    # Upload the JSONL file
    api.upload_file(
        path_or_fileobj=str(jsonl),
        path_in_repo=jsonl.name,
        repo_id=repo_id,
        repo_type="dataset",
    )

    return {"status": "uploaded", "repo": repo_id, "file": jsonl.name}


# ---------------------------------------------------------------------------
# 2. Generate UV training script
# ---------------------------------------------------------------------------


def generate_uv_script(
    dataset_repo: str,
    output_repo: str,
    strategy: str = "sft",
    base_model: str = "unsloth/mistral-7b-instruct-v0.3",
    rank: int = 32,
    max_steps: int = 60,
    learning_rate: float = 2e-5,
) -> str:
    """Generate a self-contained UV training script for HF Jobs."""

    seed_file = "dpo_seeds.jsonl" if strategy == "dpo" else "sft_seeds.jsonl"

    # Common training args
    common_args = f"""\
                output_dir="./output",
                max_steps={max_steps},
                per_device_train_batch_size=1,
                gradient_accumulation_steps=8,
                learning_rate={learning_rate},
                warmup_ratio=0.1,
                logging_steps=1,
                report_to="wandb",
                bf16=True,
                push_to_hub=True,
                hub_model_id="{output_repo}",
                hub_token=os.environ["HF_TOKEN"],"""

    if strategy == "dpo":
        trainer_import = "DPOTrainer, DPOConfig"
        # DPOTrainer natively handles message arrays in prompt/chosen/rejected columns
        trainer_block = textwrap.dedent(f"""\
            trainer = DPOTrainer(
                model=model,
                tokenizer=tokenizer,
                train_dataset=dataset,
                args=DPOConfig(
    {common_args}
                ),
            )""")
    else:
        trainer_import = "SFTTrainer, SFTConfig"
        # SFTTrainer: apply chat template to messages column -> text column
        trainer_block = textwrap.dedent(f"""\
            def format_chat(example):
                return {{"text": tokenizer.apply_chat_template(example["messages"], tokenize=False)}}
            dataset = dataset.map(format_chat)

            trainer = SFTTrainer(
                model=model,
                tokenizer=tokenizer,
                train_dataset=dataset,
                args=SFTConfig(
    {common_args}
                    dataset_text_field="text",
                ),
            )""")

    return textwrap.dedent(f"""\
        # /// script
        # dependencies = [
        #     "unsloth",
        #     "trl>=0.12.0",
        #     "peft",
        #     "datasets",
        #     "bitsandbytes",
        #     "wandb",
        #     "weave",
        # ]
        # ///

        import os
        os.environ["WANDB_PROJECT"] = "{WANDB_PROJECT}"

        from unsloth import FastLanguageModel
        from datasets import load_dataset
        from trl import {trainer_import}
        import wandb
        import weave

        wandb.init(project="{WANDB_PROJECT}", config={{
            "base_model": "{base_model}",
            "strategy": "{strategy}",
            "method": "qlora",
            "rank": {rank},
            "max_steps": {max_steps},
            "learning_rate": {learning_rate},
        }})

        try:
            weave.init("cadecr-ghost-peony/{WANDB_PROJECT}")
        except Exception:
            pass

        # Load model with 4-bit quantization
        model, tokenizer = FastLanguageModel.from_pretrained(
            model_name="{base_model}",
            max_seq_length=2048,
            load_in_4bit=True,
            dtype=None,
        )

        # Add LoRA adapters
        model = FastLanguageModel.get_peft_model(
            model,
            r={rank},
            target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
            lora_alpha={rank * 2},
            lora_dropout=0.05,
            bias="none",
            use_gradient_checkpointing="unsloth",
        )

        # Load dataset from HF Hub
        dataset = load_dataset("{dataset_repo}", data_files="{seed_file}", split="train")

        # Train
        {trainer_block}

        trainer.train()
        trainer.push_to_hub()

        # Also log adapter as W&B artifact
        try:
            artifact = wandb.Artifact("adapter-{strategy}", type="model")
            artifact.add_dir("./output")
            wandb.log_artifact(artifact)
        except Exception:
            pass

        wandb.finish()
        print(f"Training complete. Model pushed to {output_repo}")
    """)


# ---------------------------------------------------------------------------
# 3. Submit HF Job
# ---------------------------------------------------------------------------


def submit_job(dataset_repo: str, config: dict) -> dict:
    """Amplify seeds, upload, generate script, and submit as HF Job.

    The dataset_repo may already be uploaded, or it can be a local seed dir.
    If 'amplify' is true in config (default), runs NVIDIA Data Designer
    amplification before uploading.
    """

    strategy = config.get("strategy", "sft")
    base_model = config.get("baseModel", "unsloth/mistral-7b-instruct-v0.3")
    rank = config.get("rank", 32)
    max_steps = config.get("maxSteps", 60)
    learning_rate = config.get("learningRate", 2e-5)
    hardware = config.get("hardware", "a10g-small")
    timeout = config.get("timeout", "4h")
    should_amplify = config.get("amplify", True)
    amplification_factor = config.get("amplificationFactor", 5)
    seed_dir = config.get("seedDir")  # local path to seed JSONL files

    output_repo = config.get(
        "outputRepo", f"{HF_ORG}/mistral-maker-{strategy}-v1"
    )

    # --- Amplification step (NVIDIA Data Designer via NIM API) ---
    amplify_result = None
    if should_amplify and seed_dir:
        from amplify import amplify as run_amplify

        amplify_output = str(Path(seed_dir) / "amplified")
        print(f"Amplifying seeds from {seed_dir} (factor={amplification_factor})...")
        amplify_result = run_amplify(seed_dir, amplify_output, amplification_factor)

        if amplify_result.get("error"):
            print(f"Amplification failed: {amplify_result['error']}, proceeding with raw seeds")
        else:
            # Upload the amplified data instead of raw seeds
            amplified_file = amplify_result.get("outputFile", "")
            if amplified_file and Path(amplified_file).exists():
                print(f"Uploading amplified data ({amplify_result.get('outputExamples', 0)} examples)...")
                upload_seeds(amplified_file, dataset_repo)
                print(f"Amplified data uploaded to {dataset_repo}")

    # Create output model repo (idempotent)
    api.create_repo(repo_id=output_repo, private=True, exist_ok=True)

    # Generate UV training script
    script = generate_uv_script(
        dataset_repo=dataset_repo,
        output_repo=output_repo,
        strategy=strategy,
        base_model=base_model,
        rank=rank,
        max_steps=max_steps,
        learning_rate=learning_rate,
    )

    # Write script to temp file
    script_path = Path(__file__).parent / "train_job.py"
    script_path.write_text(script)

    # Submit via huggingface_hub Python API
    try:
        from huggingface_hub import run_uv_job

        job = run_uv_job(
            str(script_path),
            flavor=hardware,
            timeout=timeout,
            secrets={"HF_TOKEN": HF_TOKEN, "WANDB_API_KEY": os.getenv("WANDB_API_KEY", "")},
        )
        return {
            "status": "submitted",
            "jobId": job.id if hasattr(job, "id") else str(job),
            "hardware": hardware,
            "outputRepo": output_repo,
            "strategy": strategy,
            "scriptPath": str(script_path),
        }
    except ImportError:
        # run_uv_job not available in this version — save script for manual submission
        return {
            "status": "script_generated",
            "message": "huggingface_hub version doesn't support run_uv_job. Install hf CLI and run: hf jobs uv run --flavor {hardware} --timeout {timeout} --secrets HF_TOKEN WANDB_API_KEY {script_path}",
            "scriptPath": str(script_path),
            "outputRepo": output_repo,
            "hardware": hardware,
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "scriptPath": str(script_path),
            "outputRepo": output_repo,
        }


# ---------------------------------------------------------------------------
# 4. Job status
# ---------------------------------------------------------------------------


def job_status(job_id: str) -> dict:
    """Check the status of an HF Job."""
    try:
        from huggingface_hub import inspect_job

        info = inspect_job(job_id)
        return {
            "jobId": job_id,
            "stage": info.status.stage if hasattr(info, "status") else "unknown",
            "raw": str(info),
        }
    except ImportError:
        return {"error": "inspect_job not available in this huggingface_hub version"}
    except Exception as e:
        return {"error": str(e)}


# ---------------------------------------------------------------------------
# 5. Deploy model as Inference Endpoint
# ---------------------------------------------------------------------------


def deploy_model(model_repo: str, endpoint_name: str | None = None) -> dict:
    """Create an HF Inference Endpoint for a trained model."""
    if not endpoint_name:
        endpoint_name = model_repo.split("/")[-1][:32]

    try:
        from huggingface_hub import create_inference_endpoint

        endpoint = create_inference_endpoint(
            endpoint_name,
            repository=model_repo,
            framework="pytorch",
            task="text-generation",
            accelerator="gpu",
            vendor="aws",
            region="us-east-1",
            type="protected",
            instance_size="x1",
            instance_type="nvidia-a10g",
        )

        return {
            "status": "creating",
            "name": endpoint_name,
            "url": endpoint.url,
            "model": model_repo,
        }
    except ImportError:
        # Fallback: use free Inference API (rate-limited, cold starts)
        url = f"https://api-inference.huggingface.co/models/{model_repo}/v1/chat/completions"
        return {
            "status": "using_free_api",
            "url": url,
            "model": model_repo,
            "note": "Using free Inference API. For production, create an Inference Endpoint from HF dashboard.",
        }
    except Exception as e:
        url = f"https://api-inference.huggingface.co/models/{model_repo}/v1/chat/completions"
        return {
            "status": "fallback_free_api",
            "error": str(e),
            "url": url,
            "model": model_repo,
        }


# ---------------------------------------------------------------------------
# 6. Teardown endpoint
# ---------------------------------------------------------------------------


def teardown_endpoint(endpoint_name: str) -> dict:
    """Delete an HF Inference Endpoint."""
    try:
        from huggingface_hub import get_inference_endpoint

        endpoint = get_inference_endpoint(endpoint_name)
        endpoint.delete()
        return {"status": "deleted", "name": endpoint_name}
    except Exception as e:
        return {"error": str(e)}


# ---------------------------------------------------------------------------
# CLI entrypoint
# ---------------------------------------------------------------------------


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == "upload-seeds":
        jsonl_path = sys.argv[2]
        repo_id = sys.argv[3] if len(sys.argv) > 3 else f"{HF_ORG}/mistral-maker-seeds"
        result = upload_seeds(jsonl_path, repo_id)

    elif cmd == "submit-job":
        dataset_repo = sys.argv[2]
        config = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
        result = submit_job(dataset_repo, config)

    elif cmd == "job-status":
        job_id = sys.argv[2]
        result = job_status(job_id)

    elif cmd == "deploy":
        model_repo = sys.argv[2]
        endpoint_name = sys.argv[3] if len(sys.argv) > 3 else None
        result = deploy_model(model_repo, endpoint_name)

    elif cmd == "teardown":
        endpoint_name = sys.argv[2]
        result = teardown_endpoint(endpoint_name)

    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
