import type { World } from '../ecs/world'
import type {
  BehaviorComponent, PositionComponent,
  PhysicsComponent, HealthComponent, Entity,
  LayerComponent
} from '../ecs/types'
import type { Collision } from './physics'
import { HealthSystem } from './health'

function getEntityLayer(entity: Entity): string {
  const lc = entity.components.get('layer') as LayerComponent | undefined
  return lc?.layerId ?? 'default'
}

interface BehaviorContext {
  entity: Entity
  world: World
  overlaps: Collision[]
  dt: number
}

export class BehaviorSystem {
  private intervalTimers = new Map<string, number>()
  private voiceCooldowns = new Map<string, number>()
  private onSayVoiceCallback: ((entityId: string, npcType: string) => void) | null = null

  constructor(private healthSystem: HealthSystem) {}

  setOnSayVoice(callback: (entityId: string, npcType: string) => void): void {
    this.onSayVoiceCallback = callback
  }

  setVoiceCooldown(entityId: string, ms: number): void {
    this.voiceCooldowns.set(entityId, ms)
  }

  update(world: World, dt: number, overlaps: Collision[]): void {
    // Tick down voice cooldowns
    for (const [key, remaining] of this.voiceCooldowns) {
      const next = remaining - dt
      if (next <= 0) this.voiceCooldowns.delete(key)
      else this.voiceCooldowns.set(key, next)
    }

    for (const entity of world.query('behavior')) {
      const behavior = entity.components.get('behavior') as BehaviorComponent
      const ctx: BehaviorContext = { entity, world, overlaps, dt }

      for (const rule of behavior.rules) {
        if (!rule.enabled) continue
        if (this.evaluateTrigger(rule.trigger, ctx)) {
          this.executeAction(rule.action, ctx)
        }
      }
    }
  }

  private evaluateTrigger(trigger: string, ctx: BehaviorContext): boolean {
    const parts = trigger.split(' ')
    const type = parts[0]

    switch (type) {
      case 'on_collision': {
        const targetName = parts.slice(1).join(' ')
        return ctx.overlaps.some(o => {
          const otherId = o.entityA === ctx.entity.id ? o.entityB : o.entityB === ctx.entity.id ? o.entityA : null
          if (!otherId) return false
          const other = ctx.world.getEntity(otherId)
          return other && (other.name === targetName || targetName === 'any' || targetName === 'player' && other.name === 'hero')
        })
      }
      case 'on_proximity': {
        const distance = parseFloat(parts[1]) || 100
        const pos = ctx.entity.components.get('position') as PositionComponent | undefined
        if (!pos) return false
        const myLayer = getEntityLayer(ctx.entity)
        for (const other of ctx.world.query('position')) {
          if (other.id === ctx.entity.id) continue
          if (other.name !== 'hero') continue
          if (getEntityLayer(other) !== myLayer) continue
          const oPos = other.components.get('position') as PositionComponent
          const dx = pos.x - oPos.x
          const dy = pos.y - oPos.y
          if (Math.sqrt(dx * dx + dy * dy) < distance) return true
        }
        return false
      }
      case 'on_interval': {
        const ms = parseFloat(parts[1]) || 1000
        const key = `${ctx.entity.id}_${trigger}`
        const timer = (this.intervalTimers.get(key) ?? 0) + ctx.dt
        if (timer >= ms) {
          this.intervalTimers.set(key, 0)
          return true
        }
        this.intervalTimers.set(key, timer)
        return false
      }
      case 'always':
        return true
      case 'on_low_health': {
        const health = ctx.entity.components.get('health') as HealthComponent | undefined
        return !!health && health.hp < health.maxHp * 0.3
      }
      default:
        return false
    }
  }

  private executeAction(action: string, ctx: BehaviorContext): void {
    const parts = action.split(' ')
    const type = parts[0]

    switch (type) {
      case 'hurt': {
        const target = parts[1] // 'other' or 'self'
        const amount = parseFloat(parts[2]) || 10
        if (target === 'self') {
          this.healthSystem.applyDamage(ctx.world, ctx.entity.id, amount)
        } else {
          // Hurt the collision partner
          for (const o of ctx.overlaps) {
            const otherId = o.entityA === ctx.entity.id ? o.entityB : o.entityB === ctx.entity.id ? o.entityA : null
            if (otherId) this.healthSystem.applyDamage(ctx.world, otherId, amount)
          }
        }
        break
      }
      case 'move_towards': {
        const targetName = parts[1] || 'player'
        const speed = parseFloat(parts[2]) || 80
        const pos = ctx.entity.components.get('position') as PositionComponent | undefined
        const phys = ctx.entity.components.get('physics') as PhysicsComponent | undefined
        if (!pos || !phys) break

        const myLayer = getEntityLayer(ctx.entity)
        let target: Entity | undefined
        if (targetName === 'player') {
          target = ctx.world.getAllEntities().find(e => e.name === 'hero' && getEntityLayer(e) === myLayer)
        } else {
          target = ctx.world.getAllEntities().find(e => e.name === targetName && getEntityLayer(e) === myLayer)
        }

        if (target) {
          const tPos = target.components.get('position') as PositionComponent | undefined
          if (tPos) {
            const dx = tPos.x - pos.x
            const dist = Math.abs(dx)
            if (dist > 4) {
              phys.velocityX = (dx > 0 ? 1 : -1) * speed
            }
          }
        }
        break
      }
      case 'flee_from': {
        const speed = parseFloat(parts[2]) || 100
        const pos = ctx.entity.components.get('position') as PositionComponent | undefined
        const phys = ctx.entity.components.get('physics') as PhysicsComponent | undefined
        if (!pos || !phys) break
        const myLayer = getEntityLayer(ctx.entity)
        const hero = ctx.world.getAllEntities().find(e => e.name === 'hero' && getEntityLayer(e) === myLayer)
        if (hero) {
          const hPos = hero.components.get('position') as PositionComponent | undefined
          if (hPos) {
            phys.velocityX = pos.x > hPos.x ? speed : -speed
          }
        }
        break
      }
      case 'say': {
        // Speech bubble (visual only -- renderer would display this)
        const text = parts.slice(1).join(' ')
        // Store on entity for renderer to pick up
        ;(ctx.entity as any)._speechBubble = { text, timer: 3000 }
        break
      }
      case 'say_voice': {
        const npcType = parts[1] || ''
        if (this.voiceCooldowns.has(ctx.entity.id)) break
        if (this.onSayVoiceCallback) {
          this.onSayVoiceCallback(ctx.entity.id, npcType)
        }
        break
      }
      case 'destroy': {
        const target = parts[1]
        if (target === 'self') {
          ctx.world.removeEntity(ctx.entity.id)
        }
        break
      }
      case 'teleport': {
        const x = parseFloat(parts[1]) || 0
        const y = parseFloat(parts[2]) || 0
        const pos = ctx.entity.components.get('position') as PositionComponent | undefined
        if (pos) {
          pos.x = x
          pos.y = y
        }
        break
      }
      case 'set_physics': {
        const prop = parts[1]
        const value = parts[2]
        const phys = ctx.entity.components.get('physics') as PhysicsComponent | undefined
        if (phys && prop === 'gravity') {
          phys.gravity = value === 'true'
        }
        break
      }
    }
  }
}
