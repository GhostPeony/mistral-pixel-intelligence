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

// Wire VFX
renderer.setVFX(vfx)
combatSystem.setVFX(vfx)
healthSystem.setVFX(vfx)

// Wire layer manager to systems
physics.setLayerManager(world.layerManager)
doorSystem.setLayerManager(world.layerManager)

healthSystem.setOnEntityDeath((entityId, pos, assetId) => {
  const entity = world.getEntity(entityId)
  const layerComp = entity?.components.get('layer') as import('./ecs/types').LayerComponent | undefined
  const layerId = layerComp?.layerId ?? 'default'
  combatSystem.spawnLootDrop(world, pos.x, pos.y, assetId, layerId)
})

// Wire NPC voice lines
behaviorSystem.setOnSayVoice((entityId, npcType) => {
  if (voiceService.isSpeaking) return
  const profile = dialogueManager.getProfile(npcType)
  if (!profile) return
  const line = dialogueManager.pickLine(npcType)
  if (!line) return
  behaviorSystem.setVoiceCooldown(entityId, profile.cooldownMs)
  vfx.addSpeechBubble(entityId, line.text)
  voiceService.speak(line.text, profile.voiceId)
})

// ---------- Scene Setup ----------

// Ground
for (let i = 0; i < 30; i++) {
  const tile = world.createEntity(`ground_${i}`)
  world.addComponent(tile, { type: 'position', x: i * 32, y: 400 })
  world.addComponent(tile, { type: 'sprite', assetId: 'tile_grass', width: 32, height: 32 })
  world.addComponent(tile, { type: 'physics', velocityX: 0, velocityY: 0, gravity: false, solid: true })
}

// Elevated platform
for (let i = 0; i < 5; i++) {
  const plat = world.createEntity(`platform_${i}`)
  world.addComponent(plat, { type: 'position', x: 300 + i * 32, y: 300 })
  world.addComponent(plat, { type: 'sprite', assetId: 'tile_stone', width: 32, height: 32 })
  world.addComponent(plat, { type: 'physics', velocityX: 0, velocityY: 0, gravity: false, solid: true })
}

// Player
const player = world.createEntity('hero')
world.addComponent(player, { type: 'position', x: 200, y: 300 })
world.addComponent(player, { type: 'sprite', assetId: 'hero_knight', width: 32, height: 32 })
world.addComponent(player, { type: 'physics', velocityX: 0, velocityY: 0, gravity: true, solid: true })
world.addComponent(player, { type: 'health', hp: 100, maxHp: 100, invulnerableTimer: 0, spawnX: 200, spawnY: 300, respawnDelay: 0, deadTimer: 0 })
world.addComponent(player, { type: 'facing', direction: 'right' })
world.addComponent(player, {
  type: 'equipment',
  slots: {
    weapon: { id: 'basic_sword', name: 'Sword', assetId: 'item_sword', kind: 'melee', damage: 15, range: 40, cooldown: 400 },
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

// Enemy skeleton
const skeleton = world.createEntity('enemy_skeleton')
world.addComponent(skeleton, { type: 'position', x: 500, y: 368 })
world.addComponent(skeleton, { type: 'sprite', assetId: 'enemy_skeleton', width: 32, height: 32 })
world.addComponent(skeleton, { type: 'physics', velocityX: 0, velocityY: 0, gravity: true, solid: true })
world.addComponent(skeleton, { type: 'health', hp: 30, maxHp: 30, invulnerableTimer: 0, spawnX: 500, spawnY: 368, respawnDelay: 3000, deadTimer: 0 })
world.addComponent(skeleton, {
  type: 'patrol',
  waypoints: [{ x: 400, y: 368 }, { x: 600, y: 368 }],
  currentIndex: 0,
  speed: 60,
  loop: false,
  direction: 1,
})
world.addComponent(skeleton, {
  type: 'behavior',
  rules: [{
    id: 'chase_player',
    description: 'Chase the player when nearby',
    trigger: 'on_proximity 100',
    action: 'move_towards player 80',
    enabled: true,
  }],
})
world.addComponent(skeleton, { type: 'facing', direction: 'left' })

// NPC Guard
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

// input.setPlayer and renderer.setFollowTarget handled by switchControlTo below

// ---------- UI Setup ----------

// Toolbar (top bar with New/Save/Load/Export/Settings)
const toolbar = new Toolbar(toolbarEl, world)

// Settings panel (modal)
const settingsPanel = new SettingsPanel()

// Backpack panel (modal)
const backpackPanel = new BackpackPanel(world)

// Help overlay (? key)
const helpOverlay = new HelpOverlay()

// Pause menu (Escape in play mode)
const pauseMenu = new PauseMenu()

// Canvas interaction (build/play mode, drag, pan, zoom)
const interaction = new CanvasInteraction(canvas, world, renderer)

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

// Mode toggle (overlay on canvas)
const modeToggle = new ModeToggle(canvasContainer)

// Bestiary panel (right panel, toggled)
const bestiaryPanel = new BestiaryPanel(rightPanel, lootManager, renderer)

// ---------- Wire Toolbar Callbacks ----------

toolbar.onSettings = () => settingsPanel.toggle()
toolbar.onChat = () => chatPanel.toggle()
toolbar.onBackpack = () => backpackPanel.toggle()
toolbar.onBestiary = () => bestiaryPanel.toggle()

settingsPanel.onPhysicsChange = (gravity) => {
  physics.setGravity(gravity)
}

settingsPanel.onPlayerChange = (walkSpeed, jumpVelocity) => {
  input.setWalkSpeed(walkSpeed)
  input.setJumpVelocity(jumpVelocity)
}

backpackPanel.onConfigChange = () => {
  physics.setGravity(GAME_CONFIG.physics.gravity)
  input.setWalkSpeed(GAME_CONFIG.player.walkSpeed)
  input.setJumpVelocity(GAME_CONFIG.player.jumpVelocity)
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
  contextPanel.showEntity(id)
}

// Context panel "Open Backpack" -> open backpack panel
contextPanel.onOpenBackpack = () => backpackPanel.open()

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

// ---------- Click-to-Control ----------

let controlledEntityId = player

function switchControlTo(entityId: string): void {
  const entity = world.getEntity(entityId)
  if (!entity) return
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
  if (phys && mode === 'topdown') {
    phys.gravity = false
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
  input.setEnabled(mode === 'play')
  if (mode === 'play') {
    renderer.setFollowTarget(controlledEntityId)
  } else {
    renderer.setFollowTarget(null)
    // Close pause menu when switching to build mode
    if (pauseMenu.isOpen) {
      pauseMenu.close()
    }
  }
}

// Asset browser drop -> create entity
interaction.onAssetDrop = (assetId, worldX, worldY) => {
  const sprite = SPRITE_REGISTRY[assetId]
  if (!sprite) return
  world.saveSnapshot()
  const id = world.createEntity(assetId)
  world.addComponent(id, { type: 'position', x: worldX, y: worldY })
  world.addComponent(id, { type: 'sprite', assetId, width: sprite.width, height: sprite.height })
  interaction.selectedEntityId = id
  renderer.setSelectedEntity(id)
  contextPanel.showEntity(id)
}

// Also support the asset browser's onSpawn callback (click-based spawning)
assetBrowser.onSpawn = (assetId, x, y) => {
  const sprite = SPRITE_REGISTRY[assetId]
  if (!sprite) return
  world.saveSnapshot()
  const id = world.createEntity(assetId)
  world.addComponent(id, { type: 'position', x, y })
  world.addComponent(id, { type: 'sprite', assetId, width: sprite.width, height: sprite.height })
}

// Pixel editor: create sprite -> register + refresh asset browser
assetBrowser.onCreateSprite = () => pixelEditor.open()
pixelEditor.onSave = (assetId, _sprite, offscreenCanvas) => {
  renderer.registerSprite(assetId, offscreenCanvas)
  assetBrowser.refresh()
}

// ---------- Global Keyboard Shortcuts ----------

window.addEventListener('keydown', (e) => {
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

  // ? key -> help overlay
  if (e.key === '?') {
    e.preventDefault()
    helpOverlay.toggle()
    return
  }

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
input.setEnabled(false)
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

// ---------- Game Loop ----------

const loop = new GameLoop(
  (dt) => {
    input.update(world)
    facingSystem.update(world)
    physics.update(world, dt)
    const overlaps = physics.getLastOverlaps()
    healthSystem.update(world, dt)
    patrolSystem.update(world, dt)
    behaviorSystem.update(world, dt, overlaps)
    combatSystem.update(world, dt, overlaps)
    doorSystem.update(world, dt, overlaps)
    vfx.update(dt)
    input.endFrame()
    world.layerManager.updateTransition(dt)
    if (world.layerManager.transition.active) {
      renderer.setTransitionProgress(world.layerManager.transition.progress / world.layerManager.transition.duration)
    } else {
      renderer.setTransitionProgress(0)
    }
  },
  (dt) => renderer.render(world, world.layerManager.currentLayerId, dt),
)
loop.start()
