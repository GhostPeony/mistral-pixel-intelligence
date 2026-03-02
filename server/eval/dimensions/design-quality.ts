import type { DimensionScore, JudgeModel } from '../types.js'
import { judgeDesign } from '../judge.js'

interface EntityData {
  id: string
  name: string
  components: Record<string, any>
}

/**
 * Design quality scoring — a mix of automated heuristics and LLM-as-judge.
 *
 * Sub-metrics:
 * - entityVariety: unique sprite types / total entities
 * - spatialComposition: distribution, clustering, visual balance (heuristic)
 * - thematicCoherence: does the output match the prompt? (LLM judge)
 * - namingQuality: descriptive, unique entity names (heuristic + LLM)
 * - decorationDensity: functional vs decorative entity ratio
 */
export async function scoreDesignQuality(
  entities: EntityData[],
  prompt: string,
  judgeModel: JudgeModel,
): Promise<DimensionScore> {
  const breakdown: Record<string, number> = {}
  const details: string[] = []

  // Automated heuristics
  breakdown.entityVariety = scoreEntityVariety(entities, details)
  breakdown.spatialComposition = scoreSpatialComposition(entities, details)
  breakdown.decorationDensity = scoreDecorationDensity(entities, details)

  // LLM-as-judge (may fail gracefully)
  const judgeScores = await callJudge(entities, prompt, judgeModel)
  if (judgeScores) {
    breakdown.thematicCoherence = judgeScores.thematicCoherence
    breakdown.namingQuality = judgeScores.namingQuality
    breakdown.creativity = judgeScores.creativity
    if (judgeScores.summary) details.push(`Judge: ${judgeScores.summary}`)

    // Blend judge spatial with heuristic spatial
    breakdown.spatialComposition = breakdown.spatialComposition * 0.5 + judgeScores.spatialComposition * 0.5
  } else {
    // Fallback: heuristic-only naming quality
    breakdown.thematicCoherence = 0.5
    breakdown.namingQuality = scoreNamingQualityHeuristic(entities, details)
    breakdown.creativity = 0.5
    details.push('LLM judge unavailable — using heuristic fallbacks')
  }

  const weights = {
    entityVariety: 0.15,
    spatialComposition: 0.20,
    thematicCoherence: 0.25,
    namingQuality: 0.15,
    decorationDensity: 0.10,
    creativity: 0.15,
  }

  const score = Object.entries(weights).reduce(
    (sum, [key, weight]) => sum + (breakdown[key] ?? 0) * weight,
    0,
  )

  return { dimension: 'designQuality', score, breakdown, details }
}

// --- Heuristic sub-scorers ---

function scoreEntityVariety(entities: EntityData[], details: string[]): number {
  if (entities.length === 0) return 0

  const spriteTypes = new Set(
    entities.map(e => e.components.sprite?.assetId).filter(Boolean),
  )

  // Ratio of unique sprites to total entities
  const ratio = spriteTypes.size / entities.length
  // Ideal: at least 30% variety
  const score = Math.min(1.0, ratio / 0.3)

  if (spriteTypes.size === 1) details.push('Only one sprite type used — low variety')
  return score
}

function scoreSpatialComposition(entities: EntityData[], details: string[]): number {
  if (entities.length < 2) return entities.length === 1 ? 0.5 : 0

  const positions = entities
    .map(e => ({ x: e.components.position?.x ?? 0, y: e.components.position?.y ?? 0 }))
    .filter(p => p.x !== 0 || p.y !== 0)

  if (positions.length < 2) return 0.5

  // Check distribution across canvas
  const xs = positions.map(p => p.x)
  const ys = positions.map(p => p.y)
  const xRange = Math.max(...xs) - Math.min(...xs)
  const yRange = Math.max(...ys) - Math.min(...ys)

  // Spread score: uses reasonable portion of canvas
  const xSpread = Math.min(1.0, xRange / 400) // at least half the canvas width
  const ySpread = Math.min(1.0, yRange / 200) // at least a third of the canvas height
  const spreadScore = (xSpread + ySpread) / 2

  // Clustering penalty: too many entities at the same spot
  const gridSize = 48
  const cells = new Map<string, number>()
  for (const p of positions) {
    const key = `${Math.floor(p.x / gridSize)},${Math.floor(p.y / gridSize)}`
    cells.set(key, (cells.get(key) ?? 0) + 1)
  }
  const maxCluster = Math.max(...cells.values())
  const clusterPenalty = maxCluster > 5 ? Math.min(0.3, (maxCluster - 5) * 0.05) : 0

  if (spreadScore < 0.3) details.push('Entities clustered in a small area')
  if (clusterPenalty > 0) details.push(`Dense cluster of ${maxCluster} entities in one cell`)

  return Math.max(0, spreadScore - clusterPenalty)
}

function scoreDecorationDensity(entities: EntityData[], details: string[]): number {
  if (entities.length === 0) return 0

  const decorative = entities.filter(e => {
    const assetId = e.components.sprite?.assetId ?? ''
    return assetId.includes('tree') || assetId.includes('bush') || assetId.includes('torch') ||
      assetId.includes('flower') || assetId.includes('sign') || assetId.includes('banner') ||
      assetId.includes('flag') || assetId.includes('lamp') || assetId.includes('fountain') ||
      assetId.includes('statue') || assetId.includes('fence') || assetId.includes('barrel')
  })

  const functional = entities.filter(e => {
    const assetId = e.components.sprite?.assetId ?? ''
    return assetId.startsWith('enemy_') || assetId.startsWith('hero_') ||
      assetId.startsWith('boss_') || assetId.startsWith('npc_') ||
      assetId.includes('platform') || assetId.includes('door')
  })

  // A good level has some decorations alongside functional elements
  if (functional.length === 0) return decorative.length > 0 ? 0.5 : 0

  const ratio = decorative.length / (functional.length + decorative.length)
  // Ideal: 20-40% decorations
  const score = ratio >= 0.2 && ratio <= 0.5 ? 1.0 :
    ratio > 0 ? 0.6 : 0.3

  if (decorative.length === 0) details.push('No decorative elements — level may feel sparse')
  return score
}

function scoreNamingQualityHeuristic(entities: EntityData[], details: string[]): number {
  if (entities.length === 0) return 1.0

  let goodNames = 0
  const nameSet = new Set<string>()

  for (const entity of entities) {
    const name = entity.name
    nameSet.add(name)

    // Generic name patterns
    const isGeneric = /^(entity|object|thing|item)\d*$/i.test(name) ||
      /^(enemy|platform|npc|block)\d+$/i.test(name)

    if (!isGeneric && name.length > 3) goodNames++
  }

  const uniqueRatio = nameSet.size / entities.length
  const qualityRatio = goodNames / entities.length
  const score = qualityRatio * 0.7 + uniqueRatio * 0.3

  if (qualityRatio < 0.5) details.push('Many generic entity names')
  if (uniqueRatio < 1) details.push(`${entities.length - nameSet.size} duplicate entity names`)

  return score
}

// --- LLM Judge (delegates to server/eval/judge.ts) ---

interface NormalizedJudgeResult {
  thematicCoherence: number
  spatialComposition: number
  namingQuality: number
  creativity: number
  summary: string
}

async function callJudge(
  entities: EntityData[],
  prompt: string,
  judgeModel: JudgeModel,
): Promise<NormalizedJudgeResult | null> {
  try {
    const input = {
      prompt,
      entities: entities.map(e => ({
        name: e.name,
        assetId: e.components.sprite?.assetId ?? 'none',
        x: e.components.position?.x ?? 0,
        y: e.components.position?.y ?? 0,
        components: Object.keys(e.components).filter(k => k !== 'position' && k !== 'sprite'),
      })),
      toolCalls: [],
    }

    const result = await judgeDesign(input, judgeModel)

    return {
      thematicCoherence: result.thematic_coherence,
      spatialComposition: result.spatial_composition,
      namingQuality: result.naming_quality,
      creativity: result.creativity,
      summary: result.summary,
    }
  } catch {
    return null
  }
}
