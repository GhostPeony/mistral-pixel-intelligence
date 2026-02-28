import type { World } from '../ecs/world'
import type { DoorComponent, PositionComponent, PhysicsComponent } from '../ecs/types'
import type { Collision } from './physics'

export class DoorSystem {
  private cooldowns = new Map<string, number>()

  update(world: World, dt: number, overlaps: Collision[]): void {
    // Tick cooldowns
    for (const [key, cd] of this.cooldowns) {
      const next = cd - dt
      if (next <= 0) this.cooldowns.delete(key)
      else this.cooldowns.set(key, next)
    }

    for (const { entityA, entityB } of overlaps) {
      this.tryTeleport(world, entityA, entityB)
      this.tryTeleport(world, entityB, entityA)
    }
  }

  private tryTeleport(world: World, traveler: string, doorEntity: string): void {
    const door = world.getComponent(doorEntity, 'door') as DoorComponent | undefined
    if (!door || !door.destinationId) return

    // Only teleport entities with physics (not decorations)
    if (!world.getComponent(traveler, 'physics')) return

    const cooldownKey = `${traveler}_${doorEntity}`
    if (this.cooldowns.has(cooldownKey)) return

    const destPos = world.getComponent(door.destinationId, 'position') as PositionComponent | undefined
    if (!destPos) return

    const pos = world.getComponent(traveler, 'position') as PositionComponent | undefined
    const phys = world.getComponent(traveler, 'physics') as PhysicsComponent | undefined
    if (pos && phys) {
      pos.x = destPos.x
      pos.y = destPos.y - 32 // Appear above door
      phys.velocityX = 0
      phys.velocityY = 0
      this.cooldowns.set(cooldownKey, 1000) // 1s cooldown
      // Also cooldown the destination door
      this.cooldowns.set(`${traveler}_${door.destinationId}`, 1000)
    }
  }
}
