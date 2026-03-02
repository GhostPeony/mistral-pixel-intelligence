import { World } from '../ecs/world'
import { ASSET_IDS } from '../assets/sprites'
import { MISTRAL_TOOLS } from './tool-definitions'
import { GAME_CONFIG } from '../config/game-config'
import type {
  PositionComponent,
  SpriteComponent,
  PhysicsComponent,
  HealthComponent,
  PatrolComponent,
  BehaviorComponent,
  LayerComponent,
  DoorComponent,
  FacingComponent,
  EquipmentComponent,
  InventoryComponent,
  ConsumableComponent,
  PickupComponent,
  Entity,
} from '../ecs/types'

export interface ToolCall {
  id: string
  function: { name: string; arguments: string }
}

export interface MistralResponse {
  toolCalls: ToolCall[]
  textContent: string
  stopReason: string
  modelId: string
  routingDecision?: any
}

interface ChatMessage {
  role: string
  content: string
  tool_calls?: unknown[]
  tool_call_id?: string
}

/** Max messages to keep in conversation history (not counting system/dynamic context). */
const MAX_HISTORY_MESSAGES = 20

export class MistralClient {
  private messages: ChatMessage[] = []

  /** Send a user message, including fresh world state in the system prompt. */
  async send(text: string, world: World): Promise<MistralResponse> {
    // Prune old history before adding new message — keep only recent turns
    this.pruneHistory()
    this.messages.push({ role: 'user', content: text })
    return this.callApi(world)
  }

  /** Send tool execution results back for the model's follow-up turn. */
  async sendToolResults(
    results: { tool_call_id: string; content: string }[],
  ): Promise<MistralResponse> {
    for (const r of results) {
      this.messages.push({
        role: 'tool',
        content: r.content,
        tool_call_id: r.tool_call_id,
      })
    }
    return this.callApi()
  }

  /** Clear all conversation history. Call between unrelated tasks. */
  clearHistory(): void {
    this.messages = []
  }

  private pruneHistory(): void {
    if (this.messages.length <= MAX_HISTORY_MESSAGES) return

    // Keep the most recent messages, dropping oldest non-tool messages
    // We must keep tool messages that are paired with their assistant tool_calls
    const keep = this.messages.slice(-MAX_HISTORY_MESSAGES)

    // If first kept message is a tool result, we lost its assistant context — drop it
    while (keep.length > 0 && keep[0].role === 'tool') {
      keep.shift()
    }

    this.messages = keep
  }

  private async callApi(world?: World): Promise<MistralResponse> {
    const body: {
      messages: ChatMessage[]
      tools: typeof MISTRAL_TOOLS
      systemPrompt?: string
      dynamicContext?: string
    } = {
      messages: this.messages,
      tools: MISTRAL_TOOLS,
    }
    if (world) {
      // Dynamic context: full game state snapshot sent per-turn
      body.dynamicContext = this.buildDynamicContext(world)
    }

    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Mistral API error ${res.status}: ${errorText}`)
    }

    const data = await res.json()

    // Handle the Mistral chat completions response format
    const choice = data.choices?.[0]?.message ?? data

    const toolCalls: ToolCall[] = (choice.tool_calls ?? []).map(
      (tc: {
        id: string
        function: { name: string; arguments: string | object }
      }) => ({
        id: tc.id,
        function: {
          name: tc.function.name,
          arguments:
            typeof tc.function.arguments === 'string'
              ? tc.function.arguments
              : JSON.stringify(tc.function.arguments),
        },
      }),
    )

    // Store the assistant's message for conversation continuity
    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: choice.content ?? '',
    }
    if (choice.tool_calls?.length) {
      assistantMsg.tool_calls = choice.tool_calls
    }
    this.messages.push(assistantMsg)

    return {
      toolCalls,
      textContent: choice.content ?? '',
      stopReason: data.choices?.[0]?.finish_reason ?? 'stop',
      modelId: data.modelId ?? data.model ?? 'unknown',
      routingDecision: data.routingDecision,
    }
  }

  /**
   * Build dynamic context sent per-turn. Contains current world state snapshot
   * so the AI always has an accurate, complete picture of the game.
   * Stable instructions (persona, guidelines) are managed server-side by AgentManager.
   */
  private buildDynamicContext(world: World): string {
    const sections: string[] = []

    // 1. Engine config
    sections.push(this.describeConfig())

    // 2. Layers
    sections.push(this.describeLayers(world))

    // 3. Entity list (grouped by layer)
    sections.push(this.describeEntities(world))

    // 4. Door network
    const doorSection = this.describeDoorNetwork(world)
    if (doorSection) sections.push(doorSection)

    // 5. Available assets (compact)
    sections.push(`## Available Sprites\n${ASSET_IDS.join(', ')}`)

    return sections.join('\n\n')
  }

  /** Game config: physics, player movement — things the AI needs to place entities correctly */
  private describeConfig(): string {
    const p = GAME_CONFIG.physics
    const pl = GAME_CONFIG.player
    return `## Engine Config
gravity=${p.gravity} killZoneY=${p.killZoneY} walkSpeed=${pl.walkSpeed} jumpVel=${pl.jumpVelocity} maxJumps=${pl.maxJumps} gridSize=${GAME_CONFIG.editor.gridSize}
Scale: player=32x32 tiles=32x32 trees=48x64 structures=64-128px`
  }

  /** All layers with their game mode, bounds, and background */
  private describeLayers(world: World): string {
    const lm = world.layerManager
    const lines = [`## Layers (active: ${lm.currentLayerId})`]

    for (const layer of lm.layers) {
      const active = layer.id === lm.currentLayerId ? ' [ACTIVE]' : ''
      const b = layer.bounds
      lines.push(
        `- "${layer.name}" id=${layer.id} mode=${layer.gameMode}${active} bounds=[${b.minX},${b.maxX}]x[${b.minY},${b.maxY}] topSolid=${b.topSolid}${layer.backgroundTileId ? ` bg=${layer.backgroundTileId}` : ''}`,
      )
    }

    return lines.join('\n')
  }

  /** All entities grouped by layer, with compact component summaries */
  private describeEntities(world: World): string {
    const entities = world.getAllEntities()
    if (entities.length === 0) return '## World State\nThe world is empty.'

    // Group by layer
    const byLayer = new Map<string, Entity[]>()
    for (const entity of entities) {
      const lc = entity.components.get('layer') as LayerComponent | undefined
      const layerId = lc?.layerId ?? 'default'
      if (!byLayer.has(layerId)) byLayer.set(layerId, [])
      byLayer.get(layerId)!.push(entity)
    }

    const lines = [`## World State (${entities.length} entities)`]

    // Hard cap: if > 80 entities total, summarize
    const summarize = entities.length > 80

    for (const [layerId, layerEntities] of byLayer) {
      lines.push(`\n### Layer: ${layerId} (${layerEntities.length} entities)`)

      const entitiesToShow = summarize
        ? layerEntities.slice(0, 40)
        : layerEntities

      for (const entity of entitiesToShow) {
        lines.push(this.describeEntity(entity, world))
      }

      if (summarize && layerEntities.length > 40) {
        lines.push(`  ... +${layerEntities.length - 40} more`)
      }
    }

    return lines.join('\n')
  }

  /** Single entity — compact one-liner with all active components */
  private describeEntity(entity: Entity, world: World): string {
    const parts: string[] = []

    // Position
    const pos = entity.components.get('position') as PositionComponent | undefined
    parts.push(pos ? `@(${Math.round(pos.x)},${Math.round(pos.y)})` : '@(?)')

    // Sprite
    const sprite = entity.components.get('sprite') as SpriteComponent | undefined
    if (sprite) {
      let s = sprite.assetId
      if (sprite.width !== 16 || sprite.height !== 16) {
        s += ` ${sprite.width}x${sprite.height}`
      }
      if (sprite.flipX) s += ' flipX'
      if (sprite.hueShift) s += ` hue=${sprite.hueShift}`
      parts.push(s)
    }

    // Physics
    const phys = entity.components.get('physics') as PhysicsComponent | undefined
    if (phys) {
      const flags: string[] = []
      if (phys.gravity) flags.push('grav')
      if (phys.solid) flags.push('solid')
      if (flags.length) parts.push(flags.join('+'))
    }

    // Health
    const hp = entity.components.get('health') as HealthComponent | undefined
    if (hp) {
      parts.push(`hp:${hp.hp}/${hp.maxHp}`)
    }

    // Facing
    const facing = entity.components.get('facing') as FacingComponent | undefined
    if (facing) {
      parts.push(`face:${facing.direction}`)
    }

    // Patrol
    const patrol = entity.components.get('patrol') as PatrolComponent | undefined
    if (patrol) {
      parts.push(`patrol:${patrol.waypoints.length}wp spd=${patrol.speed}${patrol.loop ? ' loop' : ''}`)
    }

    // Behavior rules
    const behavior = entity.components.get('behavior') as BehaviorComponent | undefined
    if (behavior && behavior.rules.length > 0) {
      const rules = behavior.rules
        .filter((r) => r.enabled)
        .map((r) => `${r.trigger}→${r.action}`)
      if (rules.length > 0) parts.push(`rules:[${rules.join('; ')}]`)
    }

    // Door
    const door = entity.components.get('door') as DoorComponent | undefined
    if (door) {
      if (door.destinationId) {
        const dest = world.getEntity(door.destinationId)
        parts.push(`door→"${dest?.name ?? door.destinationId}"${door.bidirectional ? ' bidi' : ''}`)
      } else {
        parts.push('door(unlinked)')
      }
    }

    // Equipment
    const equip = entity.components.get('equipment') as EquipmentComponent | undefined
    if (equip) {
      const slots: string[] = []
      if (equip.slots.weapon) slots.push(`wpn:${equip.slots.weapon.name}`)
      if (equip.slots.armor) slots.push(`arm:${equip.slots.armor.name}`)
      if (equip.slots.accessory) slots.push(`acc:${equip.slots.accessory.name}`)
      if (slots.length) parts.push(slots.join(' '))
    }

    // Inventory
    const inv = entity.components.get('inventory') as InventoryComponent | undefined
    if (inv) {
      const filled = inv.items.filter((i) => i !== null).length
      parts.push(`inv:${filled}/${inv.capacity}`)
    }

    // Consumable
    const cons = entity.components.get('consumable') as ConsumableComponent | undefined
    if (cons) {
      parts.push(`${cons.effect}=${cons.value}`)
    }

    // Pickup
    const pickup = entity.components.get('pickup') as PickupComponent | undefined
    if (pickup) {
      parts.push(`pickup:${pickup.itemDef.name}`)
    }

    return `- "${entity.name}" ${parts.join(' | ')}`
  }

  /** Summarize the door teleport network */
  private describeDoorNetwork(world: World): string | null {
    const entities = world.getAllEntities()
    const doors: { name: string; destName: string; bidi: boolean }[] = []

    for (const entity of entities) {
      const door = entity.components.get('door') as DoorComponent | undefined
      if (!door || !door.destinationId) continue

      // Avoid duplicating bidirectional pairs
      const dest = world.getEntity(door.destinationId)
      if (!dest) continue

      const alreadyListed = doors.some(
        (d) => d.name === dest.name && d.destName === entity.name,
      )
      if (alreadyListed) continue

      doors.push({
        name: entity.name,
        destName: dest.name,
        bidi: door.bidirectional,
      })
    }

    if (doors.length === 0) return null

    const lines = ['## Door Network']
    for (const d of doors) {
      lines.push(
        `- "${d.name}" ${d.bidi ? '<->' : '->'} "${d.destName}"`,
      )
    }
    return lines.join('\n')
  }
}
