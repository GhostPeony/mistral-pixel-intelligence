/**
 * Pipeline Orchestrator — connects all pipeline stages in an automated loop.
 * Ported from ghostwork/bashgym/pipeline/orchestrator.py
 *
 * Full loop:
 *   Trace arrives → Score (3 dimensions) → Quality gate → Route to tier
 *   → Threshold check: enough gold? → Build seeds → Amplify
 *   → Train → Auto-benchmark → Compare with previous → Update router if improved
 */

import { readFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { scoreTrace, classifyTier } from './scorer.js'
import { QualityGate } from './quality-gate.js'
import { ThresholdMonitor } from './threshold-monitor.js'
import { DatasetBuilder } from './dataset-builder.js'
import { DataDesignerBridge } from './data-designer.js'
import { Trainer } from './trainer.js'
import { Workspace } from './workspace.js'
import type { ThresholdConfig, PipelineMode } from './types.js'

export type OrchestratorEvent =
  | 'trace:scored'
  | 'trace:classified'
  | 'threshold:amplify'
  | 'threshold:train'
  | 'amplify:started'
  | 'amplify:completed'
  | 'train:started'
  | 'train:completed'
  | 'eval:started'
  | 'eval:completed'
  | 'router:updated'
  | 'error'

export type EventHandler = (event: OrchestratorEvent, payload: any) => void

export type OrchestratorStatus = 'idle' | 'running' | 'amplifying' | 'training' | 'evaluating' | 'stopped'

interface OrchestratorState {
  status: OrchestratorStatus
  goldCount: number
  silverCount: number
  bronzeCount: number
  failedCount: number
  totalTraces: number
  lastActivity: string | null
  currentStep: string | null
  error: string | null
}

export class Orchestrator {
  private workspace: Workspace
  private gate: QualityGate
  private monitor: ThresholdMonitor
  private designer: DataDesignerBridge
  private trainer: Trainer
  private handlers: EventHandler[] = []
  private state: OrchestratorState = {
    status: 'idle',
    goldCount: 0,
    silverCount: 0,
    bronzeCount: 0,
    failedCount: 0,
    totalTraces: 0,
    lastActivity: null,
    currentStep: null,
    error: null,
  }
  private intervalId: ReturnType<typeof setInterval> | null = null

  constructor(dataDir?: string) {
    this.workspace = new Workspace(dataDir)
    this.workspace.init()
    this.gate = new QualityGate()
    this.monitor = new ThresholdMonitor(this.workspace.dataDir)
    this.designer = new DataDesignerBridge(this.workspace.dataDir)
    this.trainer = new Trainer(this.workspace.dataDir)
  }

  /**
   * Start the orchestrator loop.
   * In full_auto mode, periodically checks for new traces and processes them.
   * In semi_auto mode, checks but requires manual trigger for training.
   */
  start(mode: PipelineMode = 'semi_auto'): void {
    if (this.state.status === 'running') return

    this.monitor.updateConfig({ pipelineMode: mode })
    this.state.status = 'running'
    this.state.error = null

    // Poll every 30 seconds for new traces
    this.intervalId = setInterval(() => this.checkAndProcess(), 30_000)

    // Do an initial check
    this.checkAndProcess()
  }

  /**
   * Stop the orchestrator loop.
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.state.status = 'stopped'
  }

  /**
   * Run a single named step manually.
   */
  async runStep(step: 'score' | 'amplify' | 'train' | 'eval'): Promise<any> {
    switch (step) {
      case 'score':
        return this.scoreAllTraces()
      case 'amplify':
        return this.runAmplification()
      case 'train':
        return this.runTraining()
      case 'eval':
        return this.runEvaluation()
    }
  }

  /**
   * Register an event handler.
   */
  onEvent(handler: EventHandler): void {
    this.handlers.push(handler)
  }

  getStatus(): OrchestratorState {
    return { ...this.state }
  }

  // --- Internal Pipeline ---

  private async checkAndProcess(): Promise<void> {
    try {
      // 1. Score all traces and update counts
      const counts = this.scoreAllTraces()
      this.state.goldCount = counts.gold
      this.state.silverCount = counts.silver
      this.state.bronzeCount = counts.bronze
      this.state.failedCount = counts.failed
      this.state.totalTraces = counts.total
      this.state.lastActivity = new Date().toISOString()

      // 2. Check amplification threshold
      if (this.monitor.shouldAmplify(counts.gold)) {
        this.emit('threshold:amplify', { goldCount: counts.gold })
        this.state.currentStep = 'amplifying'
        this.state.status = 'amplifying'

        await this.runAmplification()
        this.monitor.markAmplifyTriggered(counts.gold)
      }

      // 3. Check training threshold
      const exampleCount = this.countExamples()
      if (this.monitor.shouldTrain(exampleCount)) {
        this.emit('threshold:train', { exampleCount })
        this.state.currentStep = 'training'
        this.state.status = 'training'

        await this.runTraining()
        this.monitor.markTrainTriggered(exampleCount)

        // 4. Auto-eval after training
        if (this.monitor.shouldEvalAfterTraining()) {
          this.state.currentStep = 'evaluating'
          this.state.status = 'evaluating'
          await this.runEvaluation()
        }
      }

      this.state.status = 'running'
      this.state.currentStep = null
    } catch (err: any) {
      this.state.error = err.message
      this.emit('error', { error: err.message })
    }
  }

  private scoreAllTraces(): { gold: number; silver: number; bronze: number; failed: number; total: number } {
    const tracesFile = join(this.workspace.dataDir, 'traces.jsonl')
    const counts = { gold: 0, silver: 0, bronze: 0, failed: 0, total: 0 }

    if (!existsSync(tracesFile)) return counts

    const lines = readFileSync(tracesFile, 'utf-8').trim().split('\n').filter(Boolean)
    counts.total = lines.length

    for (const line of lines) {
      try {
        const trace = JSON.parse(line)
        const score = scoreTrace(trace)
        const tier = classifyTier(score.overall, trace.attempts)
        counts[tier]++
        this.emit('trace:scored', { tier, score: score.overall })
      } catch {
        counts.failed++
      }
    }

    return counts
  }

  private latestSeedDir: string | null = null

  private async runAmplification(): Promise<any> {
    this.emit('amplify:started', {})

    const builder = new DatasetBuilder(this.workspace.dataDir)
    const dir = builder.buildAndWrite({ minTier: 'gold' })
    this.latestSeedDir = dir

    const prereqs = await this.designer.checkPrerequisites()
    if (!prereqs.available) {
      this.emit('amplify:completed', { skipped: true, reason: 'No amplification tool available' })
      return { skipped: true }
    }

    const amplifiedDir = dir + '/amplified'
    const result = await this.designer.amplify({
      seedDir: dir,
      outputDir: amplifiedDir,
    })

    // Amplified data is in the same format as seeds — update latestSeedDir
    // so training picks up the amplified data
    if (result.count > 0) {
      this.latestSeedDir = amplifiedDir
    }

    this.emit('amplify:completed', result)
    return result
  }

  private async runTraining(): Promise<any> {
    this.emit('train:started', {})

    // Use amplified directory if available, otherwise build fresh seeds
    let dir = this.latestSeedDir
    if (!dir) {
      const builder = new DatasetBuilder(this.workspace.dataDir)
      dir = builder.buildAndWrite({ minTier: 'silver' })
    }

    try {
      const result = await this.trainer.trainCloud(dir)
      this.emit('train:completed', { result })
      return result
    } catch (err: any) {
      // Fallback to local training
      try {
        const result = await this.trainer.trainLocal(dir)
        this.emit('train:completed', { result, local: true })
        return result
      } catch (localErr: any) {
        this.emit('error', { step: 'train', error: localErr.message })
        throw localErr
      }
    }
  }

  private async runEvaluation(): Promise<any> {
    this.emit('eval:started', {})

    // Dynamic import to avoid circular deps
    const { BenchmarkRunner } = await import('../eval/runner.js')
    const runner = new BenchmarkRunner()

    try {
      const result = await runner.run('mistral-large-latest')
      this.emit('eval:completed', { overall: result.overall, id: result.id })
      return result
    } catch (err: any) {
      this.emit('error', { step: 'eval', error: err.message })
      throw err
    }
  }

  private countExamples(): number {
    const datasetsDir = join(this.workspace.dataDir, 'datasets')
    if (!existsSync(datasetsDir)) return 0

    // Count total examples across all seed files
    let count = 0
    try {
      const entries = readdirSync(datasetsDir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const metaPath = join(datasetsDir, entry.name, 'metadata.json')
        if (existsSync(metaPath)) {
          const meta = JSON.parse(readFileSync(metaPath, 'utf-8'))
          count += (meta.dpoCount ?? 0) + (meta.sftCount ?? 0)
        }
      }
    } catch {
      // directory listing failed
    }
    return count
  }

  private emit(event: OrchestratorEvent, payload: any): void {
    for (const handler of this.handlers) {
      try {
        handler(event, payload)
      } catch {
        // handler errors shouldn't break the pipeline
      }
    }
  }

  updateThresholdConfig(partial: Partial<ThresholdConfig>): void {
    this.monitor.updateConfig(partial)
  }

  getThresholdConfig(): ThresholdConfig {
    return this.monitor.getConfig()
  }
}
