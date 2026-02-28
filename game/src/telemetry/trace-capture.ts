import { World } from '../ecs/world'
import type { CorrectionTrace, SuccessTrace, Trace, TraceContext } from './types'

export class TraceCapture {
  private snapshotA: string | null = null    // AI's version
  private toolCallsA: any[] = []             // AI's tool calls
  private currentPrompt = ''
  private critiques: string[] = []
  private attempts = 0
  private sessionId: string

  constructor() {
    this.sessionId = `session_${Date.now()}`
  }

  /** Called after Mistral finishes generating */
  captureAISnapshot(world: World, prompt: string, toolCalls: any[]): void {
    this.snapshotA = world.serialize()
    this.toolCallsA = toolCalls
    this.currentPrompt = prompt
    this.critiques = []
    this.attempts = 1
  }

  /** Called when player sends a critique */
  addCritique(text: string): void {
    this.critiques.push(text)
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
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      canvasSize: { width: 800, height: 600 },
    }

    let trace: Trace

    if (hasChanges || this.critiques.length > 0) {
      trace = {
        type: 'correction',
        prompt: this.currentPrompt,
        rejected: { entities: entitiesA, toolCalls: this.toolCallsA },
        chosen: { entities: entitiesB, toolCalls: this.reconstructToolCalls(entitiesB) },
        feedback: this.generateDiffSummary(entitiesA, entitiesB),
        critiques: this.critiques,
        attempts: this.attempts,
        context,
      } satisfies CorrectionTrace
    } else {
      trace = {
        type: 'success',
        prompt: this.currentPrompt,
        output: { entities: entitiesA, toolCalls: this.toolCallsA },
        score: 1.0,
        context,
      } satisfies SuccessTrace
    }

    // Reset for next round
    this.snapshotA = null
    this.toolCallsA = []
    this.critiques = []

    return trace
  }

  /** Whether there's an active AI snapshot waiting for approval */
  hasActiveSnapshot(): boolean {
    return this.snapshotA !== null
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
