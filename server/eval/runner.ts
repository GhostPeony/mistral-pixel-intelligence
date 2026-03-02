import type {
  EvalConfig,
  EvalDimension,
  BenchmarkResult,
  TaskResult,
  ToolCallRecord,
  DimensionScore,
} from './types.js'
import { DEFAULT_EVAL_CONFIG } from './types.js'
import { EVAL_TASKS, getTasksByTier } from './prompts/eval-tasks.js'
import { scorePlayability } from './dimensions/playability.js'
import { scoreToolEfficiency } from './dimensions/tool-efficiency.js'
import { scoreDesignQuality } from './dimensions/design-quality.js'
import { replayToolCalls } from './replay.js'
import { randomUUID } from 'crypto'

export type RunStatus = 'idle' | 'running' | 'completed' | 'failed'

interface RunProgress {
  status: RunStatus
  currentTask: string
  currentRun: number
  totalTasks: number
  completedTasks: number
  error?: string
}

/**
 * Benchmark runner — for each model x task x run:
 * 1. Send prompt to model via API
 * 2. Collect tool calls from response
 * 3. Replay tool calls against fresh World
 * 4. Score each dimension independently
 * 5. Aggregate across runs (mean + stddev)
 */
export class BenchmarkRunner {
  private progress: RunProgress = {
    status: 'idle',
    currentTask: '',
    currentRun: 0,
    totalTasks: 0,
    completedTasks: 0,
  }

  getProgress(): RunProgress {
    return { ...this.progress }
  }

  async run(
    modelId: string,
    config: EvalConfig = DEFAULT_EVAL_CONFIG,
  ): Promise<BenchmarkResult> {
    const benchmarkId = randomUUID()
    const tasks = this.selectTasks(config)

    this.progress = {
      status: 'running',
      currentTask: '',
      currentRun: 0,
      totalTasks: tasks.length,
      completedTasks: 0,
    }

    const taskResults: TaskResult[] = []

    try {
      for (const task of tasks) {
        this.progress.currentTask = task.id

        const runs: TaskResult[] = []
        for (let r = 0; r < config.runsPerTask; r++) {
          this.progress.currentRun = r + 1

          const result = await this.runSingleTask(task.id, task.prompt, task.tier, modelId, config)
          runs.push(result)
        }

        // Average across runs
        const averaged = this.averageTaskResults(runs, task.id, task.prompt, task.tier)
        taskResults.push(averaged)
        this.progress.completedTasks++
      }

      // Aggregate dimension scores
      const dimensions = this.aggregateDimensions(taskResults, config.dimensions)
      const overall = Object.values(dimensions).reduce((sum, d) => sum + d.score, 0) / Object.keys(dimensions).length

      const result: BenchmarkResult = {
        id: benchmarkId,
        modelId,
        timestamp: new Date().toISOString(),
        config,
        overall,
        dimensions,
        taskResults,
      }

      this.progress.status = 'completed'
      return result
    } catch (err: any) {
      this.progress.status = 'failed'
      this.progress.error = err.message
      throw err
    }
  }

  /**
   * Run a single task: send prompt to model, get tool calls, replay, score.
   */
  private async runSingleTask(
    taskId: string,
    prompt: string,
    tier: string,
    modelId: string,
    config: EvalConfig,
  ): Promise<TaskResult> {
    // Call the model API
    const toolCalls = await this.callModel(prompt, modelId)

    // Replay tool calls against fresh world
    const replay = await replayToolCalls(
      toolCalls.map(tc => ({
        name: tc.name,
        arguments: tc.arguments,
      })),
    )

    // Score each dimension
    const scores: Record<EvalDimension, number> = {
      playability: 0,
      designQuality: 0,
      toolEfficiency: 0,
    }

    if (config.dimensions.includes('playability')) {
      const s = scorePlayability(replay.entities)
      scores.playability = s.score
    }

    if (config.dimensions.includes('toolEfficiency')) {
      const s = scoreToolEfficiency(replay.toolResults, replay.entityCount)
      scores.toolEfficiency = s.score
    }

    if (config.dimensions.includes('designQuality')) {
      const s = await scoreDesignQuality(replay.entities, prompt, config.judgeModel)
      scores.designQuality = s.score
    }

    return {
      taskId,
      prompt,
      tier: tier as TaskResult['tier'],
      scores,
      toolCalls: replay.toolResults,
      entityCount: replay.entityCount,
      worldSnapshot: replay.worldSnapshot,
    }
  }

  /**
   * Call the Mistral model and extract tool calls from the response.
   */
  private async callModel(
    prompt: string,
    modelId: string,
  ): Promise<ToolCallRecord[]> {
    const apiKey = process.env.MISTRAL_API_KEY
    if (!apiKey) throw new Error('MISTRAL_API_KEY not set')

    // Import tool definitions dynamically
    const { MISTRAL_TOOLS } = await import('../../game/src/ai/tool-definitions.js')

    const systemPrompt = `You are an AI level designer for a pixel-art platformer. The player describes what they want and you use tools to create game entities. Be creative and thorough.`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ]

    const allToolCalls: ToolCallRecord[] = []
    let continueLoop = true
    let currentMessages = [...messages]

    while (continueLoop) {
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages: currentMessages,
          tools: MISTRAL_TOOLS,
          tool_choice: 'auto',
        }),
      })

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`Model API error ${response.status}: ${body}`)
      }

      const data = await response.json()
      const choice = data.choices?.[0]

      if (!choice?.message?.tool_calls?.length) {
        continueLoop = false
        break
      }

      // Record tool calls
      const assistantMsg = { role: 'assistant' as const, content: choice.message.content ?? '', tool_calls: choice.message.tool_calls }
      currentMessages.push(assistantMsg)

      for (const tc of choice.message.tool_calls) {
        const args = typeof tc.function.arguments === 'string'
          ? JSON.parse(tc.function.arguments)
          : tc.function.arguments

        allToolCalls.push({
          name: tc.function.name,
          arguments: args,
          result: '',  // filled by replay
          error: false,
        })

        // Add tool result message for next iteration
        currentMessages.push({
          role: 'tool' as any,
          content: JSON.stringify({ result: 'ok' }),
          tool_call_id: tc.id,
        } as any)
      }

      // Check if we should continue
      if (choice.finish_reason === 'stop' || allToolCalls.length > 50) {
        continueLoop = false
      }
    }

    return allToolCalls
  }

  private selectTasks(config: EvalConfig) {
    return EVAL_TASKS.filter(t => config.taskTiers.includes(t.tier))
  }

  private averageTaskResults(
    runs: TaskResult[],
    taskId: string,
    prompt: string,
    tier: TaskResult['tier'],
  ): TaskResult {
    const avgScores: Record<EvalDimension, number> = {
      playability: 0,
      designQuality: 0,
      toolEfficiency: 0,
    }

    for (const dim of ['playability', 'designQuality', 'toolEfficiency'] as EvalDimension[]) {
      const values = runs.map(r => r.scores[dim])
      avgScores[dim] = values.reduce((a, b) => a + b, 0) / values.length
    }

    // Use the last run's tool calls and snapshot as representative
    const last = runs[runs.length - 1]
    return {
      taskId,
      prompt,
      tier,
      scores: avgScores,
      toolCalls: last.toolCalls,
      entityCount: Math.round(runs.reduce((s, r) => s + r.entityCount, 0) / runs.length),
      worldSnapshot: last.worldSnapshot,
    }
  }

  private aggregateDimensions(
    results: TaskResult[],
    dimensions: EvalDimension[],
  ): Record<EvalDimension, DimensionScore> {
    const output: Record<string, DimensionScore> = {}

    for (const dim of dimensions) {
      const scores = results.map(r => r.scores[dim])
      const mean = scores.reduce((a, b) => a + b, 0) / scores.length

      output[dim] = {
        dimension: dim,
        score: mean,
        breakdown: { mean, min: Math.min(...scores), max: Math.max(...scores) },
        details: [`Averaged over ${results.length} tasks`],
      }
    }

    // Fill missing dimensions
    for (const dim of ['playability', 'designQuality', 'toolEfficiency'] as EvalDimension[]) {
      if (!output[dim]) {
        output[dim] = { dimension: dim, score: 0, breakdown: {}, details: ['Not evaluated'] }
      }
    }

    return output as Record<EvalDimension, DimensionScore>
  }
}
