/**
 * Threshold Monitor — tracks watermarks and triggers pipeline stages.
 * Ported from ghostwork/bashgym/pipeline/threshold_monitor.py
 *
 * Uses watermarks (high-water marks) to prevent duplicate triggering.
 * Counts accumulate; a stage only triggers when the count exceeds
 * the watermark + threshold.
 */

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { ThresholdConfig } from './types.js'

interface Watermarks {
  amplify_at: number
  train_at: number
  last_amplify: string | null
  last_train: string | null
  daily_train_count: number
  daily_train_date: string
}

const DEFAULT_WATERMARKS: Watermarks = {
  amplify_at: 0,
  train_at: 0,
  last_amplify: null,
  last_train: null,
  daily_train_count: 0,
  daily_train_date: '',
}

export const DEFAULT_THRESHOLD_CONFIG: ThresholdConfig = {
  amplifyAfterGoldTraces: 20,
  trainAfterExamples: 100,
  evalAfterTraining: true,
  pipelineMode: 'manual',
  cooldownMinutes: 60,
  maxDailyTrainingRuns: 2,
}

export class ThresholdMonitor {
  private config: ThresholdConfig
  private watermarks: Watermarks
  private watermarksPath: string

  constructor(dataDir: string, config?: Partial<ThresholdConfig>) {
    this.config = { ...DEFAULT_THRESHOLD_CONFIG, ...config }
    this.watermarksPath = join(dataDir, 'watermarks.json')
    this.watermarks = this.loadWatermarks()
  }

  /**
   * Check if we have enough gold traces to trigger amplification.
   */
  shouldAmplify(goldCount: number): boolean {
    if (this.config.pipelineMode === 'manual') return false
    return goldCount >= this.watermarks.amplify_at + this.config.amplifyAfterGoldTraces
  }

  /**
   * Mark amplification as triggered, update watermark.
   */
  markAmplifyTriggered(goldCount: number): void {
    this.watermarks.amplify_at = goldCount
    this.watermarks.last_amplify = new Date().toISOString()
    this.saveWatermarks()
  }

  /**
   * Check if we have enough examples to trigger training.
   */
  shouldTrain(exampleCount: number): boolean {
    if (this.config.pipelineMode === 'manual') return false
    if (!this.checkCooldown()) return false
    if (!this.checkDailyLimit()) return false
    return exampleCount >= this.watermarks.train_at + this.config.trainAfterExamples
  }

  /**
   * Mark training as triggered, update watermark.
   */
  markTrainTriggered(exampleCount: number): void {
    this.watermarks.train_at = exampleCount
    this.watermarks.last_train = new Date().toISOString()

    const today = new Date().toISOString().split('T')[0]
    if (this.watermarks.daily_train_date === today) {
      this.watermarks.daily_train_count++
    } else {
      this.watermarks.daily_train_date = today
      this.watermarks.daily_train_count = 1
    }

    this.saveWatermarks()
  }

  /**
   * Whether to run eval after training completes.
   */
  shouldEvalAfterTraining(): boolean {
    return this.config.evalAfterTraining
  }

  /**
   * Check cooldown period since last training.
   */
  private checkCooldown(): boolean {
    if (!this.watermarks.last_train) return true
    const lastTrain = new Date(this.watermarks.last_train).getTime()
    const cooldownMs = this.config.cooldownMinutes * 60 * 1000
    return Date.now() - lastTrain >= cooldownMs
  }

  /**
   * Check daily training run limit.
   */
  private checkDailyLimit(): boolean {
    const today = new Date().toISOString().split('T')[0]
    if (this.watermarks.daily_train_date !== today) return true
    return this.watermarks.daily_train_count < this.config.maxDailyTrainingRuns
  }

  updateConfig(partial: Partial<ThresholdConfig>): void {
    Object.assign(this.config, partial)
  }

  getConfig(): ThresholdConfig {
    return { ...this.config }
  }

  getWatermarks(): Watermarks {
    return { ...this.watermarks }
  }

  private loadWatermarks(): Watermarks {
    if (existsSync(this.watermarksPath)) {
      try {
        return { ...DEFAULT_WATERMARKS, ...JSON.parse(readFileSync(this.watermarksPath, 'utf-8')) }
      } catch {
        return { ...DEFAULT_WATERMARKS }
      }
    }
    return { ...DEFAULT_WATERMARKS }
  }

  private saveWatermarks(): void {
    writeFileSync(this.watermarksPath, JSON.stringify(this.watermarks, null, 2))
  }
}
