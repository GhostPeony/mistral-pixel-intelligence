export interface TraceContext {
  model: string
  modelId: string               // specific model ID used (e.g., "agent:mistral-large-latest" or fine-tuned ID)
  sessionId: string
  timestamp: string
  canvasSize: { width: number; height: number }
  routingDecision?: {
    selectedModel: 'teacher' | 'student'
    strategyUsed: string
    confidence: number
    taskComplexity: number
  }
  responseTimeMs?: number          // How long the AI took to generate
}

export interface DimensionScores {
  playability: number
  designQuality: number
  toolEfficiency: number
}

/**
 * Cognitive data captured from AI reasoning during generation.
 * Aligned with GhostGym's CognitiveSchema (bashgym/trace_capture/schema.py).
 */
export interface CognitiveData {
  thinking?: string           // Extended reasoning / chain-of-thought
  plan?: string               // Explicit planning before tool calls
  reflection?: string         // Post-action reflection on output quality
  decisionRationale?: string  // Why specific tool calls were chosen
  confidence?: number         // 0.0-1.0 self-assessed confidence
}

export interface CorrectionTrace {
  type: 'correction'
  prompt: string
  rejected: {
    entities: any[]          // Serialized world state (AI version)
    toolCalls: any[]         // Original Mistral tool calls
    cognitive?: CognitiveData // AI's reasoning during rejected generation
  }
  chosen: {
    entities: any[]          // Serialized world state (player-approved)
    toolCalls: any[]         // Final tool calls (reconstructed from diff)
    cognitive?: CognitiveData // AI's reasoning during correction rounds
  }
  feedback: string           // Auto-generated diff summary
  critiques: string[]        // Player's critique messages
  attempts: number
  cognitive?: CognitiveData  // Top-level cognitive summary
  dimensions?: DimensionScores
  context: TraceContext
}

export interface SuccessTrace {
  type: 'success'
  prompt: string
  output: {
    entities: any[]
    toolCalls: any[]
    cognitive?: CognitiveData // AI's reasoning during generation
  }
  score?: number             // Computed server-side at ingestion
  cognitive?: CognitiveData  // Top-level cognitive summary
  dimensions?: DimensionScores
  context: TraceContext
}

export type Trace = CorrectionTrace | SuccessTrace
