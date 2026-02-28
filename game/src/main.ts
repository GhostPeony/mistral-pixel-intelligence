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
import { CanvasInteraction } from './ui/canvas-interaction'
import { AssetBrowser } from './ui/asset-browser'
import { ContextPanel } from './ui/context-panel'
import { ChatPanel } from './ui/chat-panel'
import { ModeToggle } from './ui/mode-toggle'
import { SPRITE_REGISTRY } from './assets/sprites'
import { MistralClient } from './ai/mistral-client'
import { ToolExecutor } from './ai/tool-executor'
import { VoiceService } from './ai/voice'
import { TraceCapture } from './telemetry/trace-capture'
import { TelemetrySession } from './telemetry/session'
import { showTraceToast } from './ui/trace-toast'

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
const canvasContainer = document.getElementById('canvas-container')!
const leftAssetBrowser = document.getElementById('asset-browser')!
const leftChatPanel = document.getElementById('chat-panel')!
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
const combatSystem = new CombatSystem(healthSystem)
const doorSystem = new DoorSystem()

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

input.setPlayer(player)
renderer.setFollowTarget(player)

// ---------- UI Setup ----------

// Canvas interaction (build/play mode, drag, pan, zoom)
const interaction = new CanvasInteraction(canvas, world, renderer)

// Asset browser (left panel top)
const assetBrowser = new AssetBrowser(leftAssetBrowser)

// Chat panel (left panel bottom)
const chatPanel = new ChatPanel(leftChatPanel)

// Context panel (right panel)
const contextPanel = new ContextPanel(rightPanel, world)

// Mode toggle (overlay on canvas)
const modeToggle = new ModeToggle(canvasContainer)

// ---------- Wire Callbacks ----------

// Entity selection -> context panel
interaction.onEntitySelected = (id) => {
  contextPanel.showEntity(id)
}

// Context panel entity deletion -> deselect in interaction
contextPanel.onEntityDeleted = (_id) => {
  interaction.selectedEntityId = null
  renderer.setSelectedEntity(null)
}

// Mode changes -> toggle, renderer, input system
interaction.onModeChange = (mode) => {
  modeToggle.setMode(mode)
  renderer.setMode(mode)
  input.setEnabled(mode === 'play')
  if (mode === 'play') {
    renderer.setFollowTarget(player)
  } else {
    renderer.setFollowTarget(null)
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

  // Check if this is a critique (AI already generated, player is adjusting)
  const isCritique = traceCapture.hasActiveSnapshot()
  if (isCritique) {
    traceCapture.addCritique(text)
  }

  try {
    // Save a snapshot before AI modifies the world (for undo)
    world.saveSnapshot()
    const allToolCalls: any[] = []

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

    // If this was a fresh prompt (not a critique), capture the AI's output as snapshot A
    if (!isCritique) {
      traceCapture.captureAISnapshot(world, text, allToolCalls)
    }

    // Remove the "Thinking..." message and show the final response
    removeLastAssistantMessage()
    if (response.textContent) {
      chatPanel.addMessage('assistant', response.textContent)
      voiceService.speak(response.textContent)
    } else {
      chatPanel.addMessage('assistant', 'Done! I made the changes you requested.')
      voiceService.speak('Done! I made the changes you requested.')
    }
  } catch (err: unknown) {
    removeLastAssistantMessage()
    const message = err instanceof Error ? err.message : String(err)
    chatPanel.addMessage('assistant', `Error: ${message}`)
  }
}

/** Remove the last assistant message (used to clear "Thinking..." indicator). */
function removeLastAssistantMessage(): void {
  const messages = document.querySelectorAll('.chat-msg-assistant')
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
  },
  () => renderer.render(world, 'default'),
)
loop.start()
