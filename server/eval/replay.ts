import type { ToolCallRecord } from './types.js'

interface ReplayResult {
  entities: any[]
  toolResults: ToolCallRecord[]
  entityCount: number
  worldSnapshot: string
}

/**
 * Replay recorded tool calls against a fresh World instance.
 * Core primitive for both evaluation and trace validation.
 *
 * Uses dynamic import to load game modules since they may have
 * browser-only dependencies that need to be stubbed.
 */
export async function replayToolCalls(
  toolCalls: { name: string; arguments: Record<string, unknown> }[],
): Promise<ReplayResult> {
  // Dynamic import of game modules — these are shared between client and server
  const { World } = await import('../../game/src/ecs/world.js')
  const { ToolExecutor } = await import('../../game/src/ai/tool-executor.js')

  const world = new World()
  const executor = new ToolExecutor(world)
  const results: ToolCallRecord[] = []

  for (const tc of toolCalls) {
    const result = executor.execute(tc.name, tc.arguments)
    results.push({
      name: tc.name,
      arguments: tc.arguments,
      result: result.result,
      error: result.error ?? false,
    })
  }

  const entities = world.getAllEntities().map(e => {
    const components: Record<string, any> = {}
    for (const [key, value] of e.components) {
      components[key] = value
    }
    return { id: e.id, name: e.name, components }
  })

  return {
    entities,
    toolResults: results,
    entityCount: entities.length,
    worldSnapshot: world.serialize(),
  }
}

/**
 * Replay tool calls from a trace object (handles both success and correction traces).
 */
export async function replayTrace(trace: any): Promise<ReplayResult> {
  const toolCalls = trace.type === 'success'
    ? trace.output?.toolCalls ?? []
    : trace.chosen?.toolCalls ?? []

  // Normalize tool calls — they may have stringified arguments
  const normalized = toolCalls.map((tc: any) => ({
    name: tc.name ?? tc.function?.name ?? '',
    arguments: typeof tc.arguments === 'string'
      ? JSON.parse(tc.arguments)
      : tc.arguments ?? (typeof tc.function?.arguments === 'string'
        ? JSON.parse(tc.function.arguments)
        : tc.function?.arguments ?? {}),
  }))

  return replayToolCalls(normalized)
}
