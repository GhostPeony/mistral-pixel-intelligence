import type { World } from '../ecs/world'
import type { HealthComponent, PositionComponent, PhysicsComponent, SpriteComponent } from '../ecs/types'

export class HealthSystem {
  private onDeath: ((entityId: string, pos: { x: number; y: number }, assetId: string) => void) | null = null

  setOnEntityDeath(cb: typeof this.onDeath): void { this.onDeath = cb }

  update(world: World, dt: number): void {
    for (const entity of world.query('health')) {
      const health = entity.components.get('health') as HealthComponent

      // Tick invulnerability
      if (health.invulnerableTimer > 0) {
        health.invulnerableTimer = Math.max(0, health.invulnerableTimer - dt)
      }

      // Death and respawn
      if (health.hp <= 0 && health.deadTimer === 0) {
        // Fire death callback for loot drops
        if (this.onDeath) {
          const pos = entity.components.get('position') as PositionComponent | undefined
          const sprite = entity.components.get('sprite') as SpriteComponent | undefined
          if (pos && sprite) {
            this.onDeath(entity.id, { x: pos.x, y: pos.y }, sprite.assetId)
          }
        }
        health.deadTimer = health.respawnDelay || 1000
      }

      if (health.deadTimer > 0) {
        health.deadTimer = Math.max(0, health.deadTimer - dt)
        if (health.deadTimer === 0) {
          // Respawn
          health.hp = health.maxHp
          health.invulnerableTimer = 2000
          const pos = entity.components.get('position') as PositionComponent | undefined
          const phys = entity.components.get('physics') as PhysicsComponent | undefined
          if (pos) {
            pos.x = health.spawnX
            pos.y = health.spawnY
          }
          if (phys) {
            phys.velocityX = 0
            phys.velocityY = 0
          }
        }
      }
    }
  }

  applyDamage(world: World, entityId: string, amount: number): boolean {
    const health = world.getComponent(entityId, 'health') as HealthComponent | undefined
    if (!health || health.invulnerableTimer > 0 || health.deadTimer > 0) return false
    health.hp = Math.max(0, health.hp - amount)
    health.invulnerableTimer = 500
    return true
  }

  heal(world: World, entityId: string, amount: number): void {
    const health = world.getComponent(entityId, 'health') as HealthComponent | undefined
    if (!health) return
    health.hp = Math.min(health.maxHp, health.hp + amount)
  }
}
