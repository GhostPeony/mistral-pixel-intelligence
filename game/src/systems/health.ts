import type { World } from '../ecs/world'
import type { HealthComponent, PositionComponent, PhysicsComponent, SpriteComponent } from '../ecs/types'
import type { VFXSystem } from './vfx'
import { SPRITE_REGISTRY } from '../assets/sprites'

export class HealthSystem {
  private onDeath: ((entityId: string, pos: { x: number; y: number }, assetId: string) => void) | null = null
  private vfx: VFXSystem | null = null

  setOnEntityDeath(cb: typeof this.onDeath): void { this.onDeath = cb }
  setVFX(vfx: VFXSystem): void { this.vfx = vfx }

  update(world: World, dt: number): void {
    for (const entity of world.query('health')) {
      const health = entity.components.get('health') as HealthComponent

      // Tick invulnerability + flash
      if (health.invulnerableTimer > 0) {
        health.invulnerableTimer = Math.max(0, health.invulnerableTimer - dt)
        this.vfx?.setFlashing(entity.id, health.invulnerableTimer > 0)
      }

      // Death and respawn
      if (health.hp <= 0 && health.deadTimer === 0) {
        // Fire death callback for loot drops
        const pos = entity.components.get('position') as PositionComponent | undefined
        const sprite = entity.components.get('sprite') as SpriteComponent | undefined
        if (this.onDeath && pos && sprite) {
          this.onDeath(entity.id, { x: pos.x, y: pos.y }, sprite.assetId)
        }
        // Pixel death explosion VFX
        if (this.vfx && pos && sprite) {
          const spriteData = SPRITE_REGISTRY[sprite.assetId]
          if (spriteData) {
            this.vfx.addPixelExplosion(pos.x, pos.y, sprite.width, sprite.height, spriteData.pixels)
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
