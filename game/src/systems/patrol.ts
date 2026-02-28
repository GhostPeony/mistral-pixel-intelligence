import type { World } from '../ecs/world'
import type { PatrolComponent, PositionComponent, PhysicsComponent } from '../ecs/types'

export class PatrolSystem {
  update(world: World, _dt: number): void {
    for (const entity of world.query('patrol', 'position', 'physics')) {
      const patrol = entity.components.get('patrol') as PatrolComponent
      const pos = entity.components.get('position') as PositionComponent
      const phys = entity.components.get('physics') as PhysicsComponent

      if (patrol.waypoints.length === 0) continue

      const target = patrol.waypoints[patrol.currentIndex]
      const dx = target.x - pos.x
      const dy = target.y - pos.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 4) {
        // Reached waypoint
        if (patrol.loop) {
          patrol.currentIndex = (patrol.currentIndex + patrol.direction + patrol.waypoints.length) % patrol.waypoints.length
        } else {
          const nextIndex = patrol.currentIndex + patrol.direction
          if (nextIndex < 0 || nextIndex >= patrol.waypoints.length) {
            patrol.direction = (patrol.direction * -1) as 1 | -1
          }
          patrol.currentIndex = Math.max(0, Math.min(patrol.waypoints.length - 1, patrol.currentIndex + patrol.direction))
        }
      } else {
        // Move towards waypoint
        phys.velocityX = (dx / dist) * patrol.speed
        if (!phys.gravity) {
          phys.velocityY = (dy / dist) * patrol.speed
        }
      }
    }
  }
}
