import { writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

import type { TrainingStrategy } from './types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface TrainConfig {
  baseModel?: string       // Default: 'unsloth/mistral-7b-instruct-v0.3'
  method?: 'qlora' | 'lora'
  rank?: number            // Default: 32
  maxSteps?: number        // Default: 60
  learningRate?: number    // Default: 2e-5
  cloud?: boolean          // Use HuggingFace Jobs
  hardware?: string        // 't4-small', 'a10g-large', etc.
  wandbProject?: string    // Default: 'mistral-maker'
  strategy?: TrainingStrategy  // Default: auto-detected from seeds
}

export class Trainer {
  constructor(private dataDir: string) {}

  detectStrategy(seedDir: string, override?: TrainingStrategy): TrainingStrategy {
    if (override) return override
    const hasDpo = existsSync(join(seedDir, 'dpo_seeds.jsonl'))
    return hasDpo ? 'dpo' : 'sft'
  }

  generateScript(seedDir: string, config: TrainConfig = {}): string {
    const {
      baseModel = 'unsloth/mistral-7b-instruct-v0.3',
      method = 'qlora',
      rank = 32,
      maxSteps = 60,
      learningRate = 2e-5,
      wandbProject = 'mistral-maker',
    } = config

    const strategy = this.detectStrategy(seedDir, config.strategy)
    const outputDir = join(this.dataDir, 'models', `run_${Date.now()}`)

    const seedDirPosix = seedDir.replace(/\\/g, '/')
    const outputDirPosix = outputDir.replace(/\\/g, '/')

    const { datasetBlock, trainerImport } = this.buildStrategyBlocks(strategy, seedDirPosix, outputDirPosix, maxSteps, learningRate)

    return `
import os
os.environ["WANDB_PROJECT"] = "${wandbProject}"

from unsloth import FastLanguageModel
import torch
from datasets import load_dataset
from trl import ${trainerImport}
import wandb
import weave
import json

# Initialize both W&B experiment tracking and Weave tracing
wandb.init(project="${wandbProject}", config={
    "base_model": "${baseModel}",
    "strategy": "${strategy}",
    "method": "${method}",
    "rank": ${rank},
    "max_steps": ${maxSteps},
    "learning_rate": ${learningRate},
})

weave_project = os.getenv("WEAVE_PROJECT", "cadecr-ghost-peony/${wandbProject}")
try:
    weave.init(weave_project)
except Exception:
    pass  # Weave optional — training continues without it

# Log seed dataset as Weave dataset artifact
try:
    seed_file = "${seedDirPosix}/${ strategy === 'dpo' ? 'dpo_seeds.jsonl' : 'sft_seeds.jsonl'}"
    with open(seed_file) as f:
        seed_rows = [json.loads(line) for line in f if line.strip()]
    weave.publish(weave.Dataset(name="training_seeds_${strategy}", rows=seed_rows))
except Exception:
    pass

# Load model
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="${baseModel}",
    max_seq_length=2048,
    load_in_4bit=${method === 'qlora' ? 'True' : 'False'},
    dtype=None,
)

# Add LoRA adapters
model = FastLanguageModel.get_peft_model(
    model,
    r=${rank},
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    lora_alpha=${rank * 2},
    lora_dropout=0.05,
    bias="none",
    use_gradient_checkpointing="unsloth",
)

# Load dataset
${datasetBlock}

trainer.train()
model.save_pretrained("${outputDirPosix}/adapter")
tokenizer.save_pretrained("${outputDirPosix}/adapter")
# Log adapter as W&B artifact
try:
    artifact = wandb.Artifact("adapter-${strategy}", type="model")
    artifact.add_dir("${outputDirPosix}/adapter")
    wandb.log_artifact(artifact)
except Exception:
    pass

wandb.finish()
print(f"Training complete. Adapter saved to ${outputDirPosix}/adapter")
`
  }

  async trainLocal(seedDir: string, config: TrainConfig = {}): Promise<string> {
    const script = this.generateScript(seedDir, config)
    const scriptPath = join(this.dataDir, 'train_script.py')
    writeFileSync(scriptPath, script)

    return new Promise((resolve, reject) => {
      const proc = spawn('python', [scriptPath])
      proc.stdout.on('data', (d: Buffer) => process.stdout.write(d))
      proc.stderr.on('data', (d: Buffer) => process.stderr.write(d))
      proc.on('close', (code: number | null) => {
        if (code !== 0) reject(new Error(`Training exited with code ${code}`))
        else resolve(join(this.dataDir, 'models'))
      })
    })
  }

  private buildStrategyBlocks(
    strategy: TrainingStrategy,
    seedDirPosix: string,
    outputDirPosix: string,
    maxSteps: number,
    learningRate: number,
  ): { datasetBlock: string; trainerImport: string } {
    const commonArgs = `
        output_dir="${outputDirPosix}",
        max_steps=${maxSteps},
        per_device_train_batch_size=1,
        gradient_accumulation_steps=8,
        learning_rate=${learningRate},
        warmup_ratio=0.1,
        logging_steps=1,
        report_to="wandb",
        bf16=torch.cuda.is_bf16_supported(),
        fp16=not torch.cuda.is_bf16_supported(),`

    // Formatting function that applies Mistral chat template to messages
    const formatFn = `
def format_chat(example):
    """Apply tokenizer chat template to messages column."""
    return {"text": tokenizer.apply_chat_template(example["messages"], tokenize=False)}
`

    switch (strategy) {
      case 'dpo':
        return {
          trainerImport: 'DPOTrainer, DPOConfig',
          datasetBlock: `dataset = load_dataset("json", data_files="${seedDirPosix}/dpo_seeds.jsonl", split="train")

# DPOTrainer expects prompt (str), chosen (list[dict]), rejected (list[dict])
# Our format already has these as message arrays — trl handles them natively
trainer = DPOTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    args=DPOConfig(${commonArgs}
    ),
)`,
        }

      case 'grpo':
        return {
          trainerImport: 'GRPOTrainer, GRPOConfig',
          datasetBlock: `dataset = load_dataset("json", data_files="${seedDirPosix}/sft_seeds.jsonl", split="train")
${formatFn}
dataset = dataset.map(format_chat)

trainer = GRPOTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    args=GRPOConfig(${commonArgs}
        num_generations=4,
    ),
)`,
        }

      case 'distillation':
        return {
          trainerImport: 'SFTTrainer, SFTConfig',
          datasetBlock: `dataset = load_dataset("json", data_files="${seedDirPosix}/distillation_seeds.jsonl", split="train")
${formatFn}
dataset = dataset.map(format_chat)

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    args=SFTConfig(${commonArgs}
        dataset_text_field="text",
    ),
)`,
        }

      case 'sft':
      default:
        return {
          trainerImport: 'SFTTrainer, SFTConfig',
          datasetBlock: `dataset = load_dataset("json", data_files="${seedDirPosix}/sft_seeds.jsonl", split="train")
${formatFn}
dataset = dataset.map(format_chat)

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    args=SFTConfig(${commonArgs}
        dataset_text_field="text",
    ),
)`,
        }
    }
  }

  /**
   * Upload seeds to HF Hub and submit a cloud training job
   * via the Python hf_cloud.py helper (uses huggingface_hub API).
   */
  async trainCloud(seedDir: string, config: TrainConfig = {}): Promise<string> {
    const hfCloudScript = join(__dirname, '..', 'weave-sidecar', 'hf_cloud.py')

    // Step 1: Upload seed data to HF Hub
    const strategy = this.detectStrategy(seedDir, config.strategy)
    const seedFile = join(seedDir, strategy === 'dpo' ? 'dpo_seeds.jsonl' : 'sft_seeds.jsonl')

    const uploadResult = await this.runPython(hfCloudScript, [
      'upload-seeds', seedFile,
    ])
    const upload = JSON.parse(uploadResult)
    if (upload.error) throw new Error(`Upload failed: ${upload.error}`)

    const datasetRepo = upload.repo

    // Step 2: Submit training job (amplification happens inside submit-job)
    const jobConfig = JSON.stringify({
      strategy,
      seedDir: seedDir.replace(/\\/g, '/'),
      baseModel: config.baseModel ?? 'unsloth/mistral-7b-instruct-v0.3',
      rank: config.rank ?? 32,
      maxSteps: config.maxSteps ?? 60,
      learningRate: config.learningRate ?? 2e-5,
      hardware: config.hardware ?? 'a10g-small',
      wandbProject: config.wandbProject ?? 'mistral-maker',
      amplify: true,
      amplificationFactor: 5,
    })

    const submitResult = await this.runPython(hfCloudScript, [
      'submit-job', datasetRepo, jobConfig,
    ])

    return submitResult
  }

  private runPython(script: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn('python', [script, ...args])
      let stdout = ''
      let stderr = ''
      proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
      proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
      proc.on('close', (code: number | null) => {
        if (code !== 0) reject(new Error(`Python script failed (${code}): ${stderr}`))
        else resolve(stdout)
      })
    })
  }
}
