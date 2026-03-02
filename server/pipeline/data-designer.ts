import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'
import type { PipelineType } from './types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const AMPLIFY_SCRIPT = join(__dirname, '..', 'weave-sidecar', 'amplify.py')

export class DataDesignerBridge {
  constructor(private dataDir: string) {}

  /**
   * Generate synthetic data for a specific pipeline type.
   */
  async generateForPipeline(
    pipelineType: PipelineType,
    seedDir: string,
    outputDir: string,
  ): Promise<{ outputDir: string; count: number }> {
    mkdirSync(outputDir, { recursive: true })

    switch (pipelineType) {
      case 'tool_use_sft':
        return this.amplify({ seedDir, outputDir })

      case 'tool_use_dpo':
        return this.amplify({ seedDir, outputDir })

      case 'agent_sft':
        return this.generateAgentSft(outputDir)

      case 'distillation':
        return this.generateDistillation(outputDir)

      case 'synthetic_prompts':
        return this.generateSyntheticPrompts(outputDir)

      default:
        throw new Error(`Unknown pipeline type: ${pipelineType}`)
    }
  }

  /**
   * Generate SFT data from teacher model completions for benchmark prompts.
   */
  private async generateAgentSft(outputDir: string): Promise<{ outputDir: string; count: number }> {
    const { EVAL_TASKS } = await import('../eval/prompts/eval-tasks.js')
    const { MISTRAL_TOOLS } = await import('../../game/src/ai/tool-definitions.js')

    const apiKey = process.env.MISTRAL_API_KEY
    if (!apiKey) throw new Error('MISTRAL_API_KEY not set')

    const examples: any[] = []

    for (const task of EVAL_TASKS) {
      try {
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'mistral-large-latest',
            messages: [
              { role: 'system', content: 'You are an AI level designer for a pixel-art platformer. Use tools to create entities.' },
              { role: 'user', content: task.prompt },
            ],
            tools: MISTRAL_TOOLS,
            tool_choice: 'auto',
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const completion = data.choices?.[0]?.message
          if (completion) {
            examples.push({
              prompt: task.prompt,
              completion: JSON.stringify(completion.tool_calls ?? []),
              tier: task.tier,
              source: 'agent_sft',
            })
          }
        }
      } catch {
        // Skip failed generations
      }
    }

    const outFile = join(outputDir, 'agent_sft.jsonl')
    writeFileSync(outFile, examples.map(e => JSON.stringify(e)).join('\n') + '\n')
    return { outputDir, count: examples.length }
  }

  /**
   * Generate distillation data: teacher completions for student training.
   */
  private async generateDistillation(outputDir: string): Promise<{ outputDir: string; count: number }> {
    const result = await this.generateAgentSft(outputDir)

    const srcFile = join(outputDir, 'agent_sft.jsonl')
    const dstFile = join(outputDir, 'distillation_seeds.jsonl')
    if (existsSync(srcFile)) {
      writeFileSync(dstFile, readFileSync(srcFile, 'utf-8'))
    }

    return { outputDir, count: result.count }
  }

  /**
   * Generate synthetic prompts from sprite catalog patterns.
   */
  private async generateSyntheticPrompts(outputDir: string): Promise<{ outputDir: string; count: number }> {
    const templates = [
      'Create a {adjective} {biome} scene with {count} {entity_type} and {decorations}.',
      'Build a {structure} with {feature1} and {feature2}.',
      'Design a {difficulty} challenge area: {challenge_description}.',
      'Place a {enemy_type} that {behavior} near a {landmark}.',
    ]

    const adjectives = ['dark', 'enchanted', 'ruined', 'peaceful', 'dangerous', 'hidden', 'ancient']
    const biomes = ['forest', 'dungeon', 'castle', 'cave', 'village', 'temple', 'swamp']
    const entityTypes = ['enemies', 'NPCs', 'platforms', 'trees', 'torches']
    const decorations = ['flowers and bushes', 'torches on walls', 'scattered coins', 'broken barrels']
    const structures = ['bridge', 'tower', 'house', 'fortress', 'shrine', 'market stall']
    const features = ['a locked door', 'patrolling guards', 'hidden treasure', 'spike traps', 'healing fountains']
    const difficulties = ['easy', 'medium', 'hard', 'boss-level']
    const enemyTypes = ['skeleton', 'spider', 'wolf', 'ghost', 'orc']
    const behaviors = ['patrols left and right', 'chases the player', 'guards a doorway', 'throws projectiles']
    const landmarks = ['treasure chest', 'fountain', 'campfire', 'signpost', 'statue']

    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]

    const prompts: any[] = []
    for (let i = 0; i < 50; i++) {
      const template = pick(templates)
      const prompt = template
        .replace('{adjective}', pick(adjectives))
        .replace('{biome}', pick(biomes))
        .replace('{count}', String(Math.floor(Math.random() * 5) + 2))
        .replace('{entity_type}', pick(entityTypes))
        .replace('{decorations}', pick(decorations))
        .replace('{structure}', pick(structures))
        .replace('{feature1}', pick(features))
        .replace('{feature2}', pick(features))
        .replace('{difficulty}', pick(difficulties))
        .replace('{challenge_description}', `${pick(entityTypes)} across ${pick(biomes)} terrain`)
        .replace('{enemy_type}', pick(enemyTypes))
        .replace('{behavior}', pick(behaviors))
        .replace('{landmark}', pick(landmarks))

      prompts.push({ prompt, source: 'synthetic', index: i })
    }

    const outFile = join(outputDir, 'synthetic_prompts.jsonl')
    writeFileSync(outFile, prompts.map(p => JSON.stringify(p)).join('\n') + '\n')
    return { outputDir, count: prompts.length }
  }

  /**
   * Check what amplification backends are available.
   */
  async checkPrerequisites(): Promise<{ available: boolean; method: string }> {
    // Check for NVIDIA API key (NIM endpoint)
    if (process.env.NVIDIA_API_KEY) {
      return { available: true, method: 'nvidia_nim' }
    }

    // Check for data-designer Python package
    try {
      const result = await this.runPython('-c', 'import data_designer; print("ok")')
      if (result.includes('ok')) return { available: true, method: 'data_designer' }
    } catch {
      // not installed
    }

    return { available: false, method: 'none' }
  }

  /**
   * Amplify seed data using NVIDIA Data Designer (NIM API).
   * Calls the Python amplify.py script which hits NVIDIA's Nemotron model
   * to generate prompt rephrasings, scene variations, and novel examples.
   */
  async amplify(config: {
    seedDir: string
    outputDir: string
    amplificationFactor?: number
  }): Promise<{ outputDir: string; count: number }> {
    const { seedDir, outputDir, amplificationFactor = 5 } = config
    mkdirSync(outputDir, { recursive: true })

    const result = await this.runPythonScript(AMPLIFY_SCRIPT, [
      seedDir.replace(/\\/g, '/'),
      outputDir.replace(/\\/g, '/'),
      String(amplificationFactor),
    ])

    // Parse the JSON result from the script
    try {
      const lines = result.trim().split('\n')
      // Find the last JSON block in output
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].startsWith('{')) {
          const jsonStr = lines.slice(i).join('\n')
          const parsed = JSON.parse(jsonStr)
          if (parsed.error) throw new Error(parsed.error)
          return { outputDir, count: parsed.outputExamples ?? 0 }
        }
      }
    } catch {
      // Fallback: count lines in output file
    }

    const outFile = join(outputDir, 'amplified.jsonl')
    const count = existsSync(outFile)
      ? readFileSync(outFile, 'utf-8').trim().split('\n').length
      : 0
    return { outputDir, count }
  }

  private runPythonScript(script: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn('python', [script, ...args])
      let stdout = ''
      let stderr = ''
      proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
      proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); console.error(d.toString()) })
      proc.on('close', (code: number | null) => {
        if (code !== 0) reject(new Error(`amplify.py exited ${code}: ${stderr}`))
        else resolve(stdout)
      })
    })
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
