export interface TraceContext {
  model: string
  sessionId: string
  timestamp: string
  canvasSize: { width: number; height: number }
}

export interface CorrectionTrace {
  type: 'correction'
  prompt: string
  rejected: {
    entities: any[]          // Serialized world state (AI version)
    toolCalls: any[]         // Original Mistral tool calls
  }
  chosen: {
    entities: any[]          // Serialized world state (player-approved)
    toolCalls: any[]         // Final tool calls (reconstructed from diff)
  }
  feedback: string           // Auto-generated diff summary
  critiques: string[]        // Player's critique messages
  attempts: number
  context: TraceContext
}

export interface SuccessTrace {
  type: 'success'
  prompt: string
  output: {
    entities: any[]
    toolCalls: any[]
  }
  score: number
  context: TraceContext
}

export type Trace = CorrectionTrace | SuccessTrace
