export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content?: string
  tool_calls?: any[]
}

export interface DpoSeed {
  prompt: string
  chosen: ChatMessage[]   // Full conversation with correct tool_calls
  rejected: ChatMessage[] // Full conversation with wrong tool_calls
  feedback: string
}

export interface SftSeed {
  messages: ChatMessage[]  // Full conversation: system + user + assistant with tool_calls
}

export interface QualityScore {
  overall: number           // 0.0 - 1.0
  successRate: number       // 25% weight
  verification: number      // 20% weight
  cognitiveQuality: number  // 15% weight — thinking, planning, reflection
  complexity: number        // 15% weight
  toolDiversity: number     // 10% weight
  efficiency: number        // 10% weight
  length: number            // 5% weight
  // New: 3-dimension scores from eval suite
  dimensions?: DimensionScores
}

export interface DimensionScores {
  playability: number
  designQuality: number
  toolEfficiency: number
}

export type Tier = 'gold' | 'silver' | 'bronze' | 'failed'

// Scorer config — dimension weights are selectable
export interface ScorerConfig {
  weights: {
    playability: number      // default 0.40
    designQuality: number    // default 0.35
    toolEfficiency: number   // default 0.25
  }
}

// Training strategies
export type TrainingStrategy = 'sft' | 'dpo' | 'grpo' | 'distillation'

// Data pipeline types
export type PipelineType =
  | 'tool_use_sft'        // Success traces → SFT examples
  | 'tool_use_dpo'        // Correction traces → DPO pairs
  | 'agent_sft'           // Teacher completions for benchmark prompts
  | 'distillation'        // Teacher → student knowledge transfer
  | 'synthetic_prompts'   // Generate new prompts from sprite catalog

// Pipeline mode
export type PipelineMode = 'manual' | 'semi_auto' | 'full_auto'

// Threshold monitor config
export interface ThresholdConfig {
  amplifyAfterGoldTraces: 10 | 20 | 50 | 100
  trainAfterExamples: 50 | 100 | 200 | 500
  evalAfterTraining: boolean
  pipelineMode: PipelineMode
  cooldownMinutes: 30 | 60 | 120 | 360
  maxDailyTrainingRuns: 1 | 2 | 5 | 10
}
