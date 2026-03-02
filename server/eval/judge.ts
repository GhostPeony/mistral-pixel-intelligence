import type { JudgeModel } from './types.js'
import { JUDGE_SYSTEM_PROMPT } from './prompts/judge-system.js'

export interface JudgeInput {
  prompt: string
  entities: { name: string; assetId: string; x: number; y: number; components: string[] }[]
  toolCalls: { name: string; arguments: Record<string, unknown> }[]
}

export interface JudgeOutput {
  thematic_coherence: number
  spatial_composition: number
  naming_quality: number
  creativity: number
  summary: string
}

/**
 * LLM-as-judge wrapper — evaluates design quality using a Mistral model.
 * Low temperature for consistency across runs.
 */
export async function judgeDesign(
  input: JudgeInput,
  model: JudgeModel = 'mistral-large-latest',
): Promise<JudgeOutput> {
  const apiKey = process.env.MISTRAL_API_KEY
  if (!apiKey) throw new Error('MISTRAL_API_KEY not set')

  const entitySummary = input.entities
    .map(e => `- "${e.name}" [${e.assetId}] at (${e.x}, ${e.y})${e.components.length > 0 ? ` [${e.components.join(', ')}]` : ''}`)
    .join('\n')

  const toolSummary = input.toolCalls
    .map(tc => `- ${tc.name}(${JSON.stringify(tc.arguments)})`)
    .join('\n')

  const userMessage = `## Player Prompt
"${input.prompt}"

## Entities Created (${input.entities.length} total)
${entitySummary}

## Tool Calls Made (${input.toolCalls.length} total)
${toolSummary}`

  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: JUDGE_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Judge API error ${response.status}: ${body}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('No content in judge response')

  const parsed = JSON.parse(content)

  return {
    thematic_coherence: clamp(parsed.thematic_coherence ?? 0.5),
    spatial_composition: clamp(parsed.spatial_composition ?? 0.5),
    naming_quality: clamp(parsed.naming_quality ?? 0.5),
    creativity: clamp(parsed.creativity ?? 0.5),
    summary: parsed.summary ?? '',
  }
}

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v))
}
