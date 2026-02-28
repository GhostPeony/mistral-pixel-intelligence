import type { World } from '../ecs/world'
import type { PhysicsComponent, FacingComponent } from '../ecs/types'

export class FacingSystem {
  update(world: World): void {
    for (const entity of world.query('physics', 'facing')) {
      const phys = entity.components.get('physics') as PhysicsComponent
      const facing = entity.components.get('facing') as FacingComponent

      if (phys.velocityX > 10) facing.direction = 'right'
      else if (phys.velocityX < -10) facing.direction = 'left'
    }
  }
}
