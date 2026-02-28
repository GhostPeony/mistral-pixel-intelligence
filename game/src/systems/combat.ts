import type { World } from '../ecs/world'
import type {
  EquipmentComponent, PositionComponent, SpriteComponent,
  PhysicsComponent, FacingComponent, PickupComponent, ConsumableComponent
} from '../ecs/types'
import { HealthSystem } from './health'
import type { Collision } from './physics'

export class CombatSystem {
  private attackCooldowns = new Map<string, number>()

  constructor(private healthSystem: HealthSystem) {}

  update(world: World, dt: number, overlaps: Collision[]): void {
    // Tick cooldowns
    for (const [id, cd] of this.attackCooldowns) {
      const next = cd - dt
      if (next <= 0) this.attackCooldowns.delete(id)
      else this.attackCooldowns.set(id, next)
    }

    // Check overlap-based interactions
    for (const { entityA, entityB } of overlaps) {
      this.checkPickup(world, entityA, entityB)
      this.checkPickup(world, entityB, entityA)
      this.checkConsumable(world, entityA, entityB)
      this.checkConsumable(world, entityB, entityA)
    }
  }

  tryAttack(world: World, attackerId: string): void {
    if (this.attackCooldowns.has(attackerId)) return

    const equip = world.getComponent(attackerId, 'equipment') as EquipmentComponent | undefined
    const weapon = equip?.slots.weapon
    if (!weapon) return

    const pos = world.getComponent(attackerId, 'position') as PositionComponent | undefined
    const sprite = world.getComponent(attackerId, 'sprite') as SpriteComponent | undefined
    const facing = world.getComponent(attackerId, 'facing') as FacingComponent | undefined
    if (!pos || !sprite) return

    const range = weapon.range ?? 40
    const damage = weapon.damage ?? 10
    const cooldown = weapon.cooldown ?? 500

    this.attackCooldowns.set(attackerId, cooldown)

    if (weapon.kind === 'melee') {
      // Find entities in melee range
      const dir = facing?.direction ?? 'right'
      const attackX = dir === 'right' ? pos.x + sprite.width : pos.x - range
      const attackY = pos.y

      for (const target of world.query('position', 'sprite', 'health')) {
        if (target.id === attackerId) continue
        const tPos = target.components.get('position') as PositionComponent
        const tSprite = target.components.get('sprite') as SpriteComponent
        if (
          attackX < tPos.x + tSprite.width &&
          attackX + range > tPos.x &&
          attackY < tPos.y + tSprite.height &&
          attackY + sprite.height > tPos.y
        ) {
          this.healthSystem.applyDamage(world, target.id, damage)
        }
      }
    } else if (weapon.kind === 'ranged' && weapon.projectileAssetId) {
      // Spawn projectile
      const dir = facing?.direction ?? 'right'
      const projId = world.createEntity('projectile')
      world.addComponent(projId, {
        type: 'position',
        x: dir === 'right' ? pos.x + sprite.width : pos.x - 8,
        y: pos.y + sprite.height / 2 - 4,
      })
      world.addComponent(projId, {
        type: 'sprite', assetId: weapon.projectileAssetId, width: 8, height: 8,
      })
      world.addComponent(projId, {
        type: 'physics',
        velocityX: dir === 'right' ? 400 : -400,
        velocityY: 0,
        gravity: false,
        solid: false,
      })
    }
  }

  private checkPickup(world: World, collector: string, item: string): void {
    const pickup = world.getComponent(item, 'pickup') as PickupComponent | undefined
    const equip = world.getComponent(collector, 'equipment') as EquipmentComponent | undefined
    if (!pickup || !equip) return

    const slot = pickup.itemDef.kind === 'melee' || pickup.itemDef.kind === 'ranged'
      ? 'weapon'
      : pickup.itemDef.kind === 'shield'
      ? 'armor'
      : 'accessory'

    equip.slots[slot] = pickup.itemDef
    world.removeEntity(item)
  }

  private checkConsumable(world: World, consumer: string, item: string): void {
    const consumable = world.getComponent(item, 'consumable') as ConsumableComponent | undefined
    if (!consumable) return
    if (!world.getComponent(consumer, 'health')) return

    switch (consumable.effect) {
      case 'heal':
        this.healthSystem.heal(world, consumer, consumable.value)
        break
      // speed, ammo, score can be added later
    }
    world.removeEntity(item)
  }
}
