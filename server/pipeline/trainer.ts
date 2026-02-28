import { writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { spawn } from 'child_process'

export interface TrainConfig {
  baseModel?: string       // Default: 'unsloth/mistral-7b-instruct-v0.3'
  method?: 'qlora' | 'lora'
  rank?: number            // Default: 32
  maxSteps?: number        // Default: 60
  learningRate?: number    // Default: 2e-5
  cloud?: boolean          // Use HuggingFace Jobs
  hardware?: string        // 't4-small', 'a10g-large', etc.
  wandbProject?: string    // Default: 'mistral-maker'
}

export class Trainer {
  constructor(private dataDir: string) {}

  detectStrategy(seedDir: string): 'dpo' | 'sft' {
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

    const strategy = this.detectStrategy(seedDir)
    const outputDir = join(this.dataDir, 'models', `run_${Date.now()}`)

    const seedDirPosix = seedDir.replace(/\\/g, '/')
    const outputDirPosix = outputDir.replace(/\\/g, '/')

    const datasetBlock = strategy === 'dpo'
      ? `dataset = load_dataset("json", data_files="${seedDirPosix}/dpo_seeds.jsonl", split="train")

trainer = DPOTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    args=DPOConfig(
        output_dir="${outputDirPosix}",
        max_steps=${maxSteps},
        per_device_train_batch_size=1,
        gradient_accumulation_steps=8,
        learning_rate=${learningRate},
        warmup_ratio=0.1,
        logging_steps=1,
        report_to="wandb",
        bf16=torch.cuda.is_bf16_supported(),
        fp16=not torch.cuda.is_bf16_supported(),
    ),
)`
      : `dataset = load_dataset("json", data_files="${seedDirPosix}/sft_seeds.jsonl", split="train")

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    args=SFTConfig(
        output_dir="${outputDirPosix}",
        max_steps=${maxSteps},
        per_device_train_batch_size=1,
        gradient_accumulation_steps=8,
        learning_rate=${learningRate},
        warmup_ratio=0.1,
        logging_steps=1,
        report_to="wandb",
        bf16=torch.cuda.is_bf16_supported(),
        fp16=not torch.cuda.is_bf16_supported(),
    ),
)`

    const trainerImport = strategy === 'dpo'
      ? 'DPOTrainer, DPOConfig'
      : 'SFTTrainer, SFTConfig'

    return `
import os
os.environ["WANDB_PROJECT"] = "${wandbProject}"

from unsloth import FastLanguageModel
import torch
from datasets import load_dataset
from trl import ${trainerImport}
import wandb

wandb.init(project="${wandbProject}", config={
    "base_model": "${baseModel}",
    "strategy": "${strategy}",
    "method": "${method}",
    "rank": ${rank},
    "max_steps": ${maxSteps},
    "learning_rate": ${learningRate},
})

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

  async trainCloud(seedDir: string, config: TrainConfig = {}): Promise<string> {
    const { hardware = 't4-small' } = config
    const script = this.generateScript(seedDir, config)
    const scriptPath = join(this.dataDir, 'train_script.py')
    writeFileSync(scriptPath, script)

    return new Promise((resolve, reject) => {
      const proc = spawn('hf', [
        'jobs', 'uv', 'run',
        '--hardware', hardware,
        scriptPath,
      ])
      let output = ''
      proc.stdout.on('data', (d: Buffer) => { output += d.toString(); process.stdout.write(d) })
      proc.stderr.on('data', (d: Buffer) => process.stderr.write(d))
      proc.on('close', (code: number | null) => {
        if (code !== 0) reject(new Error(`Cloud training failed: ${output}`))
        else resolve(output)
      })
    })
  }
}
