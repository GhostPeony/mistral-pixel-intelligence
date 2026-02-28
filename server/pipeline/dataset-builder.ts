import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { scoreTrace, classifyTier } from './scorer.js'
import type { DpoSeed, SftSeed, Tier } from './types.js'

export interface BuildOptions {
  minTier?: Tier
  maxSeeds?: number
  dedup?: boolean
}

export class DatasetBuilder {
  constructor(private dataDir: string) {}

  buildSeeds(options: BuildOptions = {}): { dpo: DpoSeed[]; sft: SftSeed[] } {
    const { minTier = 'bronze', maxSeeds = 500, dedup = true } = options
    const traces = this.readTraces()

    const dpo: DpoSeed[] = []
    const sft: SftSeed[] = []
    const seen = new Set<string>()

    for (const trace of traces) {
      const score = scoreTrace(trace)
      const tier = classifyTier(score.overall, trace.attempts)

      if (!meetsMinTier(tier, minTier)) continue

      // Dedup by prompt hash
      const hash = simpleHash(trace.prompt)
      if (dedup && seen.has(hash)) continue
      seen.add(hash)

      if (trace.type === 'correction') {
        dpo.push({
          prompt: trace.prompt,
          chosen: JSON.stringify(trace.chosen.toolCalls),
          rejected: JSON.stringify(trace.rejected.toolCalls),
          feedback: trace.feedback ?? '',
        })
      } else if (trace.type === 'success') {
        sft.push({
          prompt: trace.prompt,
          completion: JSON.stringify(trace.output.toolCalls),
        })
      }

      if (dpo.length + sft.length >= maxSeeds) break
    }

    return { dpo, sft }
  }

  buildAndWrite(options: BuildOptions = {}): string {
    const { dpo, sft } = this.buildSeeds(options)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const dir = join(this.dataDir, 'datasets', timestamp)
    mkdirSync(dir, { recursive: true })

    if (dpo.length > 0) {
      writeFileSync(join(dir, 'dpo_seeds.jsonl'), dpo.map(d => JSON.stringify(d)).join('\n') + '\n')
    }
    if (sft.length > 0) {
      writeFileSync(join(dir, 'sft_seeds.jsonl'), sft.map(s => JSON.stringify(s)).join('\n') + '\n')
    }

    const metadata = {
      createdAt: new Date().toISOString(),
      dpoCount: dpo.length,
      sftCount: sft.length,
      minTier: options.minTier ?? 'bronze',
    }
    writeFileSync(join(dir, 'metadata.json'), JSON.stringify(metadata, null, 2))

    return dir
  }

  private readTraces(): any[] {
    const file = join(this.dataDir, 'traces.jsonl')
    if (!existsSync(file)) return []
    return readFileSync(file, 'utf-8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l))
  }
}

function meetsMinTier(tier: Tier, min: Tier): boolean {
  const order: Tier[] = ['gold', 'silver', 'bronze', 'failed']
  return order.indexOf(tier) <= order.indexOf(min)
}

function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return hash.toString(36)
}
