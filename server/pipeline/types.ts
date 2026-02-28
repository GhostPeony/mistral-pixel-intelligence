export interface DpoSeed {
  prompt: string
  chosen: string    // JSON string of tool calls
  rejected: string  // JSON string of tool calls
  feedback: string
}

export interface SftSeed {
  prompt: string
  completion: string  // JSON string of tool calls
}

export interface QualityScore {
  overall: number           // 0.0 - 1.0
  successRate: number       // 30% weight
  verification: number      // 25% weight
  complexity: number        // 15% weight
  toolDiversity: number     // 10% weight
  efficiency: number        // 10% weight
  length: number            // 10% weight
}

export type Tier = 'gold' | 'silver' | 'bronze' | 'failed'
