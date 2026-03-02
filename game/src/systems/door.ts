import type { World } from '../ecs/world'
import type { DoorComponent, PositionComponent, PhysicsComponent, LayerComponent } from '../ecs/types'
import type { Collision } from './physics'
import type { LayerManager } from './layer-manager'
import type { InputSystem } from './input'

export class DoorSystem {
  private cooldowns = new Map<string, number>()
  private layerManager: LayerManager | null = null
  private _nearbyDoors = new Map<string, string>() // doorEntityId -> travelerEntityId
  controlledEntityId: string | null = null
  private inputSystem: InputSystem | null = null

  setLayerManager(lm: LayerManager): void { this.layerManager = lm }
  setInputSystem(input: InputSystem): void { this.inputSystem = input }

  /** Doors the controlled entity is currently overlapping (for rendering indicators) */
  getNearbyDoors(): Map<string, string> { return this._nearbyDoors }

  update(world: World, dt: number, overlaps: Collision[], input?: InputSystem): void {
    // Tick cooldowns
    for (const [key, cd] of this.cooldowns) {
      const next = cd - dt
      if (next <= 0) this.cooldowns.delete(key)
      else this.cooldowns.set(key, next)
    }

    // Reset nearby doors each frame
    this._nearbyDoors.clear()

    // Collect door overlaps, separating controlled vs NPC
    for (const { entityA, entityB } of overlaps) {
      this.processDoorOverlap(world, entityA, entityB, input)
      this.processDoorOverlap(world, entityB, entityA, input)
    }
  }

  private processDoorOverlap(world: World, traveler: string, doorEntity: string, input?: InputSystem): void {
    const door = world.getComponent(doorEntity, 'door') as DoorComponent | undefined
    if (!door || !door.destinationId) return

    // Only teleport entities with physics (not decorations)
    if (!world.getComponent(traveler, 'physics')) return

    const cooldownKey = `${traveler}_${doorEntity}`
    if (this.cooldowns.has(cooldownKey)) return

    // Controlled entity: track as nearby and require UP key press
    if (traveler === this.controlledEntityId) {
      this._nearbyDoors.set(doorEntity, traveler)
      if (!input || !(input.justPressed('ArrowUp') || input.justPressed('KeyW'))) return
    }

    this.teleport(world, traveler, doorEntity, door)
  }

  private teleport(world: World, traveler: string, doorEntity: string, door: DoorComponent): void {
    const destPos = world.getComponent(door.destinationId!, 'position') as PositionComponent | undefined
    if (!destPos) return

    const pos = world.getComponent(traveler, 'position') as PositionComponent | undefined
    const phys = world.getComponent(traveler, 'physics') as PhysicsComponent | undefined
    if (pos && phys) {
      pos.x = destPos.x
      pos.y = destPos.y - 32 // Appear above door
      phys.velocityX = 0
      phys.velocityY = 0
      this.cooldowns.set(`${traveler}_${doorEntity}`, 1000) // 1s cooldown
      // Also cooldown the destination door
      this.cooldowns.set(`${traveler}_${door.destinationId}`, 1000)

      // Layer transition: if destination door is on a different layer, transition
      if (this.layerManager && traveler === this.controlledEntityId) {
        const destEntity = world.getEntity(door.destinationId!)
        if (destEntity) {
          const destLayer = destEntity.components.get('layer') as LayerComponent | undefined
          const destLayerId = destLayer?.layerId ?? 'default'
          const travelerLayer = world.getComponent(traveler, 'layer') as LayerComponent | undefined
          const travelerLayerId = travelerLayer?.layerId ?? 'default'
          if (destLayerId !== travelerLayerId) {
            this.layerManager.transitionToLayer(destLayerId)
            if (travelerLayer) {
              travelerLayer.layerId = destLayerId
            } else {
              world.addComponent(traveler, { type: 'layer', layerId: destLayerId })
            }

            // Sync input mode and physics to match destination layer
            const destGameMode = this.layerManager.getGameModeForLayer(destLayerId)
            this.inputSystem?.setGameMode(destGameMode)
            if (destGameMode === 'topdown') {
              phys.gravity = false
              phys.velocityY = 0
            } else {
              phys.gravity = true
            }
          }
        }
      }
    }
  }
}
