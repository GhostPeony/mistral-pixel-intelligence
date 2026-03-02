/**
 * Quality Gate — 3-dimension quality classification.
 * Uses the dimension scorers from the eval suite to classify traces.
 *
 * Ported from ghostwork/bashgym/pipeline/quality_gate.py
 */

import type { EvalDimension } from '../eval/types.js'

export type QualityTier = 'gold' | 'silver' | 'bronze' | 'failed'

export interface TierThresholds {
  gold: number       // default 0.75
  silver: number     // default 0.55
  bronze: number     // default 0.40
}

export interface GateResult {
  tier: QualityTier
  scores: Record<EvalDimension, number>
  overall: number
  modelId: string
}

export interface QualityGateConfig {
  thresholds: TierThresholds
  weights: {
    playability: number
    designQuality: number
    toolEfficiency: number
  }
  maxAttempts: number  // gold requires <= this many attempts
}

export const DEFAULT_GATE_CONFIG: QualityGateConfig = {
  thresholds: {
    gold: 0.75,
    silver: 0.55,
    bronze: 0.40,
  },
  weights: {
    playability: 0.40,
    designQuality: 0.35,
    toolEfficiency: 0.25,
  },
  maxAttempts: 2,
}

export class QualityGate {
  constructor(private config: QualityGateConfig = DEFAULT_GATE_CONFIG) {}

  /**
   * Classify a set of dimension scores into a quality tier.
   */
  classify(
    scores: Record<EvalDimension, number>,
    modelId: string,
    attempts?: number,
  ): GateResult {
    const overall =
      (scores.playability ?? 0) * this.config.weights.playability +
      (scores.designQuality ?? 0) * this.config.weights.designQuality +
      (scores.toolEfficiency ?? 0) * this.config.weights.toolEfficiency

    let tier: QualityTier
    if (overall >= this.config.thresholds.gold && (attempts == null || attempts <= this.config.maxAttempts)) {
      tier = 'gold'
    } else if (overall >= this.config.thresholds.silver) {
      tier = 'silver'
    } else if (overall >= this.config.thresholds.bronze) {
      tier = 'bronze'
    } else {
      tier = 'failed'
    }

    return { tier, scores, overall, modelId }
  }

  /**
   * Quick classification from a pre-computed overall score.
   * Used for backward compatibility with the existing scorer.
   */
  classifyFromScore(score: number, modelId: string, attempts?: number): GateResult {
    return this.classify(
      { playability: score, designQuality: score, toolEfficiency: score },
      modelId,
      attempts,
    )
  }

  updateConfig(partial: Partial<QualityGateConfig>): void {
    if (partial.thresholds) Object.assign(this.config.thresholds, partial.thresholds)
    if (partial.weights) Object.assign(this.config.weights, partial.weights)
    if (partial.maxAttempts !== undefined) this.config.maxAttempts = partial.maxAttempts
  }

  getConfig(): QualityGateConfig {
    return JSON.parse(JSON.stringify(this.config))
  }
}
