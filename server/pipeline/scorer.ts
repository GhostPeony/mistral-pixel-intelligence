import type { QualityScore, Tier } from './types.js'

const WEIGHTS = {
  successRate: 0.30,
  verification: 0.25,
  complexity: 0.15,
  toolDiversity: 0.10,
  efficiency: 0.10,
  length: 0.10,
}

export function scoreTrace(trace: any): QualityScore {
  const successRate = computeSuccessRate(trace)
  const verification = computeVerification(trace)
  const complexity = computeComplexity(trace)
  const toolDiversity = computeToolDiversity(trace)
  const efficiency = computeEfficiency(trace)
  const length = computeLength(trace)

  const overall =
    successRate * WEIGHTS.successRate +
    verification * WEIGHTS.verification +
    complexity * WEIGHTS.complexity +
    toolDiversity * WEIGHTS.toolDiversity +
    efficiency * WEIGHTS.efficiency +
    length * WEIGHTS.length

  return { overall, successRate, verification, complexity, toolDiversity, efficiency, length }
}

export function classifyTier(score: number, attempts?: number): Tier {
  if (score >= 0.7 && (attempts == null || attempts <= 2)) return 'gold'
  if (score >= 0.5) return 'silver'
  if (score >= 0.3) return 'bronze'
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
