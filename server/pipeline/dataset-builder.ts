import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { scoreTrace, classifyTier } from './scorer.js'
import type { ChatMessage, DpoSeed, SftSeed, Tier } from './types.js'

export interface BuildOptions {
  minTier?: Tier
  maxSeeds?: number
  dedup?: boolean
}

const SYSTEM_MESSAGE: ChatMessage = {
  role: 'system',
  content: `You are an AI level designer in Mistral Maker, a pixel-art platformer builder. The player describes what they want in natural language, and you use the available tools to create, modify, and arrange game entities on screen.

## Scale Reference
- Tiles are 32x32. Trees are 48x64. Structures are 64-128px.
- Items and decorations are 16x16. Ground line at y=400. Positive Y is down.

## Design Guidelines
- Place entities on solid ground or platforms. Space tiles 32px apart.
- Give every entity a descriptive name. Use multiple tool calls for complex scenes.
- When critiqued, adjust rather than rebuild from scratch.`,
}

/**
 * Convert raw tool calls from traces into the tool_calls format
 * that Mistral/OpenAI chat completions use.
 */
function formatToolCalls(toolCalls: any[]): any[] {
  return toolCalls.map((tc, i) => ({
    id: `call_${i}`,
    type: 'function',
    function: {
      name: tc.name ?? tc.function?.name ?? 'create_entity',
      arguments: tc.arguments ?? tc.function?.arguments ?? '{}',
    },
  }))
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
        const userMsg: ChatMessage = { role: 'user', content: trace.prompt }
        dpo.push({
          prompt: trace.prompt,
          chosen: [
            SYSTEM_MESSAGE,
            userMsg,
            {
              role: 'assistant',
              content: trace.feedback ?? 'Here is the corrected scene.',
              tool_calls: formatToolCalls(trace.chosen.toolCalls ?? []),
            },
          ],
          rejected: [
            SYSTEM_MESSAGE,
            userMsg,
            {
              role: 'assistant',
              content: '',
              tool_calls: formatToolCalls(trace.rejected.toolCalls ?? []),
            },
          ],
          feedback: trace.feedback ?? '',
        })
      } else if (trace.type === 'success') {
        const cognitive = trace.cognitive ?? trace.output?.cognitive
        const assistantContent = cognitive?.thinking
          ? `${cognitive.thinking}\n\n${trace.output?.description ?? 'Done!'}`
          : (trace.output?.description ?? 'Here is what I created.')
        sft.push({
          messages: [
            SYSTEM_MESSAGE,
            { role: 'user', content: trace.prompt },
            {
              role: 'assistant',
              content: assistantContent,
              tool_calls: formatToolCalls(trace.output?.toolCalls ?? []),
            },
          ],
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
