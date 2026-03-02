import type { QualityScore, Tier, DimensionScores } from './types.js'
import { scorePlayability } from '../eval/dimensions/playability.js'
import { scoreToolEfficiency } from '../eval/dimensions/tool-efficiency.js'

/**
 * Weights aligned with GhostGym's quality_calculator.py
 * Cognitive quality added as a first-class scoring dimension.
 */
const WEIGHTS = {
  successRate: 0.25,
  verification: 0.20,
  cognitiveQuality: 0.15,
  complexity: 0.15,
  toolDiversity: 0.10,
  efficiency: 0.10,
  length: 0.05,
}

export function scoreTrace(trace: any): QualityScore {
  const successRate = computeSuccessRate(trace)
  const verification = computeVerification(trace)
  const cognitiveQuality = computeCognitiveQuality(trace)
  const complexity = computeComplexity(trace)
  const toolDiversity = computeToolDiversity(trace)
  const efficiency = computeEfficiency(trace)
  const length = computeLength(trace)

  const overall =
    successRate * WEIGHTS.successRate +
    verification * WEIGHTS.verification +
    cognitiveQuality * WEIGHTS.cognitiveQuality +
    complexity * WEIGHTS.complexity +
    toolDiversity * WEIGHTS.toolDiversity +
    efficiency * WEIGHTS.efficiency +
    length * WEIGHTS.length

  // Compute dimension scores when entity data is available
  const dimensions = computeDimensionScores(trace)

  return { overall, successRate, verification, cognitiveQuality, complexity, toolDiversity, efficiency, length, dimensions }
}

/**
 * Compute 3-dimension scores from a trace's entity and tool call data.
 * Returns undefined if the trace doesn't have sufficient data.
 */
function computeDimensionScores(trace: any): DimensionScores | undefined {
  const entities = trace.type === 'success'
    ? trace.output?.entities ?? []
    : trace.chosen?.entities ?? []

  const toolCalls = trace.type === 'success'
    ? trace.output?.toolCalls ?? []
    : trace.chosen?.toolCalls ?? []

  if (entities.length === 0 && toolCalls.length === 0) return undefined

  // Playability (automated) — guard against malformed entities
  let playabilityResult: { score: number }
  try {
    playabilityResult = scorePlayability(entities)
  } catch {
    playabilityResult = { score: 0 }
  }

  // Tool efficiency (automated)
  const toolCallRecords = toolCalls.map((tc: any) => ({
    name: tc.name ?? tc.function?.name ?? '',
    arguments: typeof tc.arguments === 'object' ? tc.arguments :
      typeof tc.function?.arguments === 'string' ? JSON.parse(tc.function.arguments) : {},
    result: '',
    error: false,
  }))
  const toolEffResult = scoreToolEfficiency(toolCallRecords, entities.length)

  // Design quality is not computed here (requires async LLM judge)
  // Use a heuristic proxy based on entity variety and naming
  const spriteTypes = new Set(entities.map((e: any) => e.components?.sprite?.assetId).filter(Boolean))
  const varietyScore = entities.length > 0 ? Math.min(1.0, spriteTypes.size / Math.max(3, entities.length * 0.3)) : 0

  return {
    playability: playabilityResult.score,
    designQuality: varietyScore,
    toolEfficiency: toolEffResult.score,
  }
}

/**
 * Tier classification aligned with GhostGym/NeMo thresholds.
 * Gold: score >= 0.75, attempts <= 2
 * Silver: score >= 0.55
 * Bronze: score >= 0.40
 * Failed: below 0.40
 */
export function classifyTier(score: number, attempts?: number): Tier {
  if (score >= 0.75 && (attempts == null || attempts <= 2)) return 'gold'
  if (score >= 0.55) return 'silver'
  if (score >= 0.40) return 'bronze'
  return 'failed'
}

function computeSuccessRate(trace: any): number {
  if (trace.type === 'success') return 1.0
  const original = trace.rejected?.toolCalls?.length ?? 0
  const final = trace.chosen?.toolCalls?.length ?? 0
  if (original === 0) return 0
  return Math.min(1.0, final / Math.max(original, 1))
}

function computeVerification(trace: any): number {
  return trace.type === 'success' ? 1.0 : 0.5
}

/**
 * Cognitive quality — measures the presence and quality of reasoning data
 * attached to the trace. Inspired by AgentTrace's insight that cognitive
 * quality matters independently of outcome quality.
 *
 * Components (matching GhostGym quality_calculator.py):
 *   - Thinking presence (30%): fraction of steps with thinking content
 *   - Plan coherence (25%): explicit plans present
 *   - Error reflection (25%): reflection after failures
 *   - Reasoning-to-action alignment (20%): cognitive data attached to actions
 */
function computeCognitiveQuality(trace: any): number {
  const cognitive = trace.cognitive ?? trace.output?.cognitive ?? trace.chosen?.cognitive

  // No cognitive data captured — return baseline
  if (!cognitive) {
    // Give partial credit if critiques exist (player-driven reflection)
    if (trace.critiques && trace.critiques.length > 0) {
      return Math.min(0.4, trace.critiques.length * 0.15)
    }
    return 0.1 // minimal baseline for any recorded trace
  }

  let thinkingScore = 0
  let planScore = 0
  let reflectionScore = 0
  let alignmentScore = 0

  // Thinking presence: is there substantive reasoning content?
  const thinking = cognitive.thinking ?? ''
  if (thinking.length > 10) {
    thinkingScore = Math.min(1.0, thinking.length / 200)
  }

  // Plan coherence: explicit planning present
  const plan = cognitive.plan ?? ''
  if (plan.length > 10) {
    planScore = Math.min(1.0, 0.5 + plan.length / 400)
  }

  // Error reflection: reflection after correction attempts
  const reflection = cognitive.reflection ?? ''
  if (reflection.length > 10) {
    reflectionScore = Math.min(1.0, 0.5 + reflection.length / 300)
  }
  // Player critiques also count as reflection signal
  if (trace.critiques && trace.critiques.length > 0) {
    reflectionScore = Math.max(reflectionScore, Math.min(1.0, trace.critiques.length * 0.3))
  }

  // Reasoning-to-action alignment: cognitive data is present alongside actions
  const hasToolCalls = (trace.output?.toolCalls ?? trace.chosen?.toolCalls ?? []).length > 0
  if (hasToolCalls && (thinking.length > 10 || plan.length > 10)) {
    alignmentScore = 0.8
  }
  if (cognitive.decisionRationale && cognitive.decisionRationale.length > 10) {
    alignmentScore = Math.max(alignmentScore, 0.9)
  }

  return (
    thinkingScore * 0.30 +
    planScore * 0.25 +
    reflectionScore * 0.25 +
    alignmentScore * 0.20
  )
}

function computeComplexity(trace: any): number {
  const entities = trace.type === 'success'
    ? trace.output?.entities ?? []
    : trace.chosen?.entities ?? []
  const types = new Set(entities.map((e: any) => e.components?.sprite?.assetId))
  const hasBehaviors = entities.some((e: any) => e.components?.behavior)
  return Math.min(1.0, (types.size / 10) + (hasBehaviors ? 0.3 : 0))
}

function computeToolDiversity(trace: any): number {
  const toolCalls = trace.type === 'success'
    ? trace.output?.toolCalls ?? []
    : trace.chosen?.toolCalls ?? []
  const uniqueTools = new Set(toolCalls.map((t: any) => t.name))
  return Math.min(1.0, uniqueTools.size / 5)
}

function computeEfficiency(trace: any): number {
  if (trace.type === 'success') return 1.0
  const attempts = trace.attempts ?? 1
  return Math.max(0, 1.0 - (attempts - 1) * 0.2)
}

function computeLength(trace: any): number {
  const entities = trace.type === 'success'
    ? trace.output?.entities ?? []
    : trace.chosen?.entities ?? []
  const count = entities.length
  const ideal = 10
  const spread = 8
  return Math.exp(-Math.pow(count - ideal, 2) / (2 * spread * spread))
}
