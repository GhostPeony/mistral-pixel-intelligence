import { World } from '../ecs/world'
import type { CognitiveData, CorrectionTrace, SuccessTrace, Trace, TraceContext } from './types'

export class TraceCapture {
  private snapshotA: string | null = null    // AI's version
  private toolCallsA: any[] = []             // AI's tool calls
  private cognitiveA: CognitiveData | null = null // AI's reasoning
  private currentPrompt = ''
  private critiques: string[] = []
  private attempts = 0
  private sessionId: string
  private correctionCognitive: CognitiveData[] = [] // reasoning during correction rounds
  private currentModelId = 'mistral-large-latest'
  private currentRoutingDecision: any = null
  private responseTimeMs = 0
  private canvasWidth = 800
  private canvasHeight = 600

  constructor() {
    this.sessionId = `session_${Date.now()}`
  }

  /** Update the canvas size for trace context */
  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width
    this.canvasHeight = height
  }

  /** Record how long the AI took to respond */
  setResponseTime(ms: number): void {
    this.responseTimeMs = ms
  }

  /** Set the model ID and routing decision from the latest API response */
  setModelInfo(modelId: string, routingDecision?: any): void {
    this.currentModelId = modelId
    this.currentRoutingDecision = routingDecision ?? null
  }

  /** Called after Mistral finishes generating */
  captureAISnapshot(world: World, prompt: string, toolCalls: any[], cognitive?: CognitiveData): void {
    this.snapshotA = world.serialize()
    this.toolCallsA = toolCalls
    this.cognitiveA = cognitive ?? null
    this.currentPrompt = prompt
    this.critiques = []
    this.correctionCognitive = []
    this.attempts = 1
  }

  /** Called when player sends a critique */
  addCritique(text: string, cognitive?: CognitiveData): void {
    this.critiques.push(text)
    if (cognitive) this.correctionCognitive.push(cognitive)
    this.attempts++
  }

  /** Called when player clicks "Looks Good" — returns trace to send to server */
  capturePlayerApproval(world: World): Trace | null {
    if (!this.snapshotA) return null

    const snapshotB = world.serialize()
    const entitiesA = JSON.parse(this.snapshotA).entities
    const entitiesB = JSON.parse(snapshotB).entities

    const hasChanges = this.snapshotA !== snapshotB

    const context: TraceContext = {
      model: 'mistral-large-latest',
      modelId: this.currentModelId,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      canvasSize: { width: this.canvasWidth, height: this.canvasHeight },
      routingDecision: this.currentRoutingDecision ?? undefined,
      responseTimeMs: this.responseTimeMs || undefined,
    }

    let trace: Trace

    if (hasChanges || this.critiques.length > 0) {
      // Merge correction-round cognitive data into a summary
      const correctionSummary = this.mergeCognitive(this.correctionCognitive)

      trace = {
        type: 'correction',
        prompt: this.currentPrompt,
        rejected: {
          entities: entitiesA,
          toolCalls: this.toolCallsA,
          cognitive: this.cognitiveA ?? undefined,
        },
        chosen: {
          entities: entitiesB,
          toolCalls: this.reconstructToolCalls(entitiesB),
          cognitive: correctionSummary ?? undefined,
        },
        feedback: this.generateDiffSummary(entitiesA, entitiesB),
        critiques: this.critiques,
        attempts: this.attempts,
        cognitive: this.buildTopLevelCognitive(),
        context,
      } satisfies CorrectionTrace
    } else {
      trace = {
        type: 'success',
        prompt: this.currentPrompt,
        output: {
          entities: entitiesA,
          toolCalls: this.toolCallsA,
          cognitive: this.cognitiveA ?? undefined,
        },
        // Score computed server-side at ingestion — not hardcoded here
        cognitive: this.cognitiveA ?? undefined,
        context,
      } satisfies SuccessTrace
    }

    // Reset for next round
    this.snapshotA = null
    this.toolCallsA = []
    this.cognitiveA = null
    this.critiques = []
    this.correctionCognitive = []

    return trace
  }

  /** Whether there's an active AI snapshot waiting for approval */
  hasActiveSnapshot(): boolean {
    return this.snapshotA !== null
  }

  /** Merge multiple cognitive entries from correction rounds */
  private mergeCognitive(entries: CognitiveData[]): CognitiveData | null {
    if (entries.length === 0) return null
    return {
      thinking: entries.map(e => e.thinking).filter(Boolean).join(' → ') || undefined,
      plan: entries[entries.length - 1]?.plan || undefined,
      reflection: entries.map(e => e.reflection).filter(Boolean).join(' | ') || undefined,
      decisionRationale: entries[entries.length - 1]?.decisionRationale || undefined,
      confidence: entries.length > 0
        ? entries.reduce((sum, e) => sum + (e.confidence ?? 0), 0) / entries.length
        : undefined,
    }
  }

  /** Build top-level cognitive summary from initial + correction data */
  private buildTopLevelCognitive(): CognitiveData | undefined {
    const parts: CognitiveData[] = []
    if (this.cognitiveA) parts.push(this.cognitiveA)
    parts.push(...this.correctionCognitive)
    if (parts.length === 0) return undefined
    return this.mergeCognitive(parts) ?? undefined
  }

  private generateDiffSummary(entitiesA: any[], entitiesB: any[]): string {
    const added = entitiesB.filter((b: any) => !entitiesA.find((a: any) => a.id === b.id))
    const removed = entitiesA.filter((a: any) => !entitiesB.find((b: any) => b.id === a.id))
    const modified = entitiesB.filter((b: any) => {
      const a = entitiesA.find((e: any) => e.id === b.id)
      return a && JSON.stringify(a) !== JSON.stringify(b)
    })

    const parts: string[] = []
    if (added.length) parts.push(`Added ${added.length} entities`)
    if (removed.length) parts.push(`Removed ${removed.length} entities`)
    if (modified.length) parts.push(`Modified ${modified.length} entities`)
    return parts.join('. ') || 'No structural changes (critiques only)'
  }

  private reconstructToolCalls(entities: any[]): any[] {
    // Reconstruct what tool calls would produce the final state
    return entities.map((e: any) => ({
      name: 'spawn_entities',
      arguments: {
        entities: [{
          name: e.name,
          assetId: e.components?.sprite?.assetId,
          x: e.components?.position?.x,
          y: e.components?.position?.y,
          width: e.components?.sprite?.width,
          height: e.components?.sprite?.height,
          gravity: e.components?.physics?.gravity,
          solid: e.components?.physics?.solid,
        }],
      },
    }))
  }
}
