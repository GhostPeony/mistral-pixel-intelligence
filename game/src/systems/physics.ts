import type { World } from '../ecs/world'
import type { PositionComponent, PhysicsComponent, SpriteComponent, HealthComponent, LayerComponent } from '../ecs/types'

export interface Collision {
  entityA: string
  entityB: string
}

export class PhysicsSystem {
  private gravity = 800
  private lastOverlaps: Collision[] = []

  setGravity(value: number): void { this.gravity = value }
  getGravity(): number { return this.gravity }

  getLastOverlaps(): Collision[] {
    return this.lastOverlaps
  }

  private getEntityLayerId(entity: { components: Map<string, any> }): string {
    const lc = entity.components.get('layer') as LayerComponent | undefined
    return lc?.layerId ?? 'default'
  }

  update(world: World, dt: number): void {
    const dtSeconds = dt / 1000
    const entities = world.query('position', 'physics')

    // 1. Integrate velocity
    for (const entity of entities) {
      const pos = entity.components.get('position') as PositionComponent
      const phys = entity.components.get('physics') as PhysicsComponent

      if (phys.gravity) {
        phys.velocityY += this.gravity * dtSeconds
      }

      pos.x += phys.velocityX * dtSeconds
      pos.y += phys.velocityY * dtSeconds
    }

    // 2. Boundary enforcement (kill zone at y > 2000)
    const withSpriteBounds = world.query('position', 'physics', 'sprite')
    for (const entity of withSpriteBounds) {
      const pos = entity.components.get('position') as PositionComponent
      const phys = entity.components.get('physics') as PhysicsComponent
      const sprite = entity.components.get('sprite') as SpriteComponent

      if (pos.y > 2000) {
        const health = entity.components.get('health') as HealthComponent | undefined
        if (health) {
          pos.x = health.spawnX
          pos.y = health.spawnY
          phys.velocityX = 0
          phys.velocityY = 0
          health.hp = health.maxHp
          health.invulnerableTimer = 2000
        } else {
          world.removeEntity(entity.id)
          continue
        }
      }
    }

    // 3. Resolve solid-solid collisions (same layer only)
    const withSprite = world.query('position', 'sprite', 'physics')
    const solids = withSprite.filter(e => (e.components.get('physics') as PhysicsComponent).solid)

    for (let i = 0; i < solids.length; i++) {
      for (let j = i + 1; j < solids.length; j++) {
        const a = solids[i]
        const b = solids[j]

        if (this.getEntityLayerId(a) !== this.getEntityLayerId(b)) continue

        const aPos = a.components.get('position') as PositionComponent
        const aSprite = a.components.get('sprite') as SpriteComponent
        const aPhys = a.components.get('physics') as PhysicsComponent
        const bPos = b.components.get('position') as PositionComponent
        const bSprite = b.components.get('sprite') as SpriteComponent
        const bPhys = b.components.get('physics') as PhysicsComponent

        const overlapX = Math.min(
          aPos.x + aSprite.width - bPos.x,
          bPos.x + bSprite.width - aPos.x,
        )
        const overlapY = Math.min(
          aPos.y + aSprite.height - bPos.y,
          bPos.y + bSprite.height - aPos.y,
        )

        if (overlapX <= 0 || overlapY <= 0) continue

        if (overlapX < overlapY) {
          const sign = (aPos.x + aSprite.width / 2) < (bPos.x + bSprite.width / 2) ? -1 : 1
          const aMoving = aPhys.velocityX !== 0
          const bMoving = bPhys.velocityX !== 0

          if (aMoving && !bMoving) {
            aPos.x += sign * overlapX
            aPhys.velocityX = 0
          } else if (bMoving && !aMoving) {
            bPos.x -= sign * overlapX
            bPhys.velocityX = 0
          } else {
            aPos.x += sign * (overlapX / 2)
            bPos.x -= sign * (overlapX / 2)
            aPhys.velocityX = 0
            bPhys.velocityX = 0
          }
        } else {
          const sign = (aPos.y + aSprite.height / 2) < (bPos.y + bSprite.height / 2) ? -1 : 1
          const aMoving = aPhys.velocityY !== 0
          const bMoving = bPhys.velocityY !== 0

          if (aMoving && !bMoving) {
            aPos.y += sign * overlapY
            aPhys.velocityY = 0
          } else if (bMoving && !aMoving) {
            bPos.y -= sign * overlapY
            bPhys.velocityY = 0
          } else {
            aPos.y += sign * (overlapY / 2)
            bPos.y -= sign * (overlapY / 2)
            aPhys.velocityY = 0
            bPhys.velocityY = 0
          }
        }
      }
    }

    // 4. Detect all overlaps for behavior triggers
    const overlaps: Collision[] = []
    for (let i = 0; i < withSprite.length; i++) {
      for (let j = i + 1; j < withSprite.length; j++) {
        const a = withSprite[i]
        const b = withSprite[j]

        if (this.getEntityLayerId(a) !== this.getEntityLayerId(b)) continue

        const aPos = a.components.get('position') as PositionComponent
        const aSprite = a.components.get('sprite') as SpriteComponent
        const bPos = b.components.get('position') as PositionComponent
        const bSprite = b.components.get('sprite') as SpriteComponent

        if (
          aPos.x < bPos.x + bSprite.width &&
          aPos.x + aSprite.width > bPos.x &&
          aPos.y < bPos.y + bSprite.height &&
          aPos.y + aSprite.height > bPos.y
        ) {
          overlaps.push({ entityA: a.id, entityB: b.id })
        }
      }
    }
    this.lastOverlaps = overlaps
  }
}
