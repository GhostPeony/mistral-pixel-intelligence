import type { World } from '../ecs/world'
import type { MoveToComponent, PositionComponent, PhysicsComponent, FacingComponent } from '../ecs/types'

export class MoveToSystem {
  update(world: World, dt: number): void {
    const entities = world.query('moveTo', 'position', 'physics')
    for (const entity of entities) {
      const moveTo = entity.components.get('moveTo') as MoveToComponent
      const pos = entity.components.get('position') as PositionComponent
      const phys = entity.components.get('physics') as PhysicsComponent
      const facing = entity.components.get('facing') as FacingComponent | undefined

      const dx = moveTo.targetX - pos.x
      const dy = moveTo.targetY - pos.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      // Arrived
      if (dist < 5) {
        phys.velocityX = 0
        if (!phys.gravity) phys.velocityY = 0
        world.removeComponent(entity.id, 'moveTo')
        continue
      }

      // Steer toward target
      const nx = dx / dist
      const ny = dy / dist
      phys.velocityX = nx * moveTo.speed
      if (!phys.gravity) {
        phys.velocityY = ny * moveTo.speed
      }

      // Update facing based on dominant axis
      if (facing) {
        if (Math.abs(dx) >= Math.abs(dy)) {
          facing.direction = dx > 0 ? 'right' : 'left'
        } else {
          facing.direction = dy > 0 ? 'down' : 'up'
        }
      }
    }
  }
}
