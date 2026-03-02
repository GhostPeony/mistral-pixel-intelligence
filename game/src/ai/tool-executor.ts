import { World } from '../ecs/world'
import { SPRITE_REGISTRY } from '../assets/sprites'
import type {
  Entity,
  PositionComponent,
  SpriteComponent,
  PhysicsComponent,
  HealthComponent,
  PatrolComponent,
  BehaviorComponent,
  BehaviorRule,
  DoorComponent,
  FacingComponent,
  EquipmentComponent,
  LayerComponent,
  ItemDef,
} from '../ecs/types'

export interface ToolResult {
  result: string
  error?: boolean
}

export class ToolExecutor {
  constructor(private world: World) {}

  execute(toolName: string, args: unknown): ToolResult {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = args as any
    switch (toolName) {
      case 'spawn_entities':
        return this.spawnEntities(a)
      case 'add_behavior':
        return this.addBehavior(a)
      case 'set_health':
        return this.setHealth(a)
      case 'add_patrol':
        return this.addPatrol(a)
      case 'equip_item':
        return this.equipItem(a)
      case 'move_entity':
        return this.moveEntity(a)
      case 'move_entities':
        return this.moveEntities(a)
      case 'delete_entity':
        return this.deleteEntity(a)
      case 'resize_entity':
        return this.resizeEntity(a)
      case 'set_physics':
        return this.setPhysics(a)
      case 'set_sprite':
        return this.setSprite(a)
      case 'link_doors':
        return this.linkDoors(a)
      case 'clear_world':
        return this.clearWorld()
      case 'set_layer':
        return this.setLayer(a)
      default:
        return { result: `Unknown tool: ${toolName}`, error: true }
    }
  }

  /** Case-insensitive partial match on entity name */
  private findByName(name: string): Entity | undefined {
    const lower = name.toLowerCase()
    const entities = this.world.getAllEntities()

    // Exact match first
    const exact = entities.find((e) => e.name.toLowerCase() === lower)
    if (exact) return exact

    // Partial match
    return entities.find((e) => e.name.toLowerCase().includes(lower))
  }

  // ---------- Tool Implementations ----------

  private spawnEntities(args: {
    entities: {
      name: string
      assetId: string
      x: number
      y: number
      width?: number
      height?: number
      gravity?: boolean
      solid?: boolean
      hueShift?: number
      layerId?: string
    }[]
  }): ToolResult {
    const created: string[] = []

    for (const def of args.entities) {
      const sprite = SPRITE_REGISTRY[def.assetId]
      if (!sprite) {
        return {
          result: `Unknown assetId: ${def.assetId}`,
          error: true,
        }
      }

      const id = this.world.createEntity(def.name)

      this.world.addComponent(id, {
        type: 'position',
        x: def.x,
        y: def.y,
      } as PositionComponent)

      this.world.addComponent(id, {
        type: 'sprite',
        assetId: def.assetId,
        width: def.width ?? sprite.width,
        height: def.height ?? sprite.height,
        flipX: false,
        hueShift: def.hueShift ?? 0,
      } as SpriteComponent)

      // Add physics: gravity defaults to false for static, true for characters
      // In topdown mode layers, default gravity to false regardless
      const targetLayer = def.layerId ?? this.world.layerManager.currentLayerId
      const layerMode = this.world.layerManager.getGameModeForLayer(targetLayer)
      const isCharacter =
        def.assetId.startsWith('hero_') ||
        def.assetId.startsWith('enemy_') ||
        def.assetId.startsWith('npc_')
      const defaultGravity = layerMode === 'topdown' ? false : isCharacter
      this.world.addComponent(id, {
        type: 'physics',
        velocityX: 0,
        velocityY: 0,
        gravity: def.gravity ?? defaultGravity,
        solid: def.solid ?? true,
      } as PhysicsComponent)

      // Assign to layer
      this.world.addComponent(id, {
        type: 'layer',
        layerId: targetLayer,
      } as LayerComponent)

      created.push(def.name)
    }

    return { result: `Spawned ${created.length} entities: ${created.join(', ')}` }
  }

  private addBehavior(args: {
    entityName: string
    trigger: string
    action: string
    description?: string
  }): ToolResult {
    const entity = this.findByName(args.entityName)
    if (!entity) {
      return { result: `Entity not found: ${args.entityName}`, error: true }
    }

    let behavior = entity.components.get('behavior') as
      | BehaviorComponent
      | undefined
    if (!behavior) {
      behavior = { type: 'behavior', rules: [] }
      this.world.addComponent(entity.id, behavior)
    }

    const rule: BehaviorRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      description: args.description ?? `${args.trigger} -> ${args.action}`,
      trigger: args.trigger,
      action: args.action,
      enabled: true,
    }
    behavior.rules.push(rule)

    return { result: `Added behavior to ${entity.name}: ${rule.description}` }
  }

  private setHealth(args: {
    entityName: string
    hp: number
    respawnDelay?: number
  }): ToolResult {
    const entity = this.findByName(args.entityName)
    if (!entity) {
      return { result: `Entity not found: ${args.entityName}`, error: true }
    }

    const pos = entity.components.get('position') as
      | PositionComponent
      | undefined

    this.world.addComponent(entity.id, {
      type: 'health',
      hp: args.hp,
      maxHp: args.hp,
      invulnerableTimer: 0,
      spawnX: pos?.x ?? 0,
      spawnY: pos?.y ?? 0,
      respawnDelay: args.respawnDelay ?? 1000,
      deadTimer: 0,
    } as HealthComponent)

    return { result: `Set health of ${entity.name} to ${args.hp} HP` }
  }

  private addPatrol(args: {
    entityName: string
    waypoints: { x: number; y: number }[]
    speed?: number
    loop?: boolean
  }): ToolResult {
    const entity = this.findByName(args.entityName)
    if (!entity) {
      return { result: `Entity not found: ${args.entityName}`, error: true }
    }

    this.world.addComponent(entity.id, {
      type: 'patrol',
      waypoints: args.waypoints,
      currentIndex: 0,
      speed: args.speed ?? 60,
      loop: args.loop ?? false,
      direction: 1,
    } as PatrolComponent)

    // Ensure facing component exists for patrol direction
    if (!entity.components.has('facing')) {
      this.world.addComponent(entity.id, {
        type: 'facing',
        direction: 'right',
      } as FacingComponent)
    }

    return {
      result: `Added patrol to ${entity.name} with ${args.waypoints.length} waypoints`,
    }
  }

  private equipItem(args: {
    entityName: string
    slot: 'weapon' | 'armor' | 'accessory'
    item: {
      name: string
      assetId?: string
      kind: 'melee' | 'ranged' | 'shield' | 'passive'
      damage?: number
      range?: number
      cooldown?: number
    }
  }): ToolResult {
    const entity = this.findByName(args.entityName)
    if (!entity) {
      return { result: `Entity not found: ${args.entityName}`, error: true }
    }

    let equipment = entity.components.get('equipment') as
      | EquipmentComponent
      | undefined
    if (!equipment) {
      equipment = {
        type: 'equipment',
        slots: { weapon: null, armor: null, accessory: null },
      }
      this.world.addComponent(entity.id, equipment)
    }

    const itemDef: ItemDef = {
      id: `item_${Date.now()}`,
      name: args.item.name,
      assetId: args.item.assetId ?? '',
      kind: args.item.kind,
      damage: args.item.damage,
      range: args.item.range,
      cooldown: args.item.cooldown,
    }

    equipment.slots[args.slot] = itemDef

    return {
      result: `Equipped ${itemDef.name} (${args.slot}) on ${entity.name}`,
    }
  }

  private moveEntity(args: {
    entityName: string
    x: number
    y: number
  }): ToolResult {
    const entity = this.findByName(args.entityName)
    if (!entity) {
      return { result: `Entity not found: ${args.entityName}`, error: true }
    }

    const pos = entity.components.get('position') as
      | PositionComponent
      | undefined
    if (pos) {
      pos.x = args.x
      pos.y = args.y
    } else {
      this.world.addComponent(entity.id, {
        type: 'position',
        x: args.x,
        y: args.y,
      } as PositionComponent)
    }

    return { result: `Moved ${entity.name} to (${args.x}, ${args.y})` }
  }

  private moveEntities(args: {
    moves: { entityName: string; x: number; y: number }[]
  }): ToolResult {
    const results: string[] = []
    const errors: string[] = []

    for (const move of args.moves) {
      const entity = this.findByName(move.entityName)
      if (!entity) {
        errors.push(move.entityName)
        continue
      }

      const pos = entity.components.get('position') as PositionComponent | undefined
      if (pos) {
        pos.x = move.x
        pos.y = move.y
      } else {
        this.world.addComponent(entity.id, {
          type: 'position',
          x: move.x,
          y: move.y,
        } as PositionComponent)
      }
      results.push(`${entity.name}→(${move.x},${move.y})`)
    }

    let msg = `Moved ${results.length} entities: ${results.join(', ')}`
    if (errors.length > 0) {
      msg += ` | Not found: ${errors.join(', ')}`
    }
    return { result: msg, error: errors.length > 0 && results.length === 0 }
  }

  private deleteEntity(args: { entityName: string }): ToolResult {
    const entity = this.findByName(args.entityName)
    if (!entity) {
      return { result: `Entity not found: ${args.entityName}`, error: true }
    }

    // Protect the hero
    if (entity.name.toLowerCase() === 'hero') {
      return { result: 'Cannot delete the player hero entity', error: true }
    }

    this.world.removeEntity(entity.id)
    return { result: `Deleted entity: ${entity.name}` }
  }

  private resizeEntity(args: {
    entityName: string
    width?: number
    height?: number
  }): ToolResult {
    const entity = this.findByName(args.entityName)
    if (!entity) {
      return { result: `Entity not found: ${args.entityName}`, error: true }
    }

    const sprite = entity.components.get('sprite') as
      | SpriteComponent
      | undefined
    if (!sprite) {
      return { result: `Entity ${entity.name} has no sprite`, error: true }
    }

    if (args.width !== undefined) sprite.width = args.width
    if (args.height !== undefined) sprite.height = args.height

    return {
      result: `Resized ${entity.name} to ${sprite.width}x${sprite.height}`,
    }
  }

  private setPhysics(args: {
    entityName: string
    gravity?: boolean
    solid?: boolean
  }): ToolResult {
    const entity = this.findByName(args.entityName)
    if (!entity) {
      return { result: `Entity not found: ${args.entityName}`, error: true }
    }

    let physics = entity.components.get('physics') as
      | PhysicsComponent
      | undefined
    if (!physics) {
      physics = {
        type: 'physics',
        velocityX: 0,
        velocityY: 0,
        gravity: false,
        solid: true,
      }
      this.world.addComponent(entity.id, physics)
    }

    if (args.gravity !== undefined) physics.gravity = args.gravity
    if (args.solid !== undefined) physics.solid = args.solid

    return {
      result: `Updated physics of ${entity.name}: gravity=${physics.gravity}, solid=${physics.solid}`,
    }
  }

  private setSprite(args: {
    entityName: string
    assetId?: string
    flipX?: boolean
    hueShift?: number
  }): ToolResult {
    const entity = this.findByName(args.entityName)
    if (!entity) {
      return { result: `Entity not found: ${args.entityName}`, error: true }
    }

    const sprite = entity.components.get('sprite') as
      | SpriteComponent
      | undefined
    if (!sprite) {
      return { result: `Entity ${entity.name} has no sprite`, error: true }
    }

    if (args.assetId !== undefined) {
      const reg = SPRITE_REGISTRY[args.assetId]
      if (!reg) {
        return { result: `Unknown assetId: ${args.assetId}`, error: true }
      }
      sprite.assetId = args.assetId
      // Update dimensions to match new sprite defaults
      sprite.width = reg.width
      sprite.height = reg.height
    }

    if (args.flipX !== undefined) sprite.flipX = args.flipX
    if (args.hueShift !== undefined) sprite.hueShift = args.hueShift

    return { result: `Updated sprite of ${entity.name}` }
  }

  private linkDoors(args: {
    door1Name: string
    door2Name: string
    bidirectional?: boolean
  }): ToolResult {
    const door1 = this.findByName(args.door1Name)
    const door2 = this.findByName(args.door2Name)

    if (!door1) {
      return { result: `Entity not found: ${args.door1Name}`, error: true }
    }
    if (!door2) {
      return { result: `Entity not found: ${args.door2Name}`, error: true }
    }

    const bidir = args.bidirectional !== false

    // Ensure door components exist
    this.world.addComponent(door1.id, {
      type: 'door',
      destinationId: door2.id,
      bidirectional: bidir,
    } as DoorComponent)

    if (bidir) {
      this.world.addComponent(door2.id, {
        type: 'door',
        destinationId: door1.id,
        bidirectional: true,
      } as DoorComponent)
    }

    return {
      result: `Linked doors: ${door1.name} <-> ${door2.name} (bidirectional: ${bidir})`,
    }
  }

  private clearWorld(): ToolResult {
    const entities = this.world.getAllEntities()
    let removed = 0

    for (const entity of entities) {
      if (entity.name.toLowerCase() === 'hero') continue
      this.world.removeEntity(entity.id)
      removed++
    }

    return { result: `Cleared world: removed ${removed} entities (kept hero)` }
  }

  private setLayer(args: { entityName: string; layerId: string }): ToolResult {
    const entity = this.findByName(args.entityName)
    if (!entity) {
      return { result: `Entity not found: ${args.entityName}`, error: true }
    }

    const layer = this.world.layerManager.getLayer(args.layerId)
    if (!layer) {
      return { result: `Layer not found: ${args.layerId}`, error: true }
    }

    // Update or add layer component
    const existing = entity.components.get('layer') as LayerComponent | undefined
    if (existing) {
      existing.layerId = args.layerId
    } else {
      this.world.addComponent(entity.id, {
        type: 'layer',
        layerId: args.layerId,
      } as LayerComponent)
    }

    return { result: `Moved ${entity.name} to layer "${layer.name}" (${args.layerId})` }
  }
}
