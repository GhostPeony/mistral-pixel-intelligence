import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { spawn } from 'child_process'

export class DataDesignerBridge {
  constructor(private dataDir: string) {}

  async checkPrerequisites(): Promise<{ available: boolean; method: string }> {
    // Check for nemo-data-designer Python package
    try {
      const result = await this.runPython('-c', 'import nemo_data_designer; print("ok")')
      if (result.includes('ok')) return { available: true, method: 'nemo' }
    } catch {
      // nemo not available, try fallback
    }

    // Fallback: check for Ollama
    try {
      const res = await fetch('http://localhost:11434/api/tags')
      if (res.ok) return { available: true, method: 'ollama' }
    } catch {
      // ollama not available
    }

    return { available: false, method: 'none' }
  }

  async amplify(config: {
    seedDir: string
    outputDir: string
    amplificationFactor?: number
  }): Promise<{ outputDir: string; count: number }> {
    const { seedDir, outputDir, amplificationFactor = 3 } = config
    mkdirSync(outputDir, { recursive: true })

    const script = this.generateScript(seedDir, outputDir, amplificationFactor)
    const scriptPath = join(this.dataDir, 'amplify_script.py')
    writeFileSync(scriptPath, script)

    return new Promise((resolve, reject) => {
      const proc = spawn('python', [scriptPath], { cwd: this.dataDir })
      let output = ''
      proc.stdout.on('data', (d: Buffer) => { output += d.toString() })
      proc.stderr.on('data', (d: Buffer) => { console.error(d.toString()) })
      proc.on('close', (code: number | null) => {
        if (code !== 0) return reject(new Error(`Data Designer exited with code ${code}`))
        const outFile = join(outputDir, 'amplified.jsonl')
        const count = existsSync(outFile)
          ? readFileSync(outFile, 'utf-8').trim().split('\n').length
          : 0
        resolve({ outputDir, count })
      })
    })
  }

  private generateScript(seedDir: string, outputDir: string, factor: number): string {
    return `
import json, os, random

SEED_DIR = ${JSON.stringify(seedDir.replace(/\\/g, '/'))}
OUTPUT_DIR = ${JSON.stringify(outputDir.replace(/\\/g, '/'))}
FACTOR = ${factor}

try:
    from nemo_data_designer import DataDesigner
    # Use NVIDIA Data Designer for high-quality synthetic generation
    designer = DataDesigner()
    seeds = []
    for f in os.listdir(SEED_DIR):
        if f.endswith('.jsonl'):
            with open(os.path.join(SEED_DIR, f)) as fh:
                seeds.extend([json.loads(l) for l in fh if l.strip()])

    amplified = designer.amplify(seeds, factor=FACTOR)
    with open(os.path.join(OUTPUT_DIR, 'amplified.jsonl'), 'w') as fh:
        for item in amplified:
            fh.write(json.dumps(item) + '\\n')
    print(f"Amplified {len(seeds)} seeds to {len(amplified)} examples via NeMo Data Designer")

except ImportError:
    # Fallback: simple variation generation
    print("NeMo Data Designer not available, using variation generator")
    seeds = []
    for f in os.listdir(SEED_DIR):
        if f.endswith('.jsonl'):
            with open(os.path.join(SEED_DIR, f)) as fh:
                seeds.extend([json.loads(l) for l in fh if l.strip()])

    amplified = []
    for seed in seeds:
        amplified.append(seed)  # Keep original
        for i in range(FACTOR - 1):
            variation = json.loads(json.dumps(seed))
            # Add coordinate jitter to tool calls
            if 'chosen' in variation:
                try:
                    calls = json.loads(variation['chosen'])
                    for call in calls:
                        if 'arguments' in call:
                            args = call['arguments'] if isinstance(call['arguments'], dict) else json.loads(call['arguments'])
                            if 'entities' in args:
                                for ent in args['entities']:
                                    if 'x' in ent: ent['x'] += random.randint(-30, 30)
                                    if 'y' in ent: ent['y'] += random.randint(-20, 20)
                            call['arguments'] = args
                    variation['chosen'] = json.dumps(calls)
                except: pass
            variation['source'] = 'synthetic'
            amplified.append(variation)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(os.path.join(OUTPUT_DIR, 'amplified.jsonl'), 'w') as fh:
        for item in amplified:
            fh.write(json.dumps(item) + '\\n')
    print(f"Generated {len(amplified)} examples from {len(seeds)} seeds (variation fallback)")
`
  }

  private runPython(...args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn('python', args)
      let out = ''
      proc.stdout.on('data', (d: Buffer) => { out += d.toString() })
      proc.on('close', (code: number | null) => code === 0 ? resolve(out) : reject(new Error(`Exit ${code}`)))
    })
  }
}
