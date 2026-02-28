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

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement

function resize() {
  const container = canvas.parentElement!
  canvas.width = container.clientWidth
  canvas.height = container.clientHeight
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
