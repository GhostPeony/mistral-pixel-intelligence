// All config is enum-selectable, no free-text config fields

export type EvalDimension = 'playability' | 'designQuality' | 'toolEfficiency'
export type TaskTier = 'simple' | 'medium' | 'complex'
export type JudgeModel = 'mistral-large-latest' | 'mistral-medium-latest'

export interface EvalConfig {
  dimensions: EvalDimension[]        // checkboxes, all on by default
  runsPerTask: 1 | 3 | 5            // selector, default 3
  judgeModel: JudgeModel             // dropdown
  taskTiers: TaskTier[]              // checkboxes, all on by default
}

export interface DimensionScore {
  dimension: EvalDimension
  score: number                      // 0-1
  breakdown: Record<string, number>  // sub-metrics
  details: string[]                  // human-readable findings
}

export interface BenchmarkResult {
  id: string
  modelId: string
  timestamp: string
  config: EvalConfig
  overall: number
  dimensions: Record<EvalDimension, DimensionScore>
  taskResults: TaskResult[]
}

export interface TaskResult {
  taskId: string
  prompt: string
  tier: TaskTier
  scores: Record<EvalDimension, number>
  toolCalls: ToolCallRecord[]
  entityCount: number
  worldSnapshot: string  // serialized World JSON
}

export interface ToolCallRecord {
  name: string
  arguments: Record<string, unknown>
  result: string
  error: boolean
}

export interface EvalTask {
  id: string
  prompt: string
  tier: TaskTier
  expectedTraits: string[]  // what a good response should exhibit
}

export const DEFAULT_EVAL_CONFIG: EvalConfig = {
  dimensions: ['playability', 'designQuality', 'toolEfficiency'],
  runsPerTask: 3,
  judgeModel: 'mistral-large-latest',
  taskTiers: ['simple', 'medium', 'complex'],
}
