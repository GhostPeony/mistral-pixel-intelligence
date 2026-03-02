import type { DimensionScore, ToolCallRecord } from '../types.js'

/**
 * Automated tool-efficiency scoring — how well does the model use tools?
 *
 * Sub-metrics:
 * - efficiencyRatio: entity count / tool call count (higher = better batching)
 * - errorRate: failed calls / total calls
 * - toolDiversity: unique tools used / total available
 * - redundancy: unnecessary move/resize after spawn
 * - batchingQuality: entities per spawn_entities call
 */
export function scoreToolEfficiency(
  toolCalls: ToolCallRecord[],
  entityCount: number,
): DimensionScore {
  const breakdown: Record<string, number> = {}
  const details: string[] = []

  breakdown.efficiencyRatio = scoreEfficiencyRatio(toolCalls, entityCount, details)
  breakdown.errorRate = scoreErrorRate(toolCalls, details)
  breakdown.toolDiversity = scoreToolDiversity(toolCalls, details)
  breakdown.redundancy = scoreRedundancy(toolCalls, details)
  breakdown.batchingQuality = scoreBatchingQuality(toolCalls, entityCount, details)

  const weights = {
    efficiencyRatio: 0.25,
    errorRate: 0.25,
    toolDiversity: 0.15,
    redundancy: 0.15,
    batchingQuality: 0.20,
  }

  const score = Object.entries(weights).reduce(
    (sum, [key, weight]) => sum + (breakdown[key] ?? 0) * weight,
    0,
  )

  return { dimension: 'toolEfficiency', score, breakdown, details }
}

// Total tools available: 12 base + 4 extended
const TOTAL_TOOLS = 16

function scoreEfficiencyRatio(toolCalls: ToolCallRecord[], entityCount: number, details: string[]): number {
  if (toolCalls.length === 0) return 0

  // How many entities per tool call? Higher = more efficient
  const ratio = entityCount / toolCalls.length
  // Ideal: 1+ entities per call (batched spawning)
  const score = Math.min(1.0, ratio / 2)

  if (ratio < 0.5) details.push(`Low efficiency: ${entityCount} entities from ${toolCalls.length} calls`)
  return score
}

function scoreErrorRate(toolCalls: ToolCallRecord[], details: string[]): number {
  if (toolCalls.length === 0) return 1.0

  const errors = toolCalls.filter(tc => tc.error)
  const errorRate = errors.length / toolCalls.length

  if (errors.length > 0) {
    details.push(`${errors.length}/${toolCalls.length} tool calls failed`)
  }

  return 1.0 - errorRate
}

function scoreToolDiversity(toolCalls: ToolCallRecord[], details: string[]): number {
  if (toolCalls.length === 0) return 0

  const uniqueTools = new Set(toolCalls.map(tc => tc.name))

  // Score based on how many of the available tools were used
  // Simple tasks may only need 1-2 tools, complex tasks should use more
  const diversity = uniqueTools.size / Math.min(TOTAL_TOOLS, toolCalls.length + 2)
  const score = Math.min(1.0, diversity)

  if (uniqueTools.size === 1) details.push('Only one tool type used')
  return score
}

function scoreRedundancy(toolCalls: ToolCallRecord[], details: string[]): number {
  if (toolCalls.length === 0) return 1.0

  let redundantOps = 0

  // Track which entities were spawned and when they were moved/resized
  const spawnedEntities = new Set<string>()
  const recentSpawns = new Map<string, number>() // entity name -> index of spawn

  for (let i = 0; i < toolCalls.length; i++) {
    const tc = toolCalls[i]

    if (tc.name === 'spawn_entities') {
      const args = tc.arguments as { entities?: { name: string }[] }
      for (const ent of args.entities ?? []) {
        spawnedEntities.add(ent.name.toLowerCase())
        recentSpawns.set(ent.name.toLowerCase(), i)
      }
    }

    // Move/resize immediately after spawn = redundant (should set position in spawn)
    if (tc.name === 'move_entity' || tc.name === 'resize_entity') {
      const name = ((tc.arguments as any).entityName ?? '').toLowerCase()
      const spawnIdx = recentSpawns.get(name)
      if (spawnIdx !== undefined && i - spawnIdx <= 2) {
        redundantOps++
      }
    }
  }

  const redundancyRate = toolCalls.length > 0 ? redundantOps / toolCalls.length : 0
  if (redundantOps > 0) details.push(`${redundantOps} redundant move/resize ops after spawn`)

  return 1.0 - Math.min(0.5, redundancyRate)
}

function scoreBatchingQuality(toolCalls: ToolCallRecord[], entityCount: number, details: string[]): number {
  const spawnCalls = toolCalls.filter(tc => tc.name === 'spawn_entities')
  if (spawnCalls.length === 0) return entityCount === 0 ? 1.0 : 0

  // Count total entities spawned across all spawn calls
  let totalSpawned = 0
  for (const sc of spawnCalls) {
    const args = sc.arguments as { entities?: unknown[] }
    totalSpawned += args.entities?.length ?? 0
  }

  // Average entities per spawn call
  const avgBatch = totalSpawned / spawnCalls.length

  // Ideal: 3+ entities per spawn call
  const score = Math.min(1.0, avgBatch / 3)

  if (avgBatch < 1.5) details.push(`Low batching: avg ${avgBatch.toFixed(1)} entities per spawn call`)
  return score
}
