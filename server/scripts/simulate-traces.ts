/**
 * Simulate realistic game traces for pipeline testing.
 * POSTs through the server API so traces land in both JSONL and W&B Weave.
 * Falls back to direct JSONL write if server is offline.
 *
 * Usage: npx tsx scripts/simulate-traces.ts [count]
 */

import { appendFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { scoreTrace, classifyTier } from '../pipeline/scorer.js'

const DATA_DIR = join(process.cwd(), '.mistral-maker')
const TRACES_FILE = join(DATA_DIR, 'traces.jsonl')
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001'

const count = parseInt(process.argv[2] ?? '30', 10)

// --- Sprite catalog ---
const TILES = ['tile_grass', 'tile_stone', 'tile_brick', 'tile_sand', 'tile_ice', 'tile_wood']
const ENEMIES = ['enemy_skeleton', 'enemy_spider', 'enemy_orc']
const ITEMS = ['item_sword', 'item_potion_red', 'item_potion_blue', 'item_key', 'item_coin']
const DECOS = ['tree_oak', 'tree_pine', 'bush_green', 'flower_red', 'torch_wall', 'barrel_brown', 'crate_wood']
const NPCS = ['npc_villager', 'hero_knight']
const STRUCTS = ['chest_wood', 'sign_wood', 'flag_red']

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min)) + min

// --- Prompt templates ---
const PROMPTS = {
  simple: [
    'Place a {enemy} near the edge of the platform',
    'Add a {item} on top of the hill',
    'Put a {deco} at position {x},{y}',
    'Create a {npc} next to the {struct}',
    'Spawn a row of {tile} tiles from x={x} to x={x2}',
  ],
  medium: [
    'Build a small camp with a {npc}, {deco}, and {struct}',
    'Create a platforming challenge with {n} platforms and a {enemy} guardian',
    'Design a treasure area with {item}, {item2}, and {n} decorations',
    'Set up a patrol zone: {enemy} walking between two {deco} markers',
    'Build a bridge out of {tile} tiles spanning {n} tiles wide',
  ],
  complex: [
    'Design a full village scene with houses, NPCs, decorations, and a market area',
    'Create a dungeon entrance with enemies, torches, locked door, and treasure inside',
    'Build a forest clearing with trees, a campfire, patrolling enemies, and hidden items',
    'Design a boss arena with platforms at different heights, health potions, and the boss enemy',
    'Create a complete level section: ground, platforms, enemies, items, NPCs, and decorations',
  ],
}

function fillTemplate(template: string): string {
  return template
    .replace('{enemy}', pick(ENEMIES).replace('enemy_', ''))
    .replace('{item}', pick(ITEMS).replace('item_', ''))
    .replace('{item2}', pick(ITEMS).replace('item_', ''))
    .replace('{deco}', pick(DECOS).replace(/^(tree_|bush_|flower_|torch_|barrel_|crate_)/, ''))
    .replace('{npc}', pick(NPCS).replace(/(npc_|hero_)/, ''))
    .replace('{struct}', pick(STRUCTS).replace(/(chest_|sign_|flag_)/, ''))
    .replace('{tile}', pick(TILES).replace('tile_', ''))
    .replace('{x}', String(rand(100, 600)))
    .replace('{x2}', String(rand(700, 1000)))
    .replace('{y}', String(rand(200, 400)))
    .replace('{n}', String(rand(3, 8)))
}

function generateEntities(complexity: 'simple' | 'medium' | 'complex'): any[] {
  const counts = { simple: rand(1, 3), medium: rand(3, 7), complex: rand(7, 15) }
  const n = counts[complexity]
  const entities: any[] = []

  for (let i = 0; i < n; i++) {
    const allSprites = [...TILES, ...ENEMIES, ...ITEMS, ...DECOS, ...NPCS, ...STRUCTS]
    const assetId = pick(allSprites)
    const category = TILES.includes(assetId) ? 'tile'
      : ENEMIES.includes(assetId) ? 'enemy'
      : ITEMS.includes(assetId) ? 'item'
      : NPCS.includes(assetId) ? 'npc'
      : DECOS.includes(assetId) ? 'decoration'
      : 'structure'

    entities.push({
      id: `e_${Date.now()}_${i}`,
      name: `${assetId}_${i}`,
      components: {
        sprite: { assetId, width: category === 'item' ? 16 : 32, height: category === 'item' ? 16 : 32 },
        position: { x: rand(50, 900), y: category === 'tile' ? 400 : rand(200, 400) },
        ...(category === 'enemy' ? { behavior: { rules: [{ trigger: 'on_collision hero', action: 'hurt other 10' }] } } : {}),
        ...(Math.random() > 0.5 ? { physics: { gravity: category === 'tile' ? false : true, solid: category === 'tile' } } : {}),
      },
    })
  }

  return entities
}

function generateToolCalls(entities: any[]): any[] {
  const tools = ['spawn_entities', 'set_position', 'add_behavior', 'set_physics', 'equip_item']
  // More entities = more diverse tool calls
  const usedTools = new Set<string>(['spawn_entities'])
  for (const e of entities) {
    if (e.components.behavior) usedTools.add('add_behavior')
    if (e.components.physics) usedTools.add('set_physics')
  }
  if (entities.length > 3) usedTools.add('set_position')

  return Array.from(usedTools).map(name => ({
    name,
    arguments: '{}',
  }))
}

function generateCognitive(prompt: string, entities: any[], complexity: string): any {
  const hasThinking = Math.random() > 0.2  // 80% have thinking
  const hasPlan = Math.random() > 0.3      // 70% have plan
  const hasReflection = Math.random() > 0.5 // 50% have reflection

  return {
    ...(hasThinking ? { thinking: `The player wants ${prompt.toLowerCase().slice(0, 60)}. I need to create ${entities.length} entities for this ${complexity} task.` } : {}),
    ...(hasPlan ? { plan: entities.slice(0, 4).map((e: any, i: number) => `${i + 1}. Create ${e.name}`).join(', ') } : {}),
    ...(hasReflection ? { reflection: `Created ${entities.length} entities with ${new Set(entities.map((e: any) => e.components.sprite.assetId.split('_')[0])).size} unique types. ${entities.length > 5 ? 'Good variety.' : 'Could add more detail.'}` } : {}),
    ...(Math.random() > 0.4 ? { confidence: Math.round((0.5 + Math.random() * 0.5) * 100) / 100 } : {}),
  }
}

// --- Generate traces ---

let successCount = 0
let correctionCount = 0
const tiers = { gold: 0, silver: 0, bronze: 0, failed: 0 }

for (let i = 0; i < count; i++) { // eslint-disable-line -- top-level await
  const complexity = Math.random() < 0.3 ? 'simple' : Math.random() < 0.7 ? 'medium' : 'complex'
  const templates = PROMPTS[complexity]
  const prompt = fillTemplate(pick(templates))
  const entities = generateEntities(complexity)
  const toolCalls = generateToolCalls(entities)
  const cognitive = generateCognitive(prompt, entities, complexity)
  const isCorrection = Math.random() < 0.3 // 30% correction traces

  const context = {
    model: 'mistral-large-latest',
    modelId: 'mistral-large-latest',
    sessionId: `sim_session_${Date.now()}`,
    timestamp: new Date().toISOString(),
    canvasSize: { width: pick([800, 1024, 1280]), height: pick([600, 768, 720]) },
    responseTimeMs: rand(500, 3000),
  }

  let trace: any

  if (isCorrection) {
    // Generate a worse "rejected" version
    const rejectedEntities = entities.slice(0, Math.max(1, Math.floor(entities.length * 0.5)))
    const rejectedToolCalls = generateToolCalls(rejectedEntities)

    trace = {
      type: 'correction',
      prompt,
      rejected: {
        entities: rejectedEntities,
        toolCalls: rejectedToolCalls,
        cognitive: { thinking: `Initial attempt for: ${prompt.slice(0, 40)}` },
      },
      chosen: {
        entities,
        toolCalls,
        cognitive,
      },
      feedback: `Added ${entities.length - rejectedEntities.length} entities. Modified ${Math.min(rejectedEntities.length, 2)} entities.`,
      critiques: [
        pick(['needs more variety', 'spread things out more', 'add some decoration', 'enemies too close together', 'missing ground tiles']),
      ],
      attempts: rand(2, 4),
      cognitive,
      context,
    }
    correctionCount++
  } else {
    trace = {
      type: 'success',
      prompt,
      output: {
        entities,
        toolCalls,
        cognitive,
      },
      cognitive,
      context,
    }
    successCount++
  }

  // POST through server API (scores at ingestion, forwards to Weave sidecar)
  try {
    const resp = await fetch(`${SERVER_URL}/api/traces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trace),
    })
    if (resp.ok) {
      const result = await resp.json() as { tier?: string }
      const tier = (result.tier ?? 'failed') as keyof typeof tiers
      if (tier in tiers) tiers[tier]++
    } else {
      throw new Error(`Server returned ${resp.status}`)
    }
  } catch {
    // Fallback: write directly if server is offline
    const scores = scoreTrace(trace)
    const tier = classifyTier(scores.overall, trace.attempts)
    trace.id = `trace_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    trace.score = scores.overall
    trace.tier = tier
    trace.scores = scores
    tiers[tier]++
    appendFileSync(TRACES_FILE, JSON.stringify(trace) + '\n')
  }

  if (i % 5 === 0) {
    process.stdout.write(`\r  Generated ${i + 1}/${count} traces...`)
  }

  // Small delay so we don't overwhelm the server/sidecar
  await new Promise(r => setTimeout(r, 100))
}

console.log(`\n\nSimulation complete:`)
console.log(`  Success: ${successCount}, Corrections: ${correctionCount}`)
console.log(`  Tiers: gold=${tiers.gold} silver=${tiers.silver} bronze=${tiers.bronze} failed=${tiers.failed}`)
console.log(`  Traces sent via: ${SERVER_URL}/api/traces (JSONL + Weave)`)
