/**
 * Loot Tables System
 * Defines what items enemies can drop on death with weighted probabilities.
 */

import type { ItemEffect } from '../ecs/types'

export interface LootEntry {
  id: string                // unique identifier
  assetId: string           // sprite asset ID
  name: string              // display name
  weight: number            // relative drop weight (1-100)
  itemType: 'consumable' | 'pickup'
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  // Consumable fields
  consumableEffect?: 'heal' | 'speed' | 'ammo' | 'score'
  consumableValue?: number
  // Pickup fields
  pickupKind?: 'melee' | 'ranged' | 'shield' | 'passive'
  pickupDamage?: number
  pickupRange?: number
  pickupCooldown?: number
  pickupCritChance?: number
  pickupDefense?: number
  pickupProjectileAssetId?: string
  pickupEffect?: ItemEffect
}

export interface LootTable {
  enemyAssetId: string      // e.g., 'enemy_slime'
  dropChance: number        // 0.0 - 1.0 (default 0.25)
  entries: LootEntry[]
}

// Weight tiers: common=35, uncommon=25, rare=20, epic=15, legendary=5

// Default loot tables for each enemy type
const DEFAULT_LOOT_TABLES: LootTable[] = [
  // Skeleton
  {
    enemyAssetId: 'enemy_skeleton',
    dropChance: 0.60,
    entries: [
      { id: 'bone', assetId: 'item_bone', name: 'Bone', weight: 35, itemType: 'consumable', rarity: 'common', consumableEffect: 'score', consumableValue: 10 },
      { id: 'skull', assetId: 'item_skull', name: 'Skull', weight: 25, itemType: 'consumable', rarity: 'uncommon', consumableEffect: 'score', consumableValue: 20 },
      { id: 'rusty_sword', assetId: 'weapon_sword', name: 'Rusty Sword', weight: 20, itemType: 'pickup', rarity: 'common', pickupKind: 'melee', pickupDamage: 5, pickupRange: 40, pickupCooldown: 500 },
      { id: 'calcium_potion', assetId: 'item_potion_white', name: 'Calcium Potion', weight: 15, itemType: 'consumable', rarity: 'epic', consumableEffect: 'heal', consumableValue: 15 },
      { id: 'bone_armor', assetId: 'weapon_shield', name: 'Bone Armor', weight: 5, itemType: 'pickup', rarity: 'legendary', pickupKind: 'shield', pickupDefense: 2 },
    ],
  },
  // Slime
  {
    enemyAssetId: 'enemy_slime',
    dropChance: 0.50,
    entries: [
      { id: 'slime_gel', assetId: 'item_potion_blue', name: 'Slime Gel', weight: 35, itemType: 'consumable', rarity: 'common', consumableEffect: 'speed', consumableValue: 50 },
      { id: 'slime_core', assetId: 'item_gem_green', name: 'Slime Core', weight: 25, itemType: 'consumable', rarity: 'uncommon', consumableEffect: 'score', consumableValue: 25 },
      { id: 'green_potion', assetId: 'item_potion_green', name: 'Green Potion', weight: 20, itemType: 'consumable', rarity: 'rare', consumableEffect: 'heal', consumableValue: 10 },
      { id: 'sticky_boots', assetId: 'item_boots', name: 'Sticky Boots', weight: 15, itemType: 'pickup', rarity: 'epic', pickupKind: 'passive', pickupEffect: { type: 'speed_boost', value: 0.1 } },
      { id: 'slime_shield', assetId: 'weapon_shield_wood', name: 'Slime Shield', weight: 5, itemType: 'pickup', rarity: 'legendary', pickupKind: 'shield', pickupDefense: 1, pickupEffect: { type: 'speed_boost', value: 0.05 } },
    ],
  },
  // Bat
  {
    enemyAssetId: 'enemy_bat',
    dropChance: 0.40,
    entries: [
      { id: 'bat_wing', assetId: 'item_feather', name: 'Bat Wing', weight: 35, itemType: 'consumable', rarity: 'common', consumableEffect: 'score', consumableValue: 15 },
      { id: 'bat_fang', assetId: 'item_fang', name: 'Bat Fang', weight: 25, itemType: 'consumable', rarity: 'uncommon', consumableEffect: 'score', consumableValue: 10 },
      { id: 'night_vision', assetId: 'item_potion_purple', name: 'Night Vision Potion', weight: 20, itemType: 'consumable', rarity: 'rare', consumableEffect: 'speed', consumableValue: 100 },
      { id: 'leather_scraps', assetId: 'item_cloth', name: 'Leather Scraps', weight: 15, itemType: 'consumable', rarity: 'epic', consumableEffect: 'score', consumableValue: 5 },
      { id: 'echo_charm', assetId: 'item_amulet', name: 'Echo Charm', weight: 5, itemType: 'pickup', rarity: 'legendary', pickupKind: 'passive', pickupEffect: { type: 'dodge', value: 0.08 } },
    ],
  },
  // Goblin
  {
    enemyAssetId: 'enemy_goblin',
    dropChance: 0.65,
    entries: [
      { id: 'goblin_gold', assetId: 'item_coin_gold', name: 'Stolen Gold', weight: 35, itemType: 'consumable', rarity: 'common', consumableEffect: 'score', consumableValue: 15 },
      { id: 'goblin_gem', assetId: 'item_gem_red', name: 'Stolen Gem', weight: 25, itemType: 'consumable', rarity: 'uncommon', consumableEffect: 'score', consumableValue: 25 },
      { id: 'goblin_dagger', assetId: 'weapon_dagger', name: 'Crude Dagger', weight: 20, itemType: 'pickup', rarity: 'common', pickupKind: 'melee', pickupDamage: 6, pickupRange: 25, pickupCooldown: 250, pickupCritChance: 0.15 },
      { id: 'goblin_brew', assetId: 'item_potion_green', name: 'Goblin Brew', weight: 15, itemType: 'consumable', rarity: 'epic', consumableEffect: 'speed', consumableValue: 75 },
      { id: 'goblin_hood', assetId: 'item_cloak', name: 'Goblin Hood', weight: 5, itemType: 'pickup', rarity: 'legendary', pickupKind: 'passive', pickupEffect: { type: 'dodge', value: 0.05 } },
    ],
  },
  // Spider
  {
    enemyAssetId: 'enemy_spider',
    dropChance: 0.50,
    entries: [
      { id: 'spider_silk', assetId: 'item_cloth', name: 'Spider Silk', weight: 35, itemType: 'consumable', rarity: 'common', consumableEffect: 'score', consumableValue: 10 },
      { id: 'venom_sac', assetId: 'item_potion_green', name: 'Venom Sac', weight: 25, itemType: 'consumable', rarity: 'uncommon', consumableEffect: 'score', consumableValue: 20 },
      { id: 'spider_silk_bow', assetId: 'weapon_crossbow', name: 'Spider Silk Bow', weight: 20, itemType: 'pickup', rarity: 'rare', pickupKind: 'ranged', pickupDamage: 7, pickupRange: 200, pickupCooldown: 600, pickupProjectileAssetId: 'item_fang' },
      { id: 'serpent_fang', assetId: 'item_fang', name: 'Serpent Fang', weight: 15, itemType: 'pickup', rarity: 'rare', pickupKind: 'melee', pickupDamage: 11, pickupRange: 28, pickupCooldown: 280, pickupEffect: { type: 'poison', value: 4 } },
      { id: 'chitin_shield', assetId: 'weapon_shield_iron', name: 'Chitin Shield', weight: 5, itemType: 'pickup', rarity: 'legendary', pickupKind: 'shield', pickupDefense: 3 },
    ],
  },
  // Wolf
  {
    enemyAssetId: 'enemy_wolf',
    dropChance: 0.55,
    entries: [
      { id: 'wolf_pelt', assetId: 'item_cloth', name: 'Wolf Pelt', weight: 35, itemType: 'consumable', rarity: 'common', consumableEffect: 'score', consumableValue: 15 },
      { id: 'wolf_fang', assetId: 'item_fang', name: 'Wolf Fang', weight: 25, itemType: 'consumable', rarity: 'uncommon', consumableEffect: 'score', consumableValue: 10 },
      { id: 'raw_meat', assetId: 'item_potion_red', name: 'Raw Meat', weight: 20, itemType: 'consumable', rarity: 'rare', consumableEffect: 'heal', consumableValue: 15 },
      { id: 'wolf_claw', assetId: 'weapon_dagger', name: 'Wolf Claw', weight: 15, itemType: 'pickup', rarity: 'uncommon', pickupKind: 'melee', pickupDamage: 9, pickupRange: 30, pickupCooldown: 300, pickupCritChance: 0.1 },
      { id: 'alpha_amulet', assetId: 'item_amulet', name: 'Alpha Amulet', weight: 5, itemType: 'pickup', rarity: 'legendary', pickupKind: 'passive', pickupEffect: { type: 'crit_boost', value: 0.12 } },
    ],
  },
  // Orc
  {
    enemyAssetId: 'enemy_orc',
    dropChance: 0.70,
    entries: [
      { id: 'orc_plunder', assetId: 'item_coin_gold', name: 'Orc Plunder', weight: 35, itemType: 'consumable', rarity: 'common', consumableEffect: 'score', consumableValue: 20 },
      { id: 'war_trophy', assetId: 'item_skull', name: 'War Trophy', weight: 25, itemType: 'consumable', rarity: 'uncommon', consumableEffect: 'score', consumableValue: 25 },
      { id: 'orc_axe', assetId: 'weapon_axe', name: 'Orc Axe', weight: 20, itemType: 'pickup', rarity: 'rare', pickupKind: 'melee', pickupDamage: 14, pickupRange: 45, pickupCooldown: 600 },
      { id: 'orc_crossbow', assetId: 'weapon_crossbow', name: 'Orc Crossbow', weight: 15, itemType: 'pickup', rarity: 'epic', pickupKind: 'ranged', pickupDamage: 12, pickupRange: 250, pickupCooldown: 800, pickupProjectileAssetId: 'item_fang' },
      { id: 'war_shield', assetId: 'weapon_shield_fire', name: 'War Shield', weight: 5, itemType: 'pickup', rarity: 'legendary', pickupKind: 'shield', pickupDefense: 4, pickupEffect: { type: 'thorns', value: 2 } },
    ],
  },
  // Zombie
  {
    enemyAssetId: 'enemy_zombie',
    dropChance: 0.50,
    entries: [
      { id: 'rotten_flesh', assetId: 'item_bone', name: 'Rotten Flesh', weight: 35, itemType: 'consumable', rarity: 'common', consumableEffect: 'score', consumableValue: 5 },
      { id: 'zombie_bone', assetId: 'item_bone', name: 'Zombie Bone', weight: 25, itemType: 'consumable', rarity: 'uncommon', consumableEffect: 'score', consumableValue: 10 },
      { id: 'tattered_boots', assetId: 'item_boots', name: 'Tattered Boots', weight: 20, itemType: 'pickup', rarity: 'rare', pickupKind: 'passive', pickupEffect: { type: 'speed_boost', value: 0.05 } },
      { id: 'brain_juice', assetId: 'item_potion_purple', name: 'Brain Juice', weight: 15, itemType: 'consumable', rarity: 'epic', consumableEffect: 'heal', consumableValue: 10 },
      { id: 'cursed_blade', assetId: 'weapon_sword_fire', name: 'Cursed Blade', weight: 5, itemType: 'pickup', rarity: 'uncommon', pickupKind: 'melee', pickupDamage: 10, pickupRange: 40, pickupCooldown: 450, pickupEffect: { type: 'poison', value: 3 } },
    ],
  },
  // Ghost
  {
    enemyAssetId: 'enemy_ghost',
    dropChance: 0.45,
    entries: [
      { id: 'ectoplasm', assetId: 'item_potion_green', name: 'Ectoplasm', weight: 35, itemType: 'consumable', rarity: 'common', consumableEffect: 'score', consumableValue: 15 },
      { id: 'spirit_orb', assetId: 'item_gem_white', name: 'Spirit Orb', weight: 25, itemType: 'consumable', rarity: 'uncommon', consumableEffect: 'score', consumableValue: 25 },
      { id: 'ghost_blade', assetId: 'weapon_dagger', name: 'Ghost Blade', weight: 20, itemType: 'pickup', rarity: 'rare', pickupKind: 'melee', pickupDamage: 12, pickupRange: 35, pickupCooldown: 400, pickupEffect: { type: 'dodge', value: 0.08 } },
      { id: 'phantom_cloak', assetId: 'item_cloak', name: 'Phantom Cloak', weight: 15, itemType: 'pickup', rarity: 'epic', pickupKind: 'passive', pickupEffect: { type: 'dodge', value: 0.15 } },
      { id: 'soul_heal', assetId: 'item_potion_purple', name: 'Soul Heal', weight: 5, itemType: 'consumable', rarity: 'legendary', consumableEffect: 'heal', consumableValue: 30 },
    ],
  },
  // Snake
  {
    enemyAssetId: 'enemy_snake',
    dropChance: 0.50,
    entries: [
      { id: 'snake_scale', assetId: 'item_gem_green', name: 'Snake Scale', weight: 35, itemType: 'consumable', rarity: 'common', consumableEffect: 'score', consumableValue: 10 },
      { id: 'venom_vial', assetId: 'item_potion_purple', name: 'Venom Vial', weight: 25, itemType: 'consumable', rarity: 'uncommon', consumableEffect: 'score', consumableValue: 20 },
      { id: 'snake_fang', assetId: 'item_fang', name: 'Snake Fang', weight: 20, itemType: 'consumable', rarity: 'rare', consumableEffect: 'score', consumableValue: 15 },
      { id: 'antidote', assetId: 'item_potion_yellow', name: 'Antidote', weight: 15, itemType: 'consumable', rarity: 'epic', consumableEffect: 'heal', consumableValue: 20 },
      { id: 'serpent_ring', assetId: 'weapon_ring', name: 'Serpent Ring', weight: 5, itemType: 'pickup', rarity: 'legendary', pickupKind: 'passive', pickupEffect: { type: 'poison', value: 2 } },
    ],
  },
  // Boss: Dragon
  {
    enemyAssetId: 'boss_dragon',
    dropChance: 1.0,
    entries: [
      { id: 'dragon_scale', assetId: 'item_gem_blue', name: 'Dragon Scale', weight: 35, itemType: 'consumable', rarity: 'rare', consumableEffect: 'score', consumableValue: 50 },
      { id: 'flame_shard', assetId: 'item_gem_red', name: 'Flame Shard', weight: 25, itemType: 'consumable', rarity: 'epic', consumableEffect: 'score', consumableValue: 35 },
      { id: 'fire_sword', assetId: 'weapon_sword_fire', name: 'Fire Sword', weight: 20, itemType: 'pickup', rarity: 'epic', pickupKind: 'melee', pickupDamage: 22, pickupRange: 40, pickupCooldown: 450, pickupEffect: { type: 'fire_damage', value: 5 } },
      { id: 'dragon_heart', assetId: 'item_heart', name: 'Dragon Heart', weight: 15, itemType: 'consumable', rarity: 'legendary', consumableEffect: 'heal', consumableValue: 50 },
      { id: 'fire_shield', assetId: 'weapon_shield_fire', name: 'Fire Shield', weight: 5, itemType: 'pickup', rarity: 'legendary', pickupKind: 'shield', pickupDefense: 4, pickupEffect: { type: 'fire_damage', value: 3 } },
    ],
  },
  // Boss: Golem
  {
    enemyAssetId: 'boss_golem',
    dropChance: 1.0,
    entries: [
      { id: 'stone_chunk', assetId: 'item_gem_white', name: 'Stone Chunk', weight: 35, itemType: 'consumable', rarity: 'rare', consumableEffect: 'score', consumableValue: 20 },
      { id: 'rune_shard', assetId: 'item_gem_blue', name: 'Rune Shard', weight: 25, itemType: 'consumable', rarity: 'epic', consumableEffect: 'score', consumableValue: 30 },
      { id: 'golem_fist', assetId: 'weapon_hammer', name: 'Golem Fist', weight: 20, itemType: 'pickup', rarity: 'epic', pickupKind: 'melee', pickupDamage: 20, pickupRange: 50, pickupCooldown: 700, pickupEffect: { type: 'thorns', value: 3 } },
      { id: 'earth_potion', assetId: 'item_potion_green', name: 'Earth Potion', weight: 15, itemType: 'consumable', rarity: 'legendary', consumableEffect: 'heal', consumableValue: 40 },
      { id: 'stone_shield', assetId: 'weapon_shield_iron', name: 'Stone Shield', weight: 5, itemType: 'pickup', rarity: 'legendary', pickupKind: 'shield', pickupDefense: 5 },
    ],
  },
  // Boss: Demon
  {
    enemyAssetId: 'boss_demon',
    dropChance: 1.0,
    entries: [
      { id: 'demon_horn', assetId: 'item_bone', name: 'Demon Horn', weight: 35, itemType: 'consumable', rarity: 'rare', consumableEffect: 'score', consumableValue: 40 },
      { id: 'dark_gem', assetId: 'item_gem_purple', name: 'Dark Gem', weight: 25, itemType: 'consumable', rarity: 'epic', consumableEffect: 'score', consumableValue: 50 },
      { id: 'hellfire_staff', assetId: 'weapon_staff', name: 'Hellfire Staff', weight: 20, itemType: 'pickup', rarity: 'legendary', pickupKind: 'melee', pickupDamage: 25, pickupRange: 55, pickupCooldown: 600, pickupEffect: { type: 'fire_damage', value: 8 } },
      { id: 'blood_potion', assetId: 'item_potion_red', name: 'Blood Potion', weight: 15, itemType: 'consumable', rarity: 'legendary', consumableEffect: 'heal', consumableValue: 50 },
      { id: 'demon_cloak', assetId: 'item_cloak', name: 'Demon Cloak', weight: 5, itemType: 'pickup', rarity: 'legendary', pickupKind: 'passive', pickupEffect: { type: 'lifesteal', value: 0.15 } },
    ],
  },
]

// List of enemy asset IDs that have default loot tables
export const ENEMY_ASSET_IDS = DEFAULT_LOOT_TABLES.map(t => t.enemyAssetId)

export class LootTableManager {
  private tables: Map<string, LootTable> = new Map()
  private customTables: Map<string, LootTable> = new Map()

  constructor() {
    // Load default tables
    for (const table of DEFAULT_LOOT_TABLES) {
      this.tables.set(table.enemyAssetId, table)
    }
  }

  /**
   * Get the loot table for an enemy asset ID.
   * Returns custom table if one exists, otherwise returns default.
   */
  getTable(enemyAssetId: string): LootTable | undefined {
    return this.customTables.get(enemyAssetId) ?? this.tables.get(enemyAssetId)
  }

  /**
   * Get all loot tables (merged defaults + customs).
   */
  getAllTables(): LootTable[] {
    const result: LootTable[] = []
    const seen = new Set<string>()

    // Add custom tables first
    for (const [id, table] of this.customTables) {
      result.push(table)
      seen.add(id)
    }

    // Add default tables that don't have custom overrides
    for (const [id, table] of this.tables) {
      if (!seen.has(id)) {
        result.push(table)
      }
    }

    return result
  }

  /**
   * Set a custom loot table for an enemy type.
   */
  setCustomTable(table: LootTable): void {
    this.customTables.set(table.enemyAssetId, table)
  }

  /**
   * Reset a loot table to its default for an enemy type.
   */
  resetToDefault(enemyAssetId: string): void {
    this.customTables.delete(enemyAssetId)
  }

  /**
   * Check if an enemy type has a custom table.
   */
  hasCustomTable(enemyAssetId: string): boolean {
    return this.customTables.has(enemyAssetId)
  }

  /**
   * Roll for a loot drop from the given enemy's loot table.
   * Returns a LootEntry if the drop succeeds, null otherwise.
   */
  rollDrop(enemyAssetId: string): LootEntry | null {
    const table = this.getTable(enemyAssetId)
    if (!table || table.entries.length === 0) {
      return null
    }

    // Check if we drop anything at all
    if (Math.random() > table.dropChance) {
      return null
    }

    // Weighted random selection
    const totalWeight = table.entries.reduce((sum, e) => sum + e.weight, 0)
    let roll = Math.random() * totalWeight

    for (const entry of table.entries) {
      roll -= entry.weight
      if (roll <= 0) {
        return entry
      }
    }

    // Fallback to last entry (shouldn't happen due to floating point)
    return table.entries[table.entries.length - 1]
  }

  /**
   * Serialize custom tables to JSON for persistence.
   */
  serialize(): string {
    const data = Array.from(this.customTables.values())
    return JSON.stringify(data)
  }

  /**
   * Deserialize and load custom tables from JSON.
   */
  deserialize(json: string): void {
    try {
      const data = JSON.parse(json) as LootTable[]
      this.customTables.clear()
      for (const table of data) {
        this.customTables.set(table.enemyAssetId, table)
      }
    } catch (e) {
      console.warn('Failed to deserialize loot tables:', e)
    }
  }
}
