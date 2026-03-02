import './style.css'
import { World } from './ecs/world'
import { GameLoop } from './engine/game-loop'
import { Renderer } from './engine/renderer'
import { PhysicsSystem } from './systems/physics'
import { InputSystem } from './systems/input'
import { FacingSystem } from './systems/facing'
import { HealthSystem } from './systems/health'
import { PatrolSystem } from './systems/patrol'
import { BehaviorSystem } from './systems/behavior'
import { CombatSystem } from './systems/combat'
import { DoorSystem } from './systems/door'
import { MoveToSystem } from './systems/move-to'
import { LootTableManager } from './data/loot-tables'
import { DialogueManager } from './data/npc-dialogue'
import { VFXSystem } from './systems/vfx'
import { CanvasInteraction } from './ui/canvas-interaction'
import { AssetBrowser } from './ui/asset-browser'
import { ContextPanel } from './ui/context-panel'
import { ChatPanel } from './ui/chat-panel'
import { ModeToggle } from './ui/mode-toggle'
import { Toolbar } from './ui/toolbar'
import { SettingsPanel } from './ui/settings-panel'
import { BackpackPanel } from './ui/backpack-panel'
import { GAME_CONFIG } from './config/game-config'
import { HelpOverlay } from './ui/help-overlay'
import { PauseMenu } from './ui/pause-menu'
import { ContextMenu } from './ui/context-menu'
import { PixelEditor } from './ui/pixel-editor'
import { BestiaryPanel } from './ui/bestiary-panel'
import { SPRITE_REGISTRY } from './assets/sprites'
import { MistralClient } from './ai/mistral-client'
import { ToolExecutor } from './ai/tool-executor'
import { VoiceService } from './ai/voice'
import { categorizeEntity } from './systems/layer-manager'
import type { SavedEntityState, LayerDefinition } from './systems/layer-manager'
import type { ItemDef, PickupComponent, ConsumableComponent, VoiceLineComponent, ChestComponent, AnyComponent } from './ecs/types'
import { TraceCapture } from './telemetry/trace-capture'
import { TelemetrySession } from './telemetry/session'
import { showTraceToast } from './ui/trace-toast'

const appEl = document.getElementById('app')!
const toolbarEl = document.getElementById('toolbar')!
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
const canvasContainer = document.getElementById('canvas-container')!
const leftAssetBrowser = document.getElementById('asset-browser')!
const rightPanel = document.getElementById('right-panel')!

function resize() {
  canvas.width = canvasContainer.clientWidth
  canvas.height = canvasContainer.clientHeight
}
resize()
window.addEventListener('resize', resize)

const world = new World()
const physics = new PhysicsSystem()
const input = new InputSystem()
const renderer = new Renderer(canvas)
const facingSystem = new FacingSystem()
const healthSystem = new HealthSystem()
const patrolSystem = new PatrolSystem()
const behaviorSystem = new BehaviorSystem(healthSystem)
const lootManager = new LootTableManager()
const dialogueManager = new DialogueManager()
const vfx = new VFXSystem()
const combatSystem = new CombatSystem(healthSystem, input, lootManager)
const doorSystem = new DoorSystem()
const moveToSystem = new MoveToSystem()

// Wire VFX
renderer.setVFX(vfx)
renderer.setCombatSystem(combatSystem)
combatSystem.setVFX(vfx)
healthSystem.setVFX(vfx)

// Wire layer manager to systems
physics.setLayerManager(world.layerManager)
doorSystem.setLayerManager(world.layerManager)
doorSystem.setInputSystem(input)

healthSystem.setOnEntityDeath((entityId, pos, assetId) => {
  const entity = world.getEntity(entityId)
  const layerComp = entity?.components.get('layer') as import('./ecs/types').LayerComponent | undefined
  const layerId = layerComp?.layerId ?? 'default'
  combatSystem.spawnLootDrop(world, pos.x, pos.y, assetId, layerId)
})

// Wire NPC voice lines
behaviorSystem.setOnSayVoice((entityId, npcType) => {
  if (voiceService.isSpeaking) return

  // Custom voice line takes priority over dialogue manager
  const voiceLineComp = world.getComponent(entityId, 'voiceLine') as VoiceLineComponent | undefined
  if (voiceLineComp?.text) {
    const profile = dialogueManager.getProfile(npcType)
    behaviorSystem.setVoiceCooldown(entityId, profile?.cooldownMs ?? 20000)
    vfx.addSpeechBubble(entityId, voiceLineComp.text)
    voiceService.speak(voiceLineComp.text, profile?.voiceId)
    return
  }

  const profile = dialogueManager.getProfile(npcType)
  if (!profile) return
  const line = dialogueManager.pickLine(npcType)
  if (!line) return
  behaviorSystem.setVoiceCooldown(entityId, profile.cooldownMs)
  vfx.addSpeechBubble(entityId, line.text)
  voiceService.speak(line.text, profile.voiceId)
})

// ---------- Scene Setup ----------

const _autosave = localStorage.getItem('mistral-maker-autosave')
let player = ''
let _restoredOk = false

if (_autosave) {
  try {
    world.replaceFromSnapshot(_autosave)
    const heroes = world.query('health')
    const hero = heroes.find(e => e.name === 'hero')
      ?? heroes.find(e => e.name.toLowerCase().includes('hero'))
    if (hero) {
      player = hero.id
      _restoredOk = true
    } else {
      console.warn('Autosave had no hero entity, starting fresh')
      localStorage.removeItem('mistral-maker-autosave')
    }
  } catch (err) {
    console.warn('Autosave corrupted, starting fresh:', err)
    localStorage.removeItem('mistral-maker-autosave')
  }
}

if (!_restoredOk) {
  // ============ Fresh default scene: Multi-Area Adventure ============

  // Helper: create a tile row
  function makeTileRow(prefix: string, assetId: string, startX: number, y: number, count: number, layerId = 'default') {
    for (let i = 0; i < count; i++) {
      const id = world.createEntity(`${prefix}_${i}`)
      world.addComponent(id, { type: 'position', x: startX + i * 32, y })
      world.addComponent(id, { type: 'sprite', assetId, width: 32, height: 32 })
      world.addComponent(id, { type: 'physics', velocityX: 0, velocityY: 0, gravity: false, solid: true })
      world.addComponent(id, { type: 'layer', layerId })
    }
  }

  // Helper: create a decoration (non-solid)
  function makeDeco(name: string, assetId: string, x: number, y: number, w: number, h: number, layerId = 'default') {
    const id = world.createEntity(name)
    world.addComponent(id, { type: 'position', x, y })
    world.addComponent(id, { type: 'sprite', assetId, width: w, height: h })
    world.addComponent(id, { type: 'physics', velocityX: 0, velocityY: 0, gravity: false, solid: false })
    world.addComponent(id, { type: 'layer', layerId })
    return id
  }

  // Helper: create an enemy
  function makeEnemy(name: string, assetId: string, x: number, y: number, hp: number, patrol: [number, number][], speed: number, layerId = 'default', gravity = true) {
    const id = world.createEntity(name)
    world.addComponent(id, { type: 'position', x, y })
    world.addComponent(id, { type: 'sprite', assetId, width: 32, height: 32 })
    world.addComponent(id, { type: 'physics', velocityX: 0, velocityY: 0, gravity, solid: true })
    world.addComponent(id, { type: 'health', hp, maxHp: hp, invulnerableTimer: 0, spawnX: x, spawnY: y, respawnDelay: 5000, deadTimer: 0 })
    world.addComponent(id, { type: 'facing', direction: 'left' })
    world.addComponent(id, { type: 'layer', layerId })
    if (patrol.length > 0) {
      world.addComponent(id, {
        type: 'patrol',
        waypoints: patrol.map(([px, py]) => ({ x: px, y: py })),
        currentIndex: 0,
        speed,
        loop: false,
        direction: 1,
      })
    }
    world.addComponent(id, {
      type: 'behavior',
      rules: [{
        id: 'chase_player',
        description: 'Chase the player when nearby',
        trigger: 'on_proximity 120',
        action: 'move_towards player 80',
        enabled: true,
      }],
    })
    return id
  }

  // ============ ZONE 1: Forest Clearing (default layer, platformer) ============

  // Ground tiles (40 tiles, 0-1280px)
  makeTileRow('forest_ground', 'tile_grass', 0, 400, 40)

  // Elevated platforms
  makeTileRow('forest_plat1', 'tile_wood', 200, 320, 4)    // low platform
  makeTileRow('forest_plat2', 'tile_wood', 500, 280, 3)    // mid platform
  makeTileRow('forest_plat3', 'tile_wood', 850, 240, 3)    // high platform

  // Stone ledges
  makeTileRow('forest_ledge1', 'tile_stone', 100, 350, 2)
  makeTileRow('forest_ledge2', 'tile_stone', 700, 300, 2)

  // Bridge section over gap
  makeTileRow('forest_bridge', 'tile_bridge', 380, 400, 4)

  // Decorations
  makeDeco('tree1', 'tree_oak', 50, 336, 64, 64)
  makeDeco('tree2', 'tree_oak', 600, 336, 64, 64)
  makeDeco('tree3', 'tree_oak', 950, 336, 64, 64)
  makeDeco('bush1', 'deco_bush', 150, 384, 32, 16)
  makeDeco('bush2', 'deco_bush', 750, 384, 32, 16)
  makeDeco('flower1', 'deco_flower', 250, 388, 16, 12)
  makeDeco('flower2', 'deco_flower', 430, 388, 16, 12)
  makeDeco('flower3', 'deco_flower', 680, 388, 16, 12)
  makeDeco('rock1', 'deco_rock', 350, 384, 24, 16)
  makeDeco('rock2', 'deco_rock', 820, 384, 24, 16)
  makeDeco('torch_cave1', 'deco_torch', 1100, 360, 16, 32)
  makeDeco('torch_cave2', 'deco_torch', 1160, 360, 16, 32)
  makeDeco('sign_welcome', 'deco_sign', 80, 376, 24, 24)

  // Chest on high platform (contains health potion)
  const chestForest = world.createEntity('chest_forest')
  world.addComponent(chestForest, { type: 'position', x: 880, y: 216 })
  world.addComponent(chestForest, { type: 'sprite', assetId: 'deco_chest', width: 24, height: 24 })
  world.addComponent(chestForest, { type: 'physics', velocityX: 0, velocityY: 0, gravity: false, solid: false })
  world.addComponent(chestForest, { type: 'chest', opened: false, loot: [{ itemType: 'consumable', consumableEffect: 'heal', consumableValue: 25 }] })

  // Health potion on a platform
  const potionForest = world.createEntity('potion_forest')
  world.addComponent(potionForest, { type: 'position', x: 520, y: 256 })
  world.addComponent(potionForest, { type: 'sprite', assetId: 'item_potion_red', width: 16, height: 16 })
  world.addComponent(potionForest, { type: 'physics', velocityX: 0, velocityY: 0, gravity: false, solid: false })
  world.addComponent(potionForest, { type: 'consumable', effect: 'heal', value: 20 })

  // Dagger pickup near goblin area
  const daggerPickup = world.createEntity('pickup_dagger')
  world.addComponent(daggerPickup, { type: 'position', x: 460, y: 384 })
  world.addComponent(daggerPickup, { type: 'sprite', assetId: 'weapon_dagger', width: 16, height: 16 })
  world.addComponent(daggerPickup, { type: 'physics', velocityX: 0, velocityY: 0, gravity: false, solid: false })
  world.addComponent(daggerPickup, { type: 'pickup', itemDef: { id: 'crude_dagger', name: 'Crude Dagger', assetId: 'weapon_dagger', kind: 'melee', damage: 6, range: 25, cooldown: 250, critChance: 0.15, rarity: 'common' } })

  // NPCs
  const guard = world.createEntity('npc_guard')
  world.addComponent(guard, { type: 'position', x: 100, y: 368 })
  world.addComponent(guard, { type: 'sprite', assetId: 'hero_knight', width: 32, height: 32, hueShift: 200 })
  world.addComponent(guard, { type: 'physics', velocityX: 0, velocityY: 0, gravity: true, solid: true })
  world.addComponent(guard, {
    type: 'behavior',
    rules: [{
      id: 'guard_bark',
      description: 'Bark a voice line when player is nearby',
      trigger: 'on_proximity 80',
      action: 'say_voice npc_guard',
      enabled: true,
    }],
  })

  const merchant = world.createEntity('npc_merchant')
  world.addComponent(merchant, { type: 'position', x: 500, y: 368 })
  world.addComponent(merchant, { type: 'sprite', assetId: 'hero_knight', width: 32, height: 32, hueShift: 120 })
  world.addComponent(merchant, { type: 'physics', velocityX: 0, velocityY: 0, gravity: true, solid: true })
  world.addComponent(merchant, {
    type: 'behavior',
    rules: [{
      id: 'merchant_bark',
      description: 'Bark a voice line when player is nearby',
      trigger: 'on_proximity 80',
      action: 'say_voice npc_merchant',
      enabled: true,
    }],
  })

  // Forest enemies
  makeEnemy('enemy_slime_1', 'enemy_slime', 200, 368, 20, [[150, 368], [300, 368]], 40)
  makeEnemy('enemy_slime_2', 'enemy_slime', 650, 368, 20, [[600, 368], [750, 368]], 45)
  makeEnemy('enemy_goblin_1', 'enemy_goblin', 450, 288, 25, [[400, 288], [500, 288]], 50)
  makeEnemy('enemy_bat_1', 'enemy_bat', 700, 250, 15, [[650, 250], [800, 250]], 60, 'default', false)
  makeEnemy('enemy_skeleton_1', 'enemy_skeleton', 1050, 368, 30, [[1000, 368], [1150, 368]], 55)

  // ============ ZONE 1 → ZONE 2 DOOR ============

  const doorCaveExit = world.createEntity('door_cave_exit')
  world.addComponent(doorCaveExit, { type: 'position', x: 1200, y: 368 })
  world.addComponent(doorCaveExit, { type: 'sprite', assetId: 'door_cave', width: 32, height: 32 })
  world.addComponent(doorCaveExit, { type: 'physics', velocityX: 0, velocityY: 0, gravity: false, solid: false })
  world.addComponent(doorCaveExit, { type: 'door', destinationId: null, bidirectional: true })
  world.addComponent(doorCaveExit, { type: 'layer', layerId: 'default' })

  // ============ ZONE 2: Underground Cave (cave layer, topdown) ============

  const caveLayer = world.layerManager.addLayer('cave', 'Underground Cave', 'topdown')
  caveLayer.backgroundTileId = 'tile_stone'

  // Cave walls forming corridors (Room 1 → corridor → Room 2)
  // Room 1 (entry room): 200x200 at origin
  // Top wall
  makeTileRow('cave_wall_t1', 'tile_wall_stone', 0, 0, 8, 'cave')
  // Bottom wall (with gap for corridor)
  makeTileRow('cave_wall_b1', 'tile_wall_stone', 0, 192, 5, 'cave')
  // Left wall
  for (let i = 1; i < 6; i++) {
    const id = world.createEntity(`cave_wall_l1_${i}`)
    world.addComponent(id, { type: 'position', x: 0, y: i * 32 })
    world.addComponent(id, { type: 'sprite', assetId: 'tile_wall_stone', width: 32, height: 32 })
    world.addComponent(id, { type: 'physics', velocityX: 0, velocityY: 0, gravity: false, solid: true })
    world.addComponent(id, { type: 'layer', layerId: 'cave' })
  }
  // Right wall (with gap for corridor at y=96-128)
  for (let i = 1; i < 6; i++) {
    if (i === 3 || i === 4) continue // corridor gap
    const id = world.createEntity(`cave_wall_r1_${i}`)
    world.addComponent(id, { type: 'position', x: 224, y: i * 32 })
    world.addComponent(id, { type: 'sprite', assetId: 'tile_wall_stone', width: 32, height: 32 })
    world.addComponent(id, { type: 'physics', velocityX: 0, velocityY: 0, gravity: false, solid: true })
    world.addComponent(id, { type: 'layer', layerId: 'cave' })
  }

  // Corridor (narrow passage 64px wide, 160px long)
  makeTileRow('cave_corr_t', 'tile_wall_stone', 256, 64, 5, 'cave')
  makeTileRow('cave_corr_b', 'tile_wall_stone', 256, 160, 5, 'cave')

  // Room 2 (treasure room): 200x200
  makeTileRow('cave_wall_t2', 'tile_wall_stone', 416, 0, 8, 'cave')
  makeTileRow('cave_wall_b2', 'tile_wall_stone', 416, 192, 8, 'cave')
  // Right wall of Room 2
  for (let i = 1; i < 6; i++) {
    const id = world.createEntity(`cave_wall_r2_${i}`)
    world.addComponent(id, { type: 'position', x: 640, y: i * 32 })
    world.addComponent(id, { type: 'sprite', assetId: 'tile_wall_stone', width: 32, height: 32 })
    world.addComponent(id, { type: 'physics', velocityX: 0, velocityY: 0, gravity: false, solid: true })
    world.addComponent(id, { type: 'layer', layerId: 'cave' })
  }
  // Left wall of Room 2 (with corridor gap)
  for (let i = 1; i < 6; i++) {
    if (i === 3 || i === 4) continue
    const id = world.createEntity(`cave_wall_l2_${i}`)
    world.addComponent(id, { type: 'position', x: 416, y: i * 32 })
    world.addComponent(id, { type: 'sprite', assetId: 'tile_wall_stone', width: 32, height: 32 })
    world.addComponent(id, { type: 'physics', velocityX: 0, velocityY: 0, gravity: false, solid: true })
    world.addComponent(id, { type: 'layer', layerId: 'cave' })
  }

  // Cave decorations
  makeDeco('cave_torch1', 'deco_torch', 48, 40, 16, 32, 'cave')
  makeDeco('cave_torch2', 'deco_torch', 180, 40, 16, 32, 'cave')
  makeDeco('cave_barrel1', 'deco_barrel', 450, 40, 24, 24, 'cave')
  makeDeco('cave_barrel2', 'deco_barrel', 580, 150, 24, 24, 'cave')
  makeDeco('cave_crystal', 'deco_crystal', 530, 100, 16, 24, 'cave')

  // Cave chest with rare weapon
  const chestCave = world.createEntity('chest_cave')
  world.addComponent(chestCave, { type: 'position', x: 560, y: 80 })
  world.addComponent(chestCave, { type: 'sprite', assetId: 'deco_chest', width: 24, height: 24 })
  world.addComponent(chestCave, { type: 'physics', velocityX: 0, velocityY: 0, gravity: false, solid: false })
  world.addComponent(chestCave, { type: 'layer', layerId: 'cave' })
  world.addComponent(chestCave, { type: 'chest', opened: false, loot: [{ itemType: 'pickup', itemDef: { id: 'ghost_blade_chest', name: 'Ghost Blade', assetId: 'weapon_dagger', kind: 'melee', damage: 12, range: 35, cooldown: 400, rarity: 'rare', effect: { type: 'dodge', value: 0.08 } } }] })

  // Cave enemies
  makeEnemy('enemy_spider_cave', 'enemy_spider', 100, 100, 25, [[60, 80], [180, 140]], 50, 'cave', false)
  makeEnemy('enemy_snake_cave', 'enemy_snake', 300, 110, 20, [[270, 90], [350, 130]], 55, 'cave', false)
  makeEnemy('enemy_zombie_cave', 'enemy_zombie', 360, 110, 35, [[300, 110], [400, 110]], 40, 'cave', false)
  makeEnemy('enemy_ghost_cave', 'enemy_ghost', 500, 100, 30, [[460, 60], [600, 140]], 50, 'cave', false)
  makeEnemy('enemy_wolf_cave', 'enemy_wolf', 550, 60, 40, [[480, 50], [620, 70]], 55, 'cave', false)

  // Cave entry door (from Zone 1)
  const doorCaveEntry = world.createEntity('door_cave_entry')
  world.addComponent(doorCaveEntry, { type: 'position', x: 40, y: 130 })
  world.addComponent(doorCaveEntry, { type: 'sprite', assetId: 'door_cave', width: 32, height: 32 })
  world.addComponent(doorCaveEntry, { type: 'physics', velocityX: 0, velocityY: 0, gravity: false, solid: false })
  world.addComponent(doorCaveEntry, { type: 'door', destinationId: doorCaveExit, bidirectional: true })
  world.addComponent(doorCaveEntry, { type: 'layer', layerId: 'cave' })

  // Link Zone 1 door to cave entry
  ;(world.getComponent(doorCaveExit, 'door') as import('./ecs/types').DoorComponent).destinationId = doorCaveEntry

  // Portal from cave to arena
  const doorPortalBlue = world.createEntity('door_portal_blue')
  world.addComponent(doorPortalBlue, { type: 'position', x: 600, y: 130 })
  world.addComponent(doorPortalBlue, { type: 'sprite', assetId: 'door_portal_blue', width: 32, height: 32 })
  world.addComponent(doorPortalBlue, { type: 'physics', velocityX: 0, velocityY: 0, gravity: false, solid: false })
  world.addComponent(doorPortalBlue, { type: 'door', destinationId: null, bidirectional: true })
  world.addComponent(doorPortalBlue, { type: 'layer', layerId: 'cave' })

  // ============ ZONE 3: Boss Arena (arena layer, platformer) ============

  world.layerManager.addLayer('arena', 'Boss Arena', 'platformer')

  // Ground tiles (25 tiles)
  makeTileRow('arena_ground', 'tile_brick', 0, 400, 25, 'arena')

  // Elevated dodge platforms
  makeTileRow('arena_plat1', 'tile_stone', 100, 320, 3, 'arena')
  makeTileRow('arena_plat2', 'tile_stone', 550, 320, 3, 'arena')

  // Arena walls
  for (let i = 0; i < 13; i++) {
    const wl = world.createEntity(`arena_wall_l_${i}`)
    world.addComponent(wl, { type: 'position', x: -32, y: i * 32 })
    world.addComponent(wl, { type: 'sprite', assetId: 'tile_wall_brick', width: 32, height: 32 })
    world.addComponent(wl, { type: 'physics', velocityX: 0, velocityY: 0, gravity: false, solid: true })
    world.addComponent(wl, { type: 'layer', layerId: 'arena' })

    const wr = world.createEntity(`arena_wall_r_${i}`)
    world.addComponent(wr, { type: 'position', x: 800, y: i * 32 })
    world.addComponent(wr, { type: 'sprite', assetId: 'tile_wall_brick', width: 32, height: 32 })
    world.addComponent(wr, { type: 'physics', velocityX: 0, velocityY: 0, gravity: false, solid: true })
    world.addComponent(wr, { type: 'layer', layerId: 'arena' })
  }

  // Arena decorations
  makeDeco('arena_torch1', 'deco_torch', 50, 360, 16, 32, 'arena')
  makeDeco('arena_torch2', 'deco_torch', 250, 360, 16, 32, 'arena')
  makeDeco('arena_torch3', 'deco_torch', 500, 360, 16, 32, 'arena')
  makeDeco('arena_torch4', 'deco_torch', 700, 360, 16, 32, 'arena')
  makeDeco('arena_crystal1', 'deco_crystal', 150, 370, 16, 24, 'arena')
  makeDeco('arena_crystal2', 'deco_crystal', 600, 370, 16, 24, 'arena')

  // Portal entry from cave
  const doorPortalRed = world.createEntity('door_portal_red')
  world.addComponent(doorPortalRed, { type: 'position', x: 40, y: 368 })
  world.addComponent(doorPortalRed, { type: 'sprite', assetId: 'door_portal_red', width: 32, height: 32 })
  world.addComponent(doorPortalRed, { type: 'physics', velocityX: 0, velocityY: 0, gravity: false, solid: false })
  world.addComponent(doorPortalRed, { type: 'door', destinationId: doorPortalBlue, bidirectional: true })
  world.addComponent(doorPortalRed, { type: 'layer', layerId: 'arena' })

  // Link blue portal to red portal
  ;(world.getComponent(doorPortalBlue, 'door') as import('./ecs/types').DoorComponent).destinationId = doorPortalRed

  // Boss: Dragon
  const boss = world.createEntity('boss_dragon')
  world.addComponent(boss, { type: 'position', x: 400, y: 368 })
  world.addComponent(boss, { type: 'sprite', assetId: 'boss_dragon', width: 48, height: 48 })
  world.addComponent(boss, { type: 'physics', velocityX: 0, velocityY: 0, gravity: true, solid: true })
  world.addComponent(boss, { type: 'health', hp: 250, maxHp: 250, invulnerableTimer: 0, spawnX: 400, spawnY: 368, respawnDelay: 0, deadTimer: 0 })
  world.addComponent(boss, { type: 'facing', direction: 'left' })
  world.addComponent(boss, { type: 'layer', layerId: 'arena' })
  world.addComponent(boss, {
    type: 'patrol',
    waypoints: [{ x: 150, y: 368 }, { x: 650, y: 368 }],
    currentIndex: 0,
    speed: 50,
    loop: false,
    direction: 1,
  })
  world.addComponent(boss, {
    type: 'behavior',
    rules: [{
      id: 'boss_chase',
      description: 'Chase the player aggressively',
      trigger: 'on_proximity 200',
      action: 'move_towards player 100',
      enabled: true,
    }],
  })

  // Post-boss legendary chest
  const chestBoss = world.createEntity('chest_boss')
  world.addComponent(chestBoss, { type: 'position', x: 720, y: 376 })
  world.addComponent(chestBoss, { type: 'sprite', assetId: 'deco_chest', width: 24, height: 24 })
  world.addComponent(chestBoss, { type: 'physics', velocityX: 0, velocityY: 0, gravity: false, solid: false })
  world.addComponent(chestBoss, { type: 'layer', layerId: 'arena' })
  world.addComponent(chestBoss, { type: 'chest', opened: false, loot: [{ itemType: 'pickup', itemDef: { id: 'demon_cloak_chest', name: 'Demon Cloak', assetId: 'item_cloak', kind: 'passive', rarity: 'legendary', effect: { type: 'lifesteal', value: 0.15 } } }] })

  // ============ Player ============

  player = world.createEntity('hero')
  world.addComponent(player, { type: 'position', x: 60, y: 300 })
  world.addComponent(player, { type: 'sprite', assetId: 'hero_knight', width: 32, height: 32 })
  world.addComponent(player, { type: 'physics', velocityX: 0, velocityY: 0, gravity: true, solid: true })
  world.addComponent(player, { type: 'health', hp: 100, maxHp: 100, invulnerableTimer: 0, spawnX: 60, spawnY: 300, respawnDelay: 0, deadTimer: 0 })
  world.addComponent(player, { type: 'facing', direction: 'right' })
  world.addComponent(player, {
    type: 'equipment',
    slots: {
      weapon: { id: 'basic_sword', name: 'Sword', assetId: 'item_sword', kind: 'melee', damage: 8, range: 40, cooldown: 400, rarity: 'common' },
      armor: null,
      accessory: null,
    },
  })
  world.addComponent(player, {
    type: 'inventory',
    capacity: 16,
    items: [
      { id: 'start_potion', name: 'Health Potion', assetId: 'item_potion_red', kind: 'passive' },
      { id: 'start_key', name: 'Old Key', assetId: 'item_key', kind: 'passive' },
      ...new Array(14).fill(null),
    ],
  })
  world.addComponent(player, { type: 'layer', layerId: 'default' })
}

// input.setPlayer and renderer.setFollowTarget handled by switchControlTo below

// ---------- UI Setup ----------

// Toolbar (top bar with New/Save/Load/Export/Settings)
const toolbar = new Toolbar(toolbarEl, world)

// Settings panel (modal)
const settingsPanel = new SettingsPanel()

// Backpack panel (modal + floating FAB on canvas)
const backpackPanel = new BackpackPanel(world)
const backpackFab = backpackPanel.createFloatingButton()
canvasContainer.appendChild(backpackFab)

// Help overlay (? key)
const helpOverlay = new HelpOverlay()

// Pause menu (Escape in play mode)
const pauseMenu = new PauseMenu()

// Canvas interaction (build/play mode, drag, pan, zoom)
const interaction = new CanvasInteraction(canvas, world, renderer)
interaction.setVFX(vfx)

// Right-click context menu
const contextMenu = new ContextMenu(world, renderer)
interaction.setContextMenu(contextMenu)

// Pixel editor (modal)
const pixelEditor = new PixelEditor()

// Asset browser (left panel top)
const assetBrowser = new AssetBrowser(leftAssetBrowser)

// Chat panel (canvas overlay, bottom-left)
const chatPanel = new ChatPanel(canvasContainer)

// Context panel (right panel)
const contextPanel = new ContextPanel(rightPanel, world)
contextPanel.setRenderer(renderer)

// Mode toggle (overlay on canvas)
const modeToggle = new ModeToggle(canvasContainer)

// Bestiary panel (popup modal)
const bestiaryPanel = new BestiaryPanel(lootManager, renderer)

// ---------- Wire Action Bar Callbacks ----------

/** Find the top of the nearest solid entity below a point (for placing items on ground) */
function findGroundBelow(x: number, startY: number, layerId: string): { x: number; y: number } {
  const solids = world.query('position', 'sprite', 'physics')
  let bestY = startY
  let found = false

  for (const entity of solids) {
    const phys = entity.components.get('physics') as import('./ecs/types').PhysicsComponent
    if (!phys.solid) continue
    const lc = entity.components.get('layer') as import('./ecs/types').LayerComponent | undefined
    const entityLayer = lc?.layerId ?? 'default'
    if (entityLayer !== layerId) continue

    const pos = entity.components.get('position') as import('./ecs/types').PositionComponent
    const sprite = entity.components.get('sprite') as import('./ecs/types').SpriteComponent
    // Check if this solid is horizontally overlapping and below (or at) startY
    if (x + 24 > pos.x && x < pos.x + sprite.width && pos.y >= startY) {
      if (!found || pos.y < bestY) {
        bestY = pos.y
        found = true
      }
    }
  }

  return { x, y: found ? bestY : startY }
}

let layerCounter = world.layerManager.layers.length

modeToggle.onAddConsumable = () => {
  const center = renderer.getCameraCenter()
  // Snap to nearest ground: scan downward from camera center to find a solid entity
  const spawnPos = findGroundBelow(center.x - 12, center.y, world.layerManager.currentLayerId)
  world.saveSnapshot()
  const id = world.createEntity('consumable')
  world.addComponent(id, { type: 'position', x: spawnPos.x, y: spawnPos.y - 24 })
  world.addComponent(id, { type: 'sprite', assetId: 'item_potion_red', width: 24, height: 24 })
  world.addComponent(id, { type: 'physics', velocityX: 0, velocityY: 0, gravity: false, solid: false })
  world.addComponent(id, { type: 'consumable', effect: 'heal', value: 20 })
  world.addComponent(id, { type: 'layer', layerId: world.layerManager.currentLayerId })
  interaction.selectedEntityId = id
  renderer.setSelectedEntity(id)
  contextPanel.showEntity(id)
}

modeToggle.onAddDoor = () => {
  const center = renderer.getCameraCenter()
  const spawnPos = findGroundBelow(center.x - 16, center.y, world.layerManager.currentLayerId)
  world.saveSnapshot()
  const id = world.createEntity('door')
  world.addComponent(id, { type: 'position', x: spawnPos.x, y: spawnPos.y - 32 })
  world.addComponent(id, { type: 'sprite', assetId: 'tile_stone', width: 32, height: 32 })
  world.addComponent(id, { type: 'physics', velocityX: 0, velocityY: 0, gravity: false, solid: true })
  world.addComponent(id, { type: 'door', destinationId: null, bidirectional: false })
  world.addComponent(id, { type: 'layer', layerId: world.layerManager.currentLayerId })
  interaction.selectedEntityId = id
  renderer.setSelectedEntity(id)
  contextPanel.showEntity(id)
}

modeToggle.onAddLayer = () => {
  const layerId = `layer_${layerCounter}`
  const layerName = `Layer ${layerCounter}`
  layerCounter++
  world.layerManager.addLayer(layerId, layerName)
  modeToggle.refreshLayers(world.layerManager.layers, world.layerManager.currentLayerId)
  contextPanel.showEntity(null)
}

// Wire game hub (context panel empty state)
contextPanel.onLayerSwitch = (layerId) => {
  world.layerManager.currentLayerId = layerId
  const layerDef = world.layerManager.getLayer(layerId)
  if (layerDef) {
    modeToggle.setCurrentGameMode(layerDef.gameMode)
  }
  modeToggle.refreshLayers(world.layerManager.layers, world.layerManager.currentLayerId)
}

contextPanel.onLayerDelete = (layerId) => {
  // Reassign orphaned entities to 'default'
  const entities = world.query('layer')
  for (const entity of entities) {
    const lc = entity.components.get('layer') as import('./ecs/types').LayerComponent
    if (lc.layerId === layerId) {
      lc.layerId = 'default'
    }
  }
  world.layerManager.removeLayer(layerId)
  modeToggle.refreshLayers(world.layerManager.layers, world.layerManager.currentLayerId)
}

/** Remap entity positions/dimensions at the midpoint of a mode-switch transition. */
function performModeSwitch(
  layerId: string,
  fromMode: 'platformer' | 'topdown',
  toMode: 'platformer' | 'topdown',
): void {
  const layerDef = world.layerManager.getLayer(layerId)
  if (!layerDef) return

  const entities = world.query('position', 'sprite')
  const saveMap: Record<string, SavedEntityState> = {}

  // Save current state for fromMode
  for (const entity of entities) {
    const lc = entity.components.get('layer') as import('./ecs/types').LayerComponent | undefined
    const entityLayer = lc?.layerId ?? 'default'
    if (entityLayer !== layerId) continue

    const pos = entity.components.get('position') as import('./ecs/types').PositionComponent
    const sprite = entity.components.get('sprite') as import('./ecs/types').SpriteComponent
    const patrol = entity.components.get('patrol') as import('./ecs/types').PatrolComponent | undefined

    const state: SavedEntityState = { x: pos.x, y: pos.y, width: sprite.width, height: sprite.height }
    if (patrol && patrol.waypoints.length > 0) {
      state.waypoints = patrol.waypoints.map(wp => ({ x: wp.x, y: wp.y }))
    }
    saveMap[entity.id] = state
  }

  if (fromMode === 'platformer') {
    layerDef.savedPlatformerState = saveMap
  } else {
    layerDef.savedTopdownState = saveMap
  }

  // Restore or first-time remap for toMode
  const restoreMap = toMode === 'platformer' ? layerDef.savedPlatformerState : layerDef.savedTopdownState

  for (const entity of entities) {
    const lc = entity.components.get('layer') as import('./ecs/types').LayerComponent | undefined
    const entityLayer = lc?.layerId ?? 'default'
    if (entityLayer !== layerId) continue

    const pos = entity.components.get('position') as import('./ecs/types').PositionComponent
    const sprite = entity.components.get('sprite') as import('./ecs/types').SpriteComponent
    const patrol = entity.components.get('patrol') as import('./ecs/types').PatrolComponent | undefined

    const saved = restoreMap?.[entity.id]
    if (saved) {
      // Restore from saved state
      pos.x = saved.x
      pos.y = saved.y
      sprite.width = saved.width
      sprite.height = saved.height
      if (saved.waypoints && patrol) {
        patrol.waypoints = saved.waypoints.map(wp => ({ x: wp.x, y: wp.y }))
      }
    } else if (toMode === 'topdown') {
      // First-time remap: environment sprites get depth-adjusted dimensions
      const category = categorizeEntity(sprite.assetId)
      if (category === 'environment') {
        sprite.height = Math.max(sprite.width, sprite.height, 32)
      }
    }
  }
}

contextPanel.onLayerGameModeToggle = (layerId, gameMode) => {
  const layerDef = world.layerManager.getLayer(layerId)
  if (!layerDef) return

  world.saveSnapshot()
  const fromMode = layerDef.gameMode
  layerDef.gameMode = gameMode

  // Auto-set a default floor tile when switching to topdown
  if (gameMode === 'topdown' && !layerDef.backgroundTileId) {
    layerDef.backgroundTileId = 'tile_grass'
  }

  // Trigger visual transition + schedule midpoint remap
  modeSwitchTimer = MODE_SWITCH_DURATION
  modeSwitchPending = true
  pendingLayerId = layerId
  pendingFromMode = fromMode
  pendingToMode = gameMode

  // Update input system if the controlled entity is on this layer
  const ctrlEntity = world.getEntity(controlledEntityId)
  if (ctrlEntity) {
    const lc = ctrlEntity.components.get('layer') as import('./ecs/types').LayerComponent | undefined
    const ctrlLayer = lc?.layerId ?? 'default'
    if (ctrlLayer === layerId) {
      input.setGameMode(gameMode)
      const phys = ctrlEntity.components.get('physics') as import('./ecs/types').PhysicsComponent | undefined
      if (phys) {
        if (gameMode === 'topdown') {
          phys.gravity = false
          phys.velocityY = 0
        } else {
          phys.gravity = true
        }
      }
    }
  }
  modeToggle.refreshLayers(world.layerManager.layers, world.layerManager.currentLayerId)
}

contextPanel.onAddLayer = () => {
  const layerId = `layer_${layerCounter}`
  const layerName = `Layer ${layerCounter}`
  layerCounter++
  world.layerManager.addLayer(layerId, layerName)
  modeToggle.refreshLayers(world.layerManager.layers, world.layerManager.currentLayerId)
}

contextPanel.onGameRuleChange = () => {
  physics.setGravity(GAME_CONFIG.physics.gravity)
  input.setWalkSpeed(GAME_CONFIG.player.walkSpeed)
  input.setJumpVelocity(GAME_CONFIG.player.jumpVelocity)
}

// Wire mode toggle button -> switch modes
modeToggle.onModeToggle = () => {
  const newMode = interaction.mode === 'build' ? 'play' : 'build'
  interaction.setMode(newMode)
}

// Wire layer switcher
modeToggle.onLayerSwitch = (layerId) => {
  world.layerManager.currentLayerId = layerId
  const layerDef = world.layerManager.getLayer(layerId)
  if (layerDef) {
    modeToggle.setCurrentGameMode(layerDef.gameMode)
  }
}

modeToggle.onGameModeToggle = (layerId, gameMode) => {
  const layerDef = world.layerManager.getLayer(layerId)
  if (!layerDef) return

  world.saveSnapshot()
  const fromMode = layerDef.gameMode
  layerDef.gameMode = gameMode

  // Auto-set a default floor tile when switching to topdown
  if (gameMode === 'topdown' && !layerDef.backgroundTileId) {
    layerDef.backgroundTileId = 'tile_grass'
  }

  // Trigger visual transition + schedule midpoint remap
  modeSwitchTimer = MODE_SWITCH_DURATION
  modeSwitchPending = true
  pendingLayerId = layerId
  pendingFromMode = fromMode
  pendingToMode = gameMode

  // Update input system if the controlled entity is on this layer
  const ctrlEntity = world.getEntity(controlledEntityId)
  if (ctrlEntity) {
    const lc = ctrlEntity.components.get('layer') as import('./ecs/types').LayerComponent | undefined
    const ctrlLayer = lc?.layerId ?? 'default'
    if (ctrlLayer === layerId) {
      input.setGameMode(gameMode)
      const phys = ctrlEntity.components.get('physics') as import('./ecs/types').PhysicsComponent | undefined
      if (phys) {
        if (gameMode === 'topdown') {
          phys.gravity = false
          phys.velocityY = 0
        } else {
          phys.gravity = true
        }
      }
    }
  }
}

// Initialize layer dropdown
modeToggle.refreshLayers(world.layerManager.layers, world.layerManager.currentLayerId)
const currentLayerDef = world.layerManager.getCurrentLayer()
modeToggle.setCurrentGameMode(currentLayerDef.gameMode)

// Save on navigation/close so the last few seconds aren't lost
window.addEventListener('beforeunload', () => {
  localStorage.setItem('mistral-maker-autosave', world.serialize())
})

// ---------- Wire Toolbar Callbacks ----------

toolbar.onSettings = () => settingsPanel.toggle()
toolbar.onChat = () => chatPanel.toggle()
toolbar.onBestiary = () => bestiaryPanel.toggle()

backpackPanel.onConfigChange = () => {
  physics.setGravity(GAME_CONFIG.physics.gravity)
  input.setWalkSpeed(GAME_CONFIG.player.walkSpeed)
  input.setJumpVelocity(GAME_CONFIG.player.jumpVelocity)
}

backpackPanel.onUseItem = (itemDef, entityId, slotIndex) => {
  if (!itemDef.effect) return
  const eff = itemDef.effect
  switch (eff.type) {
    case 'max_hp_bonus': {
      const hp = world.getComponent(entityId, 'health') as import('./ecs/types').HealthComponent | undefined
      if (hp) {
        hp.maxHp += eff.value
        hp.hp = Math.min(hp.hp + eff.value, hp.maxHp)
        vfx.addHealNumber(
          (world.getComponent(entityId, 'position') as import('./ecs/types').PositionComponent)?.x ?? 0,
          (world.getComponent(entityId, 'position') as import('./ecs/types').PositionComponent)?.y ?? 0,
          eff.value,
        )
      }
      break
    }
    case 'speed_boost':
    case 'crit_boost':
    case 'dodge':
      // Passive effects — equip the item instead of consuming
      break
    default:
      break
  }
  vfx.addToast(`Used ${itemDef.name}`)
}

backpackPanel.onDropItem = (itemDef, entityId) => {
  const pos = world.getComponent(entityId, 'position') as import('./ecs/types').PositionComponent | undefined
  if (!pos) return
  const layerComp = world.getEntity(entityId)?.components.get('layer') as import('./ecs/types').LayerComponent | undefined
  const layerId = layerComp?.layerId ?? 'default'

  const dropId = world.createEntity('dropped_' + itemDef.id)
  world.addComponent(dropId, { type: 'position', x: pos.x, y: pos.y + 16 })
  world.addComponent(dropId, { type: 'sprite', assetId: itemDef.assetId, width: 16, height: 16 })
  world.addComponent(dropId, { type: 'physics', velocityX: 0, velocityY: 0, gravity: true, solid: false })
  world.addComponent(dropId, { type: 'layer', layerId })
  world.addComponent(dropId, { type: 'pickup', itemDef: { ...itemDef } })
}

// ---------- Wire Pause Menu ----------

pauseMenu.onResume = () => {
  loop.start()
}

pauseMenu.onBackToBuild = () => {
  interaction.setMode('build')
  loop.start()
}

// ---------- Wire Callbacks ----------

// Entity selection -> context panel
interaction.onEntitySelected = (id) => {
  // Exit patrol edit if selecting a different entity
  if (interaction.isPatrolEditing) {
    interaction.setPatrolEditEntity(null)
    renderer.setPatrolEditEntity(null)
    contextPanel.patrolEditActive = false
  }
  contextPanel.showEntity(id)
}

// Context panel "Open Backpack" -> open backpack panel
contextPanel.onOpenBackpack = () => backpackPanel.open()

// Context panel "Test Voice" -> play a random line from the NPC dialogue
contextPanel.onTestVoice = (npcType) => {
  const profile = dialogueManager.getProfile(npcType)
  if (!profile) {
    console.warn(`No dialogue profile for "${npcType}"`)
    return
  }
  const line = dialogueManager.pickLine(npcType)
  if (!line) return
  voiceService.speak(line.text, profile.voiceId)
}

// Context panel patrol editing -> canvas interaction + renderer
contextPanel.onEditPatrol = (entityId) => {
  interaction.setPatrolEditEntity(entityId)
  renderer.setPatrolEditEntity(entityId)
}

contextPanel.onExitPatrolEdit = () => {
  interaction.setPatrolEditEntity(null)
  renderer.setPatrolEditEntity(null)
}

// Canvas patrol changes -> refresh context panel
interaction.onPatrolChanged = (entityId) => {
  contextPanel.showEntity(entityId)
}

// Escape exits patrol edit — also notify renderer and context panel
interaction.onPatrolEditExit = () => {
  renderer.setPatrolEditEntity(null)
  contextPanel.patrolEditActive = false
  if (interaction.selectedEntityId) {
    contextPanel.showEntity(interaction.selectedEntityId)
  }
}

// --- Door Link Mode ---
contextPanel.onEnterDoorLinkMode = (entityId) => {
  interaction.enterDoorLinkMode(entityId)
  renderer.setDoorLinkSource(entityId)
}

interaction.onDoorLinked = (_sourceId, _targetId) => {
  renderer.setDoorLinkSource(null)
  // Refresh context panel to show updated link state
  if (interaction.selectedEntityId) {
    contextPanel.showEntity(interaction.selectedEntityId)
  }
}

interaction.onDoorLinkExit = () => {
  renderer.setDoorLinkSource(null)
}

// --- Right-click Move Command ---
interaction.onMoveCommand = (entityId, x, y) => {
  world.addComponent(entityId, {
    type: 'moveTo',
    targetX: x,
    targetY: y,
    speed: GAME_CONFIG.player.walkSpeed,
  })
}

// Context panel entity deletion -> deselect in interaction
contextPanel.onEntityDeleted = (_id) => {
  interaction.selectedEntityId = null
  renderer.setSelectedEntity(null)
}

// Context menu callbacks
contextMenu.onEntityDeleted = (_id) => {
  interaction.selectedEntityId = null
  renderer.setSelectedEntity(null)
  contextPanel.showEntity(null)
}

contextMenu.onEntityDuplicated = (newId) => {
  interaction.selectedEntityId = newId
  renderer.setSelectedEntity(newId)
  contextPanel.showEntity(newId)
}

contextMenu.onEntityChanged = (id) => {
  contextPanel.showEntity(id)
}

contextMenu.onEditPatrol = (entityId) => {
  interaction.selectedEntityId = entityId
  renderer.setSelectedEntity(entityId)
  interaction.setPatrolEditEntity(entityId)
  renderer.setPatrolEditEntity(entityId)
  contextPanel.patrolEditActive = true
  contextPanel.showEntity(entityId)
}

contextMenu.onCameraLock = (entityId) => {
  if (entityId) {
    renderer.setFollowTarget(entityId)
    renderer.setCameraLocked(true)
  } else {
    renderer.setCameraLocked(false)
    // In build mode, stop following; in play mode, keep following controlled entity
    if (interaction.mode === 'build') {
      renderer.setFollowTarget(null)
    }
  }
}

// ---------- Click-to-Control ----------

let controlledEntityId = player

function switchControlTo(entityId: string): void {
  const entity = world.getEntity(entityId)
  if (!entity) return
  // Cancel any active moveTo on the previous controlled entity
  if (controlledEntityId && controlledEntityId !== entityId) {
    world.removeComponent(controlledEntityId, 'moveTo')
  }
  controlledEntityId = entityId
  input.setPlayer(entityId)
  combatSystem.setControlledEntity(entityId)
  renderer.setFollowTarget(entityId)
  renderer.controlledEntityId = entityId
  interaction.controlledEntityId = entityId
  doorSystem.controlledEntityId = entityId
  backpackPanel.setEntity(entityId)

  // Determine game mode from entity's layer
  const layerComp = entity.components.get('layer') as import('./ecs/types').LayerComponent | undefined
  const layerId = layerComp?.layerId ?? 'default'
  const mode = world.layerManager.getGameModeForLayer(layerId)
  input.setGameMode(mode)

  // Toggle gravity based on game mode
  const phys = entity.components.get('physics') as import('./ecs/types').PhysicsComponent | undefined
  if (phys) {
    if (mode === 'topdown') {
      phys.gravity = false
      phys.velocityY = 0
    } else {
      phys.gravity = true
    }
  }
}

// ---------- Custom Character from URL ----------

async function loadCustomCharacter(): Promise<void> {
  const params = new URLSearchParams(window.location.search)
  const charId = params.get('character')
  if (!charId) return

  try {
    const res = await fetch(`/api/characters/${charId}`)
    if (!res.ok) return
    const char = await res.json()

    const spriteData = JSON.parse(char.sprite_data)
    const assetId = `player_${char.id}`

    // Register in sprite registry
    SPRITE_REGISTRY[assetId] = spriteData

    // Build offscreen canvas for renderer
    const offscreen = document.createElement('canvas')
    offscreen.width = spriteData.width
    offscreen.height = spriteData.height
    const ctx = offscreen.getContext('2d')!
    const imageData = ctx.createImageData(spriteData.width, spriteData.height)
    for (let y = 0; y < spriteData.height; y++) {
      for (let x = 0; x < spriteData.width; x++) {
        const hex = spriteData.pixels[y]?.[x]
        if (hex) {
          const i = (y * spriteData.width + x) * 4
          imageData.data[i] = parseInt(hex.slice(1, 3), 16)
          imageData.data[i + 1] = parseInt(hex.slice(3, 5), 16)
          imageData.data[i + 2] = parseInt(hex.slice(5, 7), 16)
          imageData.data[i + 3] = 255
        }
      }
    }
    ctx.putImageData(imageData, 0, 0)
    renderer.registerSprite(assetId, offscreen)

    // Update hero sprite
    const heroEntity = world.getEntity(player)
    if (heroEntity) {
      const sprite = heroEntity.components.get('sprite') as import('./ecs/types').SpriteComponent
      if (sprite) {
        sprite.assetId = assetId
        sprite.width = spriteData.width
        sprite.height = spriteData.height
        if (char.hue_shift) sprite.hueShift = char.hue_shift
      }
    }
  } catch {
    // Character loading failed, proceed with default hero
  }
}

// Initialize control
switchControlTo(player)
loadCustomCharacter()
backpackPanel.setEntity(player)
interaction.setOnControlSwitch(switchControlTo)

// Mode changes -> toggle, renderer, input system
interaction.onModeChange = (mode) => {
  modeToggle.setMode(mode)
  renderer.setMode(mode)
  // WASD works in both modes — character is always controllable
  if (mode === 'play') {
    // Re-apply game mode from current layer (may have been changed in build mode)
    const entity = world.getEntity(controlledEntityId)
    const layerComp = entity?.components.get('layer') as import('./ecs/types').LayerComponent | undefined
    const layerId = layerComp?.layerId ?? 'default'
    const gameMode = world.layerManager.getGameModeForLayer(layerId)
    input.setGameMode(gameMode)
    const phys = entity?.components.get('physics') as import('./ecs/types').PhysicsComponent | undefined
    if (phys) {
      phys.gravity = gameMode !== 'topdown'
      if (gameMode === 'topdown') phys.velocityY = 0
    }
    renderer.setFollowTarget(controlledEntityId)
  } else {
    renderer.setFollowTarget(null)
    // Cancel any active moveTo when switching to build mode
    if (controlledEntityId) {
      world.removeComponent(controlledEntityId, 'moveTo')
    }
    // Close pause menu when switching to build mode
    if (pauseMenu.isOpen) {
      pauseMenu.close()
    }
    // Exit patrol edit when switching modes
    if (interaction.isPatrolEditing) {
      interaction.setPatrolEditEntity(null)
      renderer.setPatrolEditEntity(null)
      contextPanel.patrolEditActive = false
    }
  }
}

// --- Item inference for auto-pickup spawning ---
function deriveItemName(assetId: string): string {
  // Strip 'weapon_' or 'item_' prefix, split on '_', capitalize, reorder
  const stripped = assetId.replace(/^(weapon|item)_/, '')
  const parts = stripped.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1))
  // Put modifier before noun: weapon_sword_fire -> "Fire Sword"
  if (parts.length > 1) {
    const noun = parts.shift()!
    parts.push(noun)
  }
  return parts.join(' ')
}

function inferItemComponents(assetId: string): AnyComponent[] {
  const name = deriveItemName(assetId)
  const components: AnyComponent[] = []

  // Chests get a chest component instead of pickup/consumable
  if (assetId === 'deco_chest') {
    components.push({ type: 'chest', loot: [{ itemType: 'consumable', consumableEffect: 'heal', consumableValue: 20 }], opened: false } as ChestComponent)
    return components
  }

  // Melee weapons
  if (/^weapon_(sword|dagger|axe|hammer)/.test(assetId) || assetId === 'item_sword') {
    const itemDef: ItemDef = { id: assetId, name, assetId, kind: 'melee', damage: 8, range: 40, cooldown: 400 }
    components.push({ type: 'pickup', itemDef })
  }
  // Ranged weapons
  else if (/^weapon_(staff|crossbow)/.test(assetId) || assetId === 'item_bow') {
    const itemDef: ItemDef = { id: assetId, name, assetId, kind: 'ranged', damage: 5, range: 200, cooldown: 600 }
    components.push({ type: 'pickup', itemDef })
  }
  // Shields
  else if (/^weapon_shield/.test(assetId) || assetId === 'item_shield') {
    const itemDef: ItemDef = { id: assetId, name, assetId, kind: 'shield', defense: 2 }
    components.push({ type: 'pickup', itemDef })
  }
  // Passive equippables (rings, boots, amulets, cloaks)
  else if (/^(weapon_ring|item_boots|item_amulet|item_cloak)$/.test(assetId)) {
    const itemDef: ItemDef = { id: assetId, name, assetId, kind: 'passive' }
    components.push({ type: 'pickup', itemDef })
  }
  // Heal consumables (potions, heart)
  else if (/^item_(potion_|heart$)/.test(assetId)) {
    components.push({ type: 'consumable', effect: 'heal', value: 10 })
  }
  // Score consumables (gems, coins)
  else if (/^item_(gem_|coin)/.test(assetId)) {
    components.push({ type: 'consumable', effect: 'score', value: 15 })
  }
  // Material pickups (bone, skull, fang, feather, cloth, circuit, key)
  else if (/^item_(bone|skull|fang|feather|cloth|circuit|key)$/.test(assetId)) {
    const itemDef: ItemDef = { id: assetId, name, assetId, kind: 'passive' }
    components.push({ type: 'pickup', itemDef })
  }

  return components
}

// Asset browser drop -> create entity
interaction.onAssetDrop = (assetId, worldX, worldY) => {
  const sprite = SPRITE_REGISTRY[assetId]
  if (!sprite) return
  world.saveSnapshot()
  const currentMode = world.layerManager.getCurrentLayer().gameMode
  const itemComps = inferItemComponents(assetId)
  const isItem = itemComps.length > 0
  const id = world.createEntity(assetId)
  world.addComponent(id, { type: 'position', x: worldX, y: worldY })
  world.addComponent(id, { type: 'sprite', assetId, width: sprite.width, height: sprite.height })
  world.addComponent(id, { type: 'physics', velocityX: 0, velocityY: 0, gravity: currentMode === 'platformer', solid: !isItem })
  world.addComponent(id, { type: 'layer', layerId: world.layerManager.currentLayerId })
  for (const comp of itemComps) world.addComponent(id, comp)
  interaction.selectedEntityId = id
  renderer.setSelectedEntity(id)
  contextPanel.showEntity(id)
}

// Also support the asset browser's onSpawn callback (click-based spawning)
assetBrowser.onSpawn = (assetId, x, y) => {
  const sprite = SPRITE_REGISTRY[assetId]
  if (!sprite) return
  world.saveSnapshot()
  const currentMode = world.layerManager.getCurrentLayer().gameMode
  const itemComps = inferItemComponents(assetId)
  const isItem = itemComps.length > 0
  const id = world.createEntity(assetId)
  world.addComponent(id, { type: 'position', x, y })
  world.addComponent(id, { type: 'sprite', assetId, width: sprite.width, height: sprite.height })
  world.addComponent(id, { type: 'physics', velocityX: 0, velocityY: 0, gravity: currentMode === 'platformer', solid: !isItem })
  world.addComponent(id, { type: 'layer', layerId: world.layerManager.currentLayerId })
  for (const comp of itemComps) world.addComponent(id, comp)
}

// Pixel editor: create sprite -> register + refresh asset browser
assetBrowser.onCreateSprite = () => pixelEditor.open()
pixelEditor.onSave = (assetId, _sprite, offscreenCanvas) => {
  renderer.registerSprite(assetId, offscreenCanvas)
  assetBrowser.refresh()
}

// ---------- Global Keyboard Shortcuts ----------

// Prevent spacebar from activating focused buttons/selects on the game canvas
// (space is the jump key — it should never trigger UI clicks)
canvasContainer.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault()
  }
})

window.addEventListener('keydown', (e) => {
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

  // ? key -> help overlay
  if (e.key === '?') {
    e.preventDefault()
    helpOverlay.toggle()
    return
  }

  // These shortcuts only fire in build mode to avoid hijacking gameplay keys
  if (interaction.mode === 'build') {
    // T key -> toggle chat panel
    if (e.key === 't' || e.key === 'T') {
      e.preventDefault()
      chatPanel.toggle()
      return
    }

    // B key -> toggle bestiary
    if (e.key === 'b' || e.key === 'B') {
      e.preventDefault()
      bestiaryPanel.toggle()
      return
    }

    // I key -> toggle backpack
    if (e.key === 'i' || e.key === 'I') {
      e.preventDefault()
      backpackPanel.toggle()
      return
    }
  }

  // Escape in play mode -> pause menu
  if (e.code === 'Escape' && interaction.mode === 'play' && !pauseMenu.isOpen) {
    e.preventDefault()
    pauseMenu.open()
    loop.stop()
    return
  }
})

// ---------- Mistral AI Integration ----------
const mistralClient = new MistralClient()
const toolExecutor = new ToolExecutor(world)
const traceCapture = new TraceCapture()
const telemetrySession = new TelemetrySession()
const voiceService = new VoiceService()

chatPanel.onMicPress = async () => {
  if (!voiceService.isSupported) {
    chatPanel.addMessage('assistant', 'Voice input not supported in this browser.')
    return
  }
  chatPanel.setMicRecording(true)
  try {
    const text = await voiceService.startListening()
    chatPanel.setMicRecording(false)
    if (text) {
      chatPanel.addMessage('user', text)
      chatPanel.onSend?.(text)
    }
  } catch {
    chatPanel.setMicRecording(false)
  }
}

chatPanel.onSend = async (text) => {
  chatPanel.addMessage('assistant', 'Thinking...')
  toolbar.setConnectionStatus('processing')

  // Check if this is a critique (AI already generated, player is adjusting)
  const isCritique = traceCapture.hasActiveSnapshot()

  // Update canvas size for trace context
  traceCapture.setCanvasSize(canvas.width, canvas.height)

  try {
    // Save a snapshot before AI modifies the world (for undo)
    world.saveSnapshot()
    const allToolCalls: any[] = []
    const startTime = performance.now()

    let response = await mistralClient.send(text, world)

    // Tool-calling loop: Mistral may return tool calls, we execute them,
    // send results back, and Mistral may return more calls or final text.
    while (response.toolCalls.length > 0) {
      const results: { tool_call_id: string; content: string }[] = []

      for (const tc of response.toolCalls) {
        allToolCalls.push(tc)
        let args: unknown
        try {
          args = JSON.parse(tc.function.arguments)
        } catch {
          results.push({
            tool_call_id: tc.id,
            content: JSON.stringify({ result: 'Failed to parse arguments', error: true }),
          })
          continue
        }

        const result = toolExecutor.execute(tc.function.name, args)
        results.push({
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        })
      }

      // Send tool results back for follow-up
      response = await mistralClient.sendToolResults(results)
    }

    const elapsed = Math.round(performance.now() - startTime)
    traceCapture.setResponseTime(elapsed)

    // Wire model routing info into trace capture
    traceCapture.setModelInfo(response.modelId, response.routingDecision)

    // Build cognitive data from model response
    const cognitive: import('./telemetry/types').CognitiveData = {}
    if (response.textContent) {
      cognitive.thinking = response.textContent
    }
    if (allToolCalls.length > 0) {
      cognitive.plan = allToolCalls.map(tc => tc.function.name).join(' → ')
      cognitive.decisionRationale = `${allToolCalls.length} tool calls for: ${text.slice(0, 100)}`
    }

    if (isCritique) {
      // Critique round: record the critique text + cognitive data from this correction
      traceCapture.addCritique(text, cognitive)
    } else {
      // Fresh prompt: capture the AI's output as snapshot A
      traceCapture.captureAISnapshot(world, text, allToolCalls, cognitive)
    }

    // Remove the "Thinking..." message and show the final response
    removeLastAssistantMessage()
    toolbar.setConnectionStatus('connected')
    if (response.textContent) {
      chatPanel.addMessage('assistant', response.textContent)
      voiceService.speak(response.textContent)
    } else {
      chatPanel.addMessage('assistant', 'Done! I made the changes you requested.')
      voiceService.speak('Done! I made the changes you requested.')
    }
  } catch (err: unknown) {
    removeLastAssistantMessage()
    toolbar.setConnectionStatus('disconnected')
    const message = err instanceof Error ? err.message : String(err)
    chatPanel.addMessage('assistant', `Error: ${message}`)
  }
}

/** Remove the last assistant message (used to clear "Thinking..." indicator). */
function removeLastAssistantMessage(): void {
  const messages = document.querySelectorAll('.chat-overlay-msg-assistant')
  const last = messages[messages.length - 1]
  if (last) last.remove()
}

// Looks Good -> capture trace and submit to telemetry
modeToggle.onLooksGood(async () => {
  const trace = traceCapture.capturePlayerApproval(world)
  if (trace) {
    await telemetrySession.submitTrace(trace)
    modeToggle.setTraceCount(telemetrySession.getTraceCount())
    const kind = trace.type === 'correction' ? 'Correction' : 'Success'
    showTraceToast(`${kind} captured! (${telemetrySession.getTraceCount()} total)`)
  } else {
    showTraceToast('No AI generation to capture yet — send a prompt first!')
  }
})

// Start in build mode: disable player input
// Input always enabled — WASD works in both build and play modes
renderer.setMode('build')

// ---------- Health Check ----------

async function checkServerHealth() {
  try {
    const res = await fetch('/api/health')
    toolbar.setConnectionStatus(res.ok ? 'connected' : 'disconnected')
  } catch {
    toolbar.setConnectionStatus('disconnected')
  }
}
checkServerHealth()
setInterval(checkServerHealth, 30_000)

// ---------- Mode-Switch Transition ----------

let modeSwitchTimer = 0
const MODE_SWITCH_DURATION = 400
let modeSwitchPending = false
let pendingLayerId = ''
let pendingFromMode: 'platformer' | 'topdown' = 'platformer'
let pendingToMode: 'platformer' | 'topdown' = 'topdown'

// ---------- Game Loop ----------

const loop = new GameLoop(
  (dt) => {
    input.update(world)
    facingSystem.update(world)
    physics.update(world, dt)
    const overlaps = physics.getLastOverlaps()
    healthSystem.update(world, dt)
    patrolSystem.update(world, dt)
    moveToSystem.update(world, dt)
    behaviorSystem.update(world, dt, overlaps)
    combatSystem.update(world, dt, overlaps)
    doorSystem.update(world, dt, overlaps, input)
    renderer.setNearbyDoors(doorSystem.getNearbyDoors())
    vfx.update(dt)
    input.endFrame()
    world.layerManager.updateTransition(dt)

    // Mode-switch transition overlay
    if (modeSwitchTimer > 0) {
      const prevTimer = modeSwitchTimer
      modeSwitchTimer = Math.max(0, modeSwitchTimer - dt)
      renderer.setTransitionProgress(1 - modeSwitchTimer / MODE_SWITCH_DURATION)

      // Trigger entity remap at the midpoint (when screen is most opaque)
      if (modeSwitchPending) {
        const prevProgress = 1 - prevTimer / MODE_SWITCH_DURATION
        const curProgress = 1 - modeSwitchTimer / MODE_SWITCH_DURATION
        if (prevProgress < 0.5 && curProgress >= 0.5) {
          performModeSwitch(pendingLayerId, pendingFromMode, pendingToMode)
          modeSwitchPending = false
        }
      }
    } else if (world.layerManager.transition.active) {
      renderer.setTransitionProgress(world.layerManager.transition.progress / world.layerManager.transition.duration)
    } else {
      renderer.setTransitionProgress(0)
    }

    // Drive visual mode from active layer
    const activeLayerDef = world.layerManager.getCurrentLayer()
    renderer.setVisualMode(activeLayerDef.gameMode, activeLayerDef.backgroundTileId)
  },
  (dt) => renderer.render(world, world.layerManager.currentLayerId, dt),
)
loop.start()
