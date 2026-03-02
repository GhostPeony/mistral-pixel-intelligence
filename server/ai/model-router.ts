/**
 * Model Router — routes between teacher and student models
 * with progressive handoff and performance tracking.
 *
 * Ported from ghostwork/bashgym/gym/router.py
 */

export type ModelType = 'teacher' | 'student'
export type RoutingStrategy =
  | 'teacher_only'
  | 'student_only'
  | 'confidence_based'
  | 'task_complexity'
  | 'progressive'

export interface RouterConfig {
  strategy: RoutingStrategy
  confidenceThreshold: number     // 0.0-1.0, default 0.7
  studentSampleRate: number       // 0.0-1.0, default 0.1
  maxStudentRate: number          // 0.0-1.0, default 0.9
  improvementIncrement: 0.05 | 0.10 | 0.15
  fallbackToTeacher: boolean
  teacherModel: string
  studentModel: string | null
  studentEndpoint: string         // Base URL for student model API (Mistral, HF endpoint, or local vLLM)
  studentApiKey: string | null    // API key for student endpoint (null = use MISTRAL_API_KEY)
}

export interface RoutingDecision {
  selectedModel: ModelType
  modelId: string
  strategyUsed: RoutingStrategy
  confidence: number
  taskComplexity: number
  timestamp: string
}

interface ModelMetrics {
  totalRequests: number
  successCount: number
  failureCount: number
  avgLatencyMs: number
  successRate: number
}

export const DEFAULT_ROUTER_CONFIG: RouterConfig = {
  strategy: 'teacher_only',
  confidenceThreshold: 0.7,
  studentSampleRate: 0.1,
  maxStudentRate: 0.9,
  improvementIncrement: 0.05,
  fallbackToTeacher: true,
  teacherModel: 'mistral-large-latest',
  studentModel: null,
  studentEndpoint: 'https://api.mistral.ai/v1/chat/completions',
  studentApiKey: null,
}

export class ModelRouter {
  private config: RouterConfig
  private metrics: Record<ModelType, ModelMetrics> = {
    teacher: { totalRequests: 0, successCount: 0, failureCount: 0, avgLatencyMs: 0, successRate: 1.0 },
    student: { totalRequests: 0, successCount: 0, failureCount: 0, avgLatencyMs: 0, successRate: 0 },
  }
  private history: RoutingDecision[] = []
  private currentStudentRate: number

  constructor(config: Partial<RouterConfig> = {}) {
    this.config = { ...DEFAULT_ROUTER_CONFIG, ...config }
    this.currentStudentRate = this.config.studentSampleRate
  }

  /**
   * Decide which model should handle this request.
   */
  route(prompt: string): RoutingDecision {
    const complexity = this.estimateComplexity(prompt)
    let selectedModel: ModelType
    let confidence = 1.0

    switch (this.config.strategy) {
      case 'teacher_only':
        selectedModel = 'teacher'
        break

      case 'student_only':
        if (!this.config.studentModel) {
          selectedModel = 'teacher'
        } else {
          selectedModel = 'student'
        }
        break

      case 'confidence_based':
        if (!this.config.studentModel) {
          selectedModel = 'teacher'
        } else {
          confidence = this.metrics.student.successRate
          selectedModel = confidence >= this.config.confidenceThreshold ? 'student' : 'teacher'
        }
        break

      case 'task_complexity':
        if (!this.config.studentModel) {
          selectedModel = 'teacher'
        } else {
          // Simple tasks → student, complex → teacher
          selectedModel = complexity <= 0.4 ? 'student' : 'teacher'
        }
        break

      case 'progressive':
        if (!this.config.studentModel) {
          selectedModel = 'teacher'
        } else {
          // Randomly sample student at current rate
          selectedModel = Math.random() < this.currentStudentRate ? 'student' : 'teacher'
        }
        break

      default:
        selectedModel = 'teacher'
    }

    const modelId = selectedModel === 'teacher'
      ? this.config.teacherModel
      : this.config.studentModel ?? this.config.teacherModel

    const decision: RoutingDecision = {
      selectedModel,
      modelId,
      strategyUsed: this.config.strategy,
      confidence,
      taskComplexity: complexity,
      timestamp: new Date().toISOString(),
    }

    this.history.push(decision)
    if (this.history.length > 1000) this.history = this.history.slice(-500)

    return decision
  }

  /**
   * Report the outcome of a request for metric tracking.
   */
  recordOutcome(model: ModelType, success: boolean, latencyMs: number): void {
    const m = this.metrics[model]
    m.totalRequests++
    if (success) m.successCount++
    else m.failureCount++
    m.successRate = m.successCount / m.totalRequests
    // Rolling average latency
    m.avgLatencyMs = (m.avgLatencyMs * (m.totalRequests - 1) + latencyMs) / m.totalRequests
  }

  /**
   * Increase student sample rate after a successful evaluation.
   */
  increaseStudentRate(): void {
    this.currentStudentRate = Math.min(
      this.config.maxStudentRate,
      this.currentStudentRate + this.config.improvementIncrement,
    )
  }

  /**
   * Decrease student rate after regression.
   */
  decreaseStudentRate(): void {
    this.currentStudentRate = Math.max(
      0,
      this.currentStudentRate - this.config.improvementIncrement,
    )
  }

  /**
   * Estimate task complexity from the prompt text.
   * Returns 0-1 where higher = more complex.
   */
  private estimateComplexity(prompt: string): number {
    let score = 0
    const lower = prompt.toLowerCase()

    // Length factor
    score += Math.min(0.2, prompt.length / 500)

    // Multi-concept indicators
    const multiConcept = ['and', 'with', 'also', 'plus', 'including', 'along with']
    const conceptCount = multiConcept.filter(w => lower.includes(w)).length
    score += Math.min(0.3, conceptCount * 0.1)

    // Complexity keywords
    const complexWords = ['dungeon', 'boss', 'puzzle', 'multi', 'level', 'system', 'connect', 'link', 'patrol']
    const complexCount = complexWords.filter(w => lower.includes(w)).length
    score += Math.min(0.3, complexCount * 0.1)

    // Quantity indicators
    const quantities = lower.match(/\d+/g)
    if (quantities) {
      const maxNum = Math.max(...quantities.map(Number))
      score += Math.min(0.2, maxNum / 20)
    }

    return Math.min(1.0, score)
  }

  getConfig(): RouterConfig {
    return { ...this.config }
  }

  updateConfig(partial: Partial<RouterConfig>): void {
    Object.assign(this.config, partial)
    if (partial.studentSampleRate !== undefined) {
      this.currentStudentRate = partial.studentSampleRate
    }
  }

  getMetrics(): Record<ModelType, ModelMetrics> {
    return JSON.parse(JSON.stringify(this.metrics))
  }

  getStudentRate(): number {
    return this.currentStudentRate
  }

  getHistory(limit = 50): RoutingDecision[] {
    return this.history.slice(-limit)
  }

  /**
   * Get scaffolding reduction metrics.
   * Tracks how the student model's capabilities evolve over time.
   */
  getScaffoldingMetrics(): ScaffoldingMetrics {
    const studentHistory = this.history.filter(d => d.selectedModel === 'student')
    const teacherHistory = this.history.filter(d => d.selectedModel === 'teacher')

    // Calculate student coverage by task complexity
    const studentComplexities = studentHistory.map(d => d.taskComplexity)
    const maxStudentComplexity = studentComplexities.length > 0 ? Math.max(...studentComplexities) : 0
    const avgStudentComplexity = studentComplexities.length > 0
      ? studentComplexities.reduce((a, b) => a + b, 0) / studentComplexities.length : 0

    return {
      currentStudentRate: this.currentStudentRate,
      studentSuccessRate: this.metrics.student.successRate,
      teacherSuccessRate: this.metrics.teacher.successRate,
      studentRequestCount: this.metrics.student.totalRequests,
      teacherRequestCount: this.metrics.teacher.totalRequests,
      maxStudentComplexity,
      avgStudentComplexity,
      studentLatencyMs: this.metrics.student.avgLatencyMs,
      teacherLatencyMs: this.metrics.teacher.avgLatencyMs,
    }
  }
}

export interface ScaffoldingMetrics {
  currentStudentRate: number
  studentSuccessRate: number
  teacherSuccessRate: number
  studentRequestCount: number
  teacherRequestCount: number
  maxStudentComplexity: number
  avgStudentComplexity: number
  studentLatencyMs: number
  teacherLatencyMs: number
}
