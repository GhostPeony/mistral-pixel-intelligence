import type { DimensionScore } from '../types.js'

interface EntityData {
  id: string
  name: string
  components: Record<string, any>
}

/**
 * Automated playability scoring — can the player actually play this level?
 *
 * Sub-metrics:
 * - platformReachability: can the player reach all platforms given jump height/gravity?
 * - enemyPlacement: are enemies on solid ground with valid patrol paths?
 * - doorLinks: bidirectional, valid destinations?
 * - entityBounds: nothing floating in void, nothing overlapping impossibly
 * - difficultyBalance: enemy density, hazard spacing relative to tier
 */
export function scorePlayability(rawEntities: EntityData[]): DimensionScore {
  // Filter out entities without components to prevent crashes
  const entities = rawEntities.filter(e => e.components != null)
  const breakdown: Record<string, number> = {}
  const details: string[] = []

  breakdown.platformReachability = scorePlatformReachability(entities, details)
  breakdown.enemyPlacement = scoreEnemyPlacement(entities, details)
  breakdown.doorLinks = scoreDoorLinks(entities, details)
  breakdown.entityBounds = scoreEntityBounds(entities, details)
  breakdown.difficultyBalance = scoreDifficultyBalance(entities, details)

  const weights = {
    platformReachability: 0.30,
    enemyPlacement: 0.20,
    doorLinks: 0.15,
    entityBounds: 0.20,
    difficultyBalance: 0.15,
  }

  const score = Object.entries(weights).reduce(
    (sum, [key, weight]) => sum + (breakdown[key] ?? 0) * weight,
    0,
  )

  return { dimension: 'playability', score, breakdown, details }
}

// --- Sub-scorers ---

const HERO_JUMP_HEIGHT = 96  // ~3 tiles worth of jump
const TILE_SIZE = 32
const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600

function scorePlatformReachability(entities: EntityData[], details: string[]): number {
  const solidEntities = entities.filter(e => e.components.physics?.solid)
  const platforms = solidEntities.filter(e => {
    const assetId = e.components.sprite?.assetId ?? ''
    return assetId.includes('platform') || assetId.includes('grass') ||
      assetId.includes('stone') || assetId.includes('brick') ||
      assetId.includes('wood')
  })

  if (platforms.length === 0) {
    details.push('No platforms found — nothing to walk on')
    return 0
  }

  // Check if platforms form a reachable chain
  // Sort by Y (top to bottom) then X (left to right)
  const sorted = [...platforms].sort((a, b) => {
    const ay = a.components.position?.y ?? 0
    const by = b.components.position?.y ?? 0
    if (Math.abs(ay - by) < TILE_SIZE) {
      return (a.components.position?.x ?? 0) - (b.components.position?.x ?? 0)
    }
    return ay - by
  })

  let reachable = 0
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    const dx = Math.abs((curr.components.position?.x ?? 0) - (prev.components.position?.x ?? 0))
    const dy = (prev.components.position?.y ?? 0) - (curr.components.position?.y ?? 0)

    // Can reach if: horizontal gap <= 5 tiles, vertical gap <= jump height
    if (dx <= TILE_SIZE * 5 && dy <= HERO_JUMP_HEIGHT && dy >= -CANVAS_HEIGHT) {
      reachable++
    }
  }

  const ratio = sorted.length > 1 ? reachable / (sorted.length - 1) : 1
  if (ratio < 0.5) details.push(`Only ${Math.round(ratio * 100)}% of platforms are reachable`)
  return ratio
}

function scoreEnemyPlacement(entities: EntityData[], details: string[]): number {
  const enemies = entities.filter(e => {
    const assetId = e.components.sprite?.assetId ?? ''
    return assetId.startsWith('enemy_') || assetId.startsWith('boss_')
  })

  if (enemies.length === 0) return 1.0  // no enemies = no placement issues

  const solidEntities = entities.filter(e => e.components.physics?.solid)
  let wellPlaced = 0

  for (const enemy of enemies) {
    const ex = enemy.components.position?.x ?? 0
    const ey = enemy.components.position?.y ?? 0

    // Check if there's solid ground below this enemy
    const hasGround = solidEntities.some(s => {
      const sx = s.components.position?.x ?? 0
      const sy = s.components.position?.y ?? 0
      const sw = s.components.sprite?.width ?? TILE_SIZE
      return sx <= ex + TILE_SIZE && sx + sw >= ex && sy > ey && sy - ey <= TILE_SIZE * 4
    })

    // Check patrol validity
    const patrol = enemy.components.patrol
    let patrolValid = true
    if (patrol?.waypoints?.length > 0) {
      for (const wp of patrol.waypoints) {
        const wpHasGround = solidEntities.some(s => {
          const sx = s.components.position?.x ?? 0
          const sy = s.components.position?.y ?? 0
          const sw = s.components.sprite?.width ?? TILE_SIZE
          return sx <= wp.x + TILE_SIZE && sx + sw >= wp.x && sy > wp.y && sy - wp.y <= TILE_SIZE * 4
        })
        if (!wpHasGround) patrolValid = false
      }
    }

    if (hasGround && patrolValid) wellPlaced++
  }

  const ratio = wellPlaced / enemies.length
  if (ratio < 1) details.push(`${enemies.length - wellPlaced}/${enemies.length} enemies have placement issues`)
  return ratio
}

function scoreDoorLinks(entities: EntityData[], details: string[]): number {
  const doors = entities.filter(e => e.components.door)

  if (doors.length === 0) return 1.0  // no doors = no link issues

  let validLinks = 0
  for (const door of doors) {
    const destId = door.components.door.destinationId
    if (!destId) {
      details.push(`Door "${door.name}" has no destination`)
      continue
    }

    const dest = entities.find(e => e.id === destId)
    if (!dest) {
      details.push(`Door "${door.name}" links to non-existent entity`)
      continue
    }

    // Check bidirectional link
    if (door.components.door.bidirectional) {
      const destDoor = dest.components.door
      if (!destDoor || destDoor.destinationId !== door.id) {
        details.push(`Door "${door.name}" is bidirectional but "${dest.name}" doesn't link back`)
        validLinks += 0.5
        continue
      }
    }

    validLinks++
  }

  return doors.length > 0 ? validLinks / doors.length : 1.0
}

function scoreEntityBounds(entities: EntityData[], details: string[]): number {
  if (entities.length === 0) return 1.0

  let inBounds = 0
  const overlaps: string[] = []

  for (const entity of entities) {
    const x = entity.components.position?.x ?? 0
    const y = entity.components.position?.y ?? 0
    const w = entity.components.sprite?.width ?? TILE_SIZE
    const h = entity.components.sprite?.height ?? TILE_SIZE

    // Check if entity is within reasonable canvas bounds (with generous margins)
    const margin = 200
    if (x >= -margin && x <= CANVAS_WIDTH + margin && y >= -margin && y <= CANVAS_HEIGHT + margin) {
      inBounds++
    }
  }

  // Check for impossible overlaps (multiple solid entities in same position)
  const solidPositions = new Map<string, string[]>()
  for (const entity of entities) {
    if (!entity.components.physics?.solid) continue
    const x = Math.round((entity.components.position?.x ?? 0) / TILE_SIZE)
    const y = Math.round((entity.components.position?.y ?? 0) / TILE_SIZE)
    const key = `${x},${y}`
    if (!solidPositions.has(key)) solidPositions.set(key, [])
    solidPositions.get(key)!.push(entity.name)
  }

  let overlapCount = 0
  for (const [, names] of solidPositions) {
    if (names.length > 1) overlapCount += names.length - 1
  }

  const boundsRatio = inBounds / entities.length
  const overlapPenalty = Math.min(0.3, overlapCount * 0.05)

  if (boundsRatio < 1) details.push(`${entities.length - inBounds} entities out of bounds`)
  if (overlapCount > 0) details.push(`${overlapCount} solid entity overlaps detected`)

  return Math.max(0, boundsRatio - overlapPenalty)
}

function scoreDifficultyBalance(entities: EntityData[], details: string[]): number {
  const enemies = entities.filter(e => {
    const assetId = e.components.sprite?.assetId ?? ''
    return assetId.startsWith('enemy_') || assetId.startsWith('boss_')
  })

  const platforms = entities.filter(e => e.components.physics?.solid)
  const items = entities.filter(e => {
    const assetId = e.components.sprite?.assetId ?? ''
    return assetId.includes('potion') || assetId.includes('heart') ||
      assetId.includes('chest') || assetId.includes('key') || assetId.includes('coin')
  })

  if (platforms.length === 0) return 0.5

  // Enemy density: enemies per platform area
  const enemyDensity = enemies.length / Math.max(1, platforms.length)
  // Ideal: 0.1-0.3 enemies per platform tile
  const densityScore = enemyDensity <= 0 ? 0.8 :
    enemyDensity <= 0.3 ? 1.0 :
      enemyDensity <= 0.6 ? 0.7 :
        0.4

  // Item-to-enemy ratio: should have some healing/items relative to enemies
  const itemRatio = enemies.length > 0 ? items.length / enemies.length : 1
  const itemScore = itemRatio >= 0.3 ? 1.0 :
    itemRatio >= 0.1 ? 0.7 :
      enemies.length === 0 ? 1.0 : 0.4

  if (enemyDensity > 0.6) details.push('High enemy density may be frustrating')
  if (enemies.length > 0 && items.length === 0) details.push('No healing/items to counter enemies')

  return densityScore * 0.6 + itemScore * 0.4
}
