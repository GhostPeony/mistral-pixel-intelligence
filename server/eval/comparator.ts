import type { BenchmarkResult, EvalDimension } from './types.js'

export type ComparisonVerdict = 'modelA' | 'modelB' | 'inconclusive'

export interface DimensionDelta {
  dimension: EvalDimension
  scoreA: number
  scoreB: number
  delta: number           // positive = A is better
  significant: boolean    // > 5% difference
}

export interface TaskDelta {
  taskId: string
  prompt: string
  overallA: number
  overallB: number
  delta: number
  winner: 'A' | 'B' | 'tie'
}

export interface ComparisonResult {
  modelA: string
  modelB: string
  overallDelta: number
  verdict: ComparisonVerdict
  dimensionDeltas: DimensionDelta[]
  taskDeltas: TaskDelta[]
  summary: string
}

const SIGNIFICANCE_THRESHOLD = 0.05

/**
 * A/B model comparison across all dimensions.
 * Returns per-task deltas, overall deltas, and recommendation.
 */
export function compareResults(a: BenchmarkResult, b: BenchmarkResult): ComparisonResult {
  const dimensionDeltas: DimensionDelta[] = []

  for (const dim of ['playability', 'designQuality', 'toolEfficiency'] as EvalDimension[]) {
    const scoreA = a.dimensions[dim]?.score ?? 0
    const scoreB = b.dimensions[dim]?.score ?? 0
    const delta = scoreA - scoreB

    dimensionDeltas.push({
      dimension: dim,
      scoreA,
      scoreB,
      delta,
      significant: Math.abs(delta) > SIGNIFICANCE_THRESHOLD,
    })
  }

  // Per-task comparison (match by taskId)
  const taskDeltas: TaskDelta[] = []
  for (const taskA of a.taskResults) {
    const taskB = b.taskResults.find(t => t.taskId === taskA.taskId)
    if (!taskB) continue

    const overallA = Object.values(taskA.scores).reduce((s, v) => s + v, 0) / Object.keys(taskA.scores).length
    const overallB = Object.values(taskB.scores).reduce((s, v) => s + v, 0) / Object.keys(taskB.scores).length
    const delta = overallA - overallB

    taskDeltas.push({
      taskId: taskA.taskId,
      prompt: taskA.prompt,
      overallA,
      overallB,
      delta,
      winner: Math.abs(delta) < SIGNIFICANCE_THRESHOLD ? 'tie' : delta > 0 ? 'A' : 'B',
    })
  }

  const overallDelta = a.overall - b.overall
  const significantDims = dimensionDeltas.filter(d => d.significant)
  const aWins = significantDims.filter(d => d.delta > 0).length
  const bWins = significantDims.filter(d => d.delta < 0).length

  let verdict: ComparisonVerdict
  if (Math.abs(overallDelta) < SIGNIFICANCE_THRESHOLD && aWins === bWins) {
    verdict = 'inconclusive'
  } else if (overallDelta > 0 || aWins > bWins) {
    verdict = 'modelA'
  } else {
    verdict = 'modelB'
  }

  const taskAWins = taskDeltas.filter(t => t.winner === 'A').length
  const taskBWins = taskDeltas.filter(t => t.winner === 'B').length
  const taskTies = taskDeltas.filter(t => t.winner === 'tie').length

  const summary = [
    `Overall: ${a.modelId} ${overallDelta > 0 ? '+' : ''}${(overallDelta * 100).toFixed(1)}% vs ${b.modelId}`,
    `Dimensions: ${aWins} favor A, ${bWins} favor B, ${significantDims.length - aWins - bWins} tied`,
    `Tasks: A wins ${taskAWins}, B wins ${taskBWins}, ${taskTies} tied`,
    `Verdict: ${verdict === 'inconclusive' ? 'No clear winner' : `${verdict === 'modelA' ? a.modelId : b.modelId} is better`}`,
  ].join('. ')

  return {
    modelA: a.modelId,
    modelB: b.modelId,
    overallDelta,
    verdict,
    dimensionDeltas,
    taskDeltas,
    summary,
  }
}
