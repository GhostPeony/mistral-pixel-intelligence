import type { World } from '../ecs/world'
import type {
  EquipmentComponent, PositionComponent, SpriteComponent,
  PhysicsComponent, FacingComponent, PickupComponent, ConsumableComponent,
  InventoryComponent, LayerComponent, ItemEffect, HealthComponent,
  ChestComponent, ChestLootEntry,
} from '../ecs/types'
import { HealthSystem } from './health'
import { InputSystem } from './input'
import { LootTableManager } from '../data/loot-tables'
import type { VFXSystem } from './vfx'
import type { Collision } from './physics'

/** Collect all active item effects from a entity's equipment slots. */
function getEquippedEffects(world: World, entityId: string): ItemEffect[] {
  const equip = world.getComponent(entityId, 'equipment') as EquipmentComponent | undefined
  if (!equip) return []
  const effects: ItemEffect[] = []
  for (const slot of [equip.slots.weapon, equip.slots.armor, equip.slots.accessory]) {
    if (slot?.effect) effects.push(slot.effect)
  }
  return effects
}

/** Get total crit boost from passive effects. */
function getEquipCritBoost(world: World, entityId: string): number {
  let boost = 0
  for (const eff of getEquippedEffects(world, entityId)) {
    if (eff.type === 'crit_boost') boost += eff.value
  }
  return boost
}

/** Get total dodge chance from passive effects. */
function getEquipDodgeChance(world: World, entityId: string): number {
  let dodge = 0
  for (const eff of getEquippedEffects(world, entityId)) {
    if (eff.type === 'dodge') dodge += eff.value
  }
  return dodge
}

/** Get speed multiplier from equipped effects. */
export function getEquipSpeedMultiplier(world: World, entityId: string): number {
  let mult = 1
  for (const eff of getEquippedEffects(world, entityId)) {
    if (eff.type === 'speed_boost') mult += eff.value
  }
  return mult
}

interface RespawnEntry {
  x: number
  y: number
  assetId: string
  width: number
  height: number
  layerId: string
  pickup?: PickupComponent
  consumable?: ConsumableComponent
  timer: number
}

interface PoisonDot {
  targetId: string
  dps: number       // damage per second
  remaining: number // ms remaining
}

export class CombatSystem {
  private attackCooldowns = new Map<string, { remaining: number; max: number }>()
  private controlledEntityId: string | null = null
  private respawnQueue: RespawnEntry[] = []
  private vfx: VFXSystem | null = null
  private poisonDots: PoisonDot[] = []
  private poisonTickAccumulators = new Map<string, number>()

  constructor(
    private healthSystem: HealthSystem,
    private inputSystem: InputSystem,
    private lootTables: LootTableManager,
  ) {}

  setVFX(vfx: VFXSystem): void { this.vfx = vfx }

  getCooldownFraction(entityId: string): number {
    const cd = this.attackCooldowns.get(entityId)
    if (!cd) return 0
    return cd.remaining / cd.max
  }

  setControlledEntity(id: string | null): void {
    this.controlledEntityId = id
  }

  update(world: World, dt: number, overlaps: Collision[]): void {
    // Tick cooldowns
    for (const [id, cd] of this.attackCooldowns) {
      cd.remaining -= dt
      if (cd.remaining <= 0) this.attackCooldowns.delete(id)
    }

    // Detect nearby pickups for "Press F" prompt
    const nearbyPickups: { entityId: string; x: number; y: number; width: number }[] = []
    if (this.controlledEntityId) {
      for (const { entityA, entityB } of overlaps) {
        const pickupEntityId =
          entityA === this.controlledEntityId ? entityB :
          entityB === this.controlledEntityId ? entityA : null
        if (pickupEntityId && world.getComponent(pickupEntityId, 'pickup')) {
          const pos = world.getComponent(pickupEntityId, 'position') as PositionComponent | undefined
          const spr = world.getComponent(pickupEntityId, 'sprite') as SpriteComponent | undefined
          if (pos && spr) {
            nearbyPickups.push({ entityId: pickupEntityId, x: pos.x, y: pos.y, width: spr.width })
          }
        }
      }
    }
    this.vfx?.setPickupPrompts(nearbyPickups)

    // F-key pickup: collect the first overlapping pickup
    if (this.controlledEntityId && this.inputSystem.justPressed('KeyF') && nearbyPickups.length > 0) {
      for (const { entityA, entityB } of overlaps) {
        if (entityA === this.controlledEntityId) {
          if (this.collectPickup(world, entityA, entityB)) break
        } else if (entityB === this.controlledEntityId) {
          if (this.collectPickup(world, entityB, entityA)) break
        }
      }
    }

    // Detect nearby unopened chests for "[E] Open" prompt
    const nearbyChests: { entityId: string; x: number; y: number; width: number }[] = []
    if (this.controlledEntityId) {
      for (const { entityA, entityB } of overlaps) {
        const chestEntityId =
          entityA === this.controlledEntityId ? entityB :
          entityB === this.controlledEntityId ? entityA : null
        if (chestEntityId) {
          const chest = world.getComponent(chestEntityId, 'chest') as ChestComponent | undefined
          if (chest && !chest.opened) {
            const pos = world.getComponent(chestEntityId, 'position') as PositionComponent | undefined
            const spr = world.getComponent(chestEntityId, 'sprite') as SpriteComponent | undefined
            if (pos && spr) {
              nearbyChests.push({ entityId: chestEntityId, x: pos.x, y: pos.y, width: spr.width })
            }
          }
        }
      }
    }
    this.vfx?.setChestPrompts(nearbyChests)

    // E-key: open chest (takes priority over attack)
    if (this.controlledEntityId && this.inputSystem.justPressed('KeyE') && nearbyChests.length > 0) {
      const target = nearbyChests[0]
      const chest = world.getComponent(target.entityId, 'chest') as ChestComponent
      const chestSprite = world.getComponent(target.entityId, 'sprite') as SpriteComponent
      const chestLayer = world.getComponent(target.entityId, 'layer') as LayerComponent | undefined
      const layerId = chestLayer?.layerId ?? 'default'

      // Stop hero movement during chest interaction
      const heroPhys = world.getComponent(this.controlledEntityId, 'physics') as PhysicsComponent | undefined
      if (heroPhys) {
        heroPhys.velocityX = 0
        heroPhys.velocityY = 0
      }

      chest.opened = true
      chestSprite.assetId = 'deco_chest_open'

      for (const entry of chest.loot) {
        this.spawnChestLoot(world, target.x, target.y, entry, layerId)
      }

      this.vfx?.addBurst(target.x + target.width / 2, target.y)
      this.vfx?.addToast('Chest opened!')
    }
    // E-key attack (only if no chest was opened)
    else if (this.controlledEntityId && this.inputSystem.justPressed('KeyE')) {
      this.tryAttack(world, this.controlledEntityId)
    }

    // Auto-apply consumables on overlap (any entity with health)
    for (const { entityA, entityB } of overlaps) {
      this.checkConsumable(world, entityA, entityB)
      this.checkConsumable(world, entityB, entityA)
    }

    // Tick respawn timers
    for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
      const entry = this.respawnQueue[i]
      entry.timer -= dt
      if (entry.timer <= 0) {
        this.respawnEntity(world, entry)
        this.respawnQueue.splice(i, 1)
      }
    }

    // Tick poison DOTs
    for (let i = this.poisonDots.length - 1; i >= 0; i--) {
      const dot = this.poisonDots[i]
      dot.remaining -= dt
      if (dot.remaining <= 0) {
        this.poisonDots.splice(i, 1)
        this.poisonTickAccumulators.delete(dot.targetId)
        continue
      }
      // Accumulate and tick once per second
      const acc = (this.poisonTickAccumulators.get(dot.targetId) ?? 0) + dt
      if (acc >= 1000) {
        this.poisonTickAccumulators.set(dot.targetId, acc - 1000)
        const hit = this.healthSystem.applyDamage(world, dot.targetId, dot.dps)
        if (hit) {
          const tPos = world.getComponent(dot.targetId, 'position') as PositionComponent | undefined
          const tSpr = world.getComponent(dot.targetId, 'sprite') as SpriteComponent | undefined
          if (tPos && tSpr) {
            this.vfx?.addDamageNumber(tPos.x + tSpr.width / 2, tPos.y, dot.dps)
          }
        }
      } else {
        this.poisonTickAccumulators.set(dot.targetId, acc)
      }
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
    const baseDamage = weapon.damage ?? 10
    const cooldown = weapon.cooldown ?? 500

    this.attackCooldowns.set(attackerId, { remaining: cooldown, max: cooldown })

    // Calculate final damage with bonus + crit
    let finalDamage = baseDamage
    if (weapon.damageBonus) finalDamage += weapon.damageBonus

    // Fire damage bonus from effects
    let fireDmg = 0
    for (const eff of getEquippedEffects(world, attackerId)) {
      if (eff.type === 'fire_damage') fireDmg += eff.value
    }
    finalDamage += fireDmg

    // Crit calculation
    let isCrit = false
    const totalCrit = (weapon.critChance ?? 0) + getEquipCritBoost(world, attackerId)
    if (totalCrit > 0 && Math.random() < totalCrit) {
      finalDamage = Math.round(finalDamage * 1.5)
      isCrit = true
    }

    // Lifesteal percentage from effects
    let lifestealPct = 0
    for (const eff of getEquippedEffects(world, attackerId)) {
      if (eff.type === 'lifesteal') lifestealPct += eff.value
    }

    // Poison from effects
    let poisonDps = 0
    for (const eff of getEquippedEffects(world, attackerId)) {
      if (eff.type === 'poison') poisonDps += eff.value
    }

    if (weapon.kind === 'melee') {
      const dir = facing?.direction ?? 'right'
      const attackX = dir === 'right' ? pos.x + sprite.width : pos.x - range
      const attackY = pos.y

      // VFX: slash arc + weapon swing
      const arcX = dir === 'right' ? pos.x + sprite.width : pos.x
      const arcY = pos.y + sprite.height / 2
      this.vfx?.addSlashArc(arcX, arcY, dir === 'right' ? 'right' : 'left', range)
      this.vfx?.addWeaponSwing(attackerId, dir === 'right' ? 'right' : 'left')

      // Get attacker's layer for filtering
      const attackerLayer = (world.getComponent(attackerId, 'layer') as LayerComponent | undefined)?.layerId ?? 'default'

      for (const target of world.query('position', 'sprite', 'health')) {
        if (target.id === attackerId) continue
        // Only hit targets on the same layer
        const targetLayerComp = target.components.get('layer') as LayerComponent | undefined
        const targetLayer = targetLayerComp?.layerId ?? 'default'
        if (targetLayer !== attackerLayer) continue
        const tPos = target.components.get('position') as PositionComponent
        const tSprite = target.components.get('sprite') as SpriteComponent
        if (
          attackX < tPos.x + tSprite.width &&
          attackX + range > tPos.x &&
          attackY < tPos.y + tSprite.height &&
          attackY + sprite.height > tPos.y
        ) {
          this.applyAttackDamage(world, attackerId, target.id, finalDamage, isCrit, lifestealPct, poisonDps, tPos, tSprite)
        }
      }
    } else if (weapon.kind === 'ranged' && weapon.projectileAssetId) {
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

  /** Apply damage to a target with defense, dodge, lifesteal, thorns, and poison. */
  private applyAttackDamage(
    world: World, attackerId: string, targetId: string,
    rawDamage: number, isCrit: boolean, lifestealPct: number, poisonDps: number,
    tPos: PositionComponent, tSprite: SpriteComponent,
  ): void {
    // Dodge check on defender
    const dodgeChance = getEquipDodgeChance(world, targetId)
    if (dodgeChance > 0 && Math.random() < dodgeChance) {
      this.vfx?.addMissText(tPos.x + tSprite.width / 2, tPos.y)
      return
    }

    // Defense reduction from shield
    const defenderEquip = world.getComponent(targetId, 'equipment') as EquipmentComponent | undefined
    const shield = defenderEquip?.slots.armor
    const defense = shield?.defense ?? 0
    const reducedDamage = Math.max(1, rawDamage - defense)

    const hit = this.healthSystem.applyDamage(world, targetId, reducedDamage)
    if (hit) {
      if (isCrit) {
        this.vfx?.addCritNumber(tPos.x + tSprite.width / 2, tPos.y, reducedDamage)
      } else {
        this.vfx?.addDamageNumber(tPos.x + tSprite.width / 2, tPos.y, reducedDamage)
      }

      // Lifesteal
      if (lifestealPct > 0) {
        const healAmount = Math.max(1, Math.round(reducedDamage * lifestealPct))
        this.healthSystem.heal(world, attackerId, healAmount)
        const aPos = world.getComponent(attackerId, 'position') as PositionComponent | undefined
        const aSpr = world.getComponent(attackerId, 'sprite') as SpriteComponent | undefined
        if (aPos && aSpr) {
          this.vfx?.addHealNumber(aPos.x + aSpr.width / 2, aPos.y, healAmount)
        }
      }

      // Poison DOT
      if (poisonDps > 0) {
        // Remove existing poison on this target before applying new one
        this.poisonDots = this.poisonDots.filter(d => d.targetId !== targetId)
        this.poisonDots.push({ targetId, dps: poisonDps, remaining: 3000 })
        this.poisonTickAccumulators.set(targetId, 0)
      }

      // Thorns: reflect damage back to attacker
      let thornsDmg = 0
      for (const eff of getEquippedEffects(world, targetId)) {
        if (eff.type === 'thorns') thornsDmg += eff.value
      }
      if (thornsDmg > 0) {
        this.healthSystem.applyDamage(world, attackerId, thornsDmg)
        const aPos = world.getComponent(attackerId, 'position') as PositionComponent | undefined
        const aSpr = world.getComponent(attackerId, 'sprite') as SpriteComponent | undefined
        if (aPos && aSpr) {
          this.vfx?.addDamageNumber(aPos.x + aSpr.width / 2, aPos.y, thornsDmg)
        }
      }
    }
  }

  /** Spawn a loot drop entity at position based on enemy's loot table. */
  spawnLootDrop(world: World, x: number, y: number, enemyAssetId: string, layerId: string): void {
    const drop = this.lootTables.rollDrop(enemyAssetId)
    if (!drop) return

    const dropId = world.createEntity('loot_' + drop.id + '_' + Date.now())
    world.addComponent(dropId, { type: 'position', x, y })
    world.addComponent(dropId, { type: 'sprite', assetId: drop.assetId, width: 16, height: 16 })
    world.addComponent(dropId, {
      type: 'physics',
      velocityX: (Math.random() - 0.5) * 60,
      velocityY: -100,
      gravity: true,
      solid: false,
    })
    world.addComponent(dropId, { type: 'layer', layerId })

    if (drop.itemType === 'consumable') {
      world.addComponent(dropId, {
        type: 'consumable',
        effect: drop.consumableEffect!,
        value: drop.consumableValue!,
      })
    } else {
      const itemDef: import('../ecs/types').ItemDef = {
        id: drop.id,
        name: drop.name,
        assetId: drop.assetId,
        kind: drop.pickupKind!,
        damage: drop.pickupDamage,
      }
      if (drop.pickupRange) itemDef.range = drop.pickupRange
      if (drop.pickupCooldown) itemDef.cooldown = drop.pickupCooldown
      if (drop.pickupCritChance) itemDef.critChance = drop.pickupCritChance
      if (drop.pickupDefense) itemDef.defense = drop.pickupDefense
      if (drop.pickupProjectileAssetId) itemDef.projectileAssetId = drop.pickupProjectileAssetId
      if (drop.rarity) itemDef.rarity = drop.rarity
      if (drop.pickupEffect) itemDef.effect = drop.pickupEffect
      world.addComponent(dropId, { type: 'pickup', itemDef })

      // Rarity glow for epic/legendary ground drops
      if (drop.rarity === 'epic' || drop.rarity === 'legendary') {
        const glowColor = drop.rarity === 'legendary' ? '#FFD700' : '#9C27B0'
        this.vfx?.addItemGlow(dropId, glowColor)
      }
    }
  }

  /**
   * Try to collect a pickup item into the collector's inventory.
   * Returns true if collected (to stop checking more overlaps).
   */
  private collectPickup(world: World, collectorId: string, itemId: string): boolean {
    const pickup = world.getComponent(itemId, 'pickup') as PickupComponent | undefined
    if (!pickup) return false

    const inv = world.getComponent(collectorId, 'inventory') as InventoryComponent | undefined
    if (!inv) return false

    // Find first empty slot
    const emptyIdx = inv.items.indexOf(null)
    if (emptyIdx === -1) return false // Inventory full, item stays

    // Queue respawn if this is a level-placed entity (not a loot drop)
    const entity = world.getEntity(itemId)
    if (entity && !entity.name.startsWith('loot_')) {
      this.queueRespawn(world, itemId)
    }

    // Auto-equip if the matching slot is empty
    const equip = world.getComponent(collectorId, 'equipment') as EquipmentComponent | undefined
    if (equip) {
      const kind = pickup.itemDef.kind
      const slot = kind === 'melee' || kind === 'ranged' ? 'weapon'
        : kind === 'shield' ? 'armor'
        : kind === 'passive' ? 'accessory'
        : null
      if (slot && !equip.slots[slot]) {
        equip.slots[slot] = pickup.itemDef
        this.vfx?.addItemToast(`Equipped ${pickup.itemDef.name}`)
        this.vfx?.removeItemGlow(itemId)
        world.removeEntity(itemId)
        return true
      }
    }

    inv.items[emptyIdx] = pickup.itemDef
    this.vfx?.addItemToast(pickup.itemDef.name)
    this.vfx?.removeItemGlow(itemId)
    world.removeEntity(itemId)
    return true
  }

  private checkConsumable(world: World, consumerId: string, itemId: string): void {
    const consumable = world.getComponent(itemId, 'consumable') as ConsumableComponent | undefined
    if (!consumable) return
    if (!world.getComponent(consumerId, 'health')) return

    switch (consumable.effect) {
      case 'heal': {
        this.healthSystem.heal(world, consumerId, consumable.value)
        const cPos = world.getComponent(consumerId, 'position') as PositionComponent | undefined
        const cSpr = world.getComponent(consumerId, 'sprite') as SpriteComponent | undefined
        if (cPos && cSpr) {
          this.vfx?.addHealNumber(cPos.x + cSpr.width / 2, cPos.y, consumable.value)
        }
        break
      }
    }

    // Queue respawn if this is a level-placed entity (not a loot drop)
    const entity = world.getEntity(itemId)
    if (entity && !entity.name.startsWith('loot_')) {
      this.queueRespawn(world, itemId)
    }

    world.removeEntity(itemId)
  }

  private queueRespawn(world: World, entityId: string): void {
    const pos = world.getComponent(entityId, 'position') as PositionComponent | undefined
    const sprite = world.getComponent(entityId, 'sprite') as SpriteComponent | undefined
    const pickup = world.getComponent(entityId, 'pickup') as PickupComponent | undefined
    const consumable = world.getComponent(entityId, 'consumable') as ConsumableComponent | undefined
    const layer = world.getComponent(entityId, 'layer') as LayerComponent | undefined
    if (!pos || !sprite) return

    this.respawnQueue.push({
      x: pos.x,
      y: pos.y,
      assetId: sprite.assetId,
      width: sprite.width,
      height: sprite.height,
      layerId: layer?.layerId ?? 'default',
      pickup: pickup ? { ...pickup } : undefined,
      consumable: consumable ? { ...consumable } : undefined,
      timer: 20000 + Math.random() * 10000, // 20-30s
    })
  }

  private spawnChestLoot(world: World, x: number, y: number, entry: ChestLootEntry, layerId: string): void {
    const dropId = world.createEntity('loot_chest_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6))
    world.addComponent(dropId, { type: 'position', x, y })
    world.addComponent(dropId, {
      type: 'physics',
      velocityX: (Math.random() - 0.5) * 60,
      velocityY: -100,
      gravity: true,
      solid: false,
    })
    world.addComponent(dropId, { type: 'layer', layerId })

    if (entry.itemType === 'consumable') {
      const effect = entry.consumableEffect ?? 'heal'
      const value = entry.consumableValue ?? 20
      world.addComponent(dropId, { type: 'sprite', assetId: 'item_potion_red', width: 16, height: 16 })
      world.addComponent(dropId, { type: 'consumable', effect, value })
    } else if (entry.itemType === 'pickup' && entry.itemDef) {
      world.addComponent(dropId, { type: 'sprite', assetId: entry.itemDef.assetId, width: 16, height: 16 })
      world.addComponent(dropId, { type: 'pickup', itemDef: { ...entry.itemDef } })
      if (entry.itemDef.rarity === 'epic' || entry.itemDef.rarity === 'legendary') {
        const glowColor = entry.itemDef.rarity === 'legendary' ? '#FFD700' : '#9C27B0'
        this.vfx?.addItemGlow(dropId, glowColor)
      }
    }
  }

  private respawnEntity(world: World, entry: RespawnEntry): void {
    const name = entry.pickup ? 'respawned_pickup' : 'respawned_consumable'
    const id = world.createEntity(name)
    world.addComponent(id, { type: 'position', x: entry.x, y: entry.y })
    world.addComponent(id, { type: 'sprite', assetId: entry.assetId, width: entry.width, height: entry.height })
    world.addComponent(id, { type: 'physics', velocityX: 0, velocityY: 0, gravity: false, solid: false })
    world.addComponent(id, { type: 'layer', layerId: entry.layerId })
    if (entry.pickup) {
      world.addComponent(id, { type: 'pickup', itemDef: { ...entry.pickup.itemDef } })
    }
    if (entry.consumable) {
      world.addComponent(id, { type: 'consumable', effect: entry.consumable.effect, value: entry.consumable.value })
    }
  }
}
