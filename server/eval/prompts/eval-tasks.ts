import type { EvalTask } from '../types.js'

export const EVAL_TASKS: EvalTask[] = [
  // --- Simple (single-concept) ---
  {
    id: 'simple-01',
    prompt: 'Create a row of 10 grass platforms for the hero to walk on.',
    tier: 'simple',
    expectedTraits: ['platforms_on_ground', 'evenly_spaced', 'solid_tiles'],
  },
  {
    id: 'simple-02',
    prompt: 'Place a skeleton enemy that patrols back and forth on a platform.',
    tier: 'simple',
    expectedTraits: ['enemy_on_solid_ground', 'patrol_behavior', 'has_waypoints'],
  },
  {
    id: 'simple-03',
    prompt: 'Add 3 torches evenly spaced along a stone wall.',
    tier: 'simple',
    expectedTraits: ['decoration_items', 'evenly_spaced', 'correct_sprite'],
  },
  {
    id: 'simple-04',
    prompt: 'Create a staircase of stone blocks going up to the right.',
    tier: 'simple',
    expectedTraits: ['ascending_pattern', 'solid_tiles', 'consistent_spacing'],
  },
  {
    id: 'simple-05',
    prompt: 'Place a treasure chest and a key item near each other.',
    tier: 'simple',
    expectedTraits: ['item_entities', 'proximity_placement', 'correct_sprites'],
  },

  // --- Medium (multi-concept) ---
  {
    id: 'medium-01',
    prompt: 'Build a castle entrance with stone walls, a wooden door, and two guard NPCs.',
    tier: 'medium',
    expectedTraits: ['structure_coherence', 'npc_placement', 'door_entity', 'wall_structure'],
  },
  {
    id: 'medium-02',
    prompt: 'Create a lava crossing challenge with floating platforms over a lava pit.',
    tier: 'medium',
    expectedTraits: ['hazard_placement', 'reachable_platforms', 'gap_design', 'difficulty_curve'],
  },
  {
    id: 'medium-03',
    prompt: 'Design a forest area with trees, bushes, a wandering wolf, and a hidden treasure.',
    tier: 'medium',
    expectedTraits: ['environment_variety', 'enemy_behavior', 'hidden_element', 'decoration_density'],
  },
  {
    id: 'medium-04',
    prompt: 'Build a bridge over a gap with wooden planks and rope supports, with an archer enemy on the far side.',
    tier: 'medium',
    expectedTraits: ['structure_coherence', 'enemy_placement', 'reachable_platforms', 'ranged_enemy'],
  },
  {
    id: 'medium-05',
    prompt: 'Create a shop area with a merchant NPC, display shelves with items, and a sign.',
    tier: 'medium',
    expectedTraits: ['npc_placement', 'item_variety', 'structure_coherence', 'decoration_items'],
  },

  // --- Complex (systems interaction) ---
  {
    id: 'complex-01',
    prompt: 'Design a dungeon room with a locked door, a key on a high platform, patrolling skeleton guards, spike traps, and a treasure chest behind the locked door.',
    tier: 'complex',
    expectedTraits: ['door_links', 'key_puzzle', 'enemy_patrols', 'hazards', 'reward_placement', 'reachable_platforms'],
  },
  {
    id: 'complex-02',
    prompt: 'Create a boss arena: a large flat platform with pillars for cover, a dragon boss with attack behavior, healing potions in corners, and an exit door that appears when the boss is defeated.',
    tier: 'complex',
    expectedTraits: ['boss_entity', 'attack_behavior', 'arena_design', 'item_placement', 'door_mechanics', 'health_system'],
  },
  {
    id: 'complex-03',
    prompt: 'Build a multi-level tower: ground floor entrance, middle floor with enemies and traps, top floor with treasure. Connect floors with doors. Add decorations to each level.',
    tier: 'complex',
    expectedTraits: ['multi_level_design', 'door_links', 'enemy_variety', 'hazards', 'reward_placement', 'decoration_density'],
  },
  {
    id: 'complex-04',
    prompt: 'Design a village scene: 3 houses with doors, an NPC villager in each, a central fountain, a patrolling guard, a merchant with items for sale, and a path connecting everything.',
    tier: 'complex',
    expectedTraits: ['structure_variety', 'npc_variety', 'door_links', 'patrol_behavior', 'spatial_composition', 'decoration_density'],
  },
]

export function getTasksByTier(tier: EvalTask['tier']): EvalTask[] {
  return EVAL_TASKS.filter(t => t.tier === tier)
}
