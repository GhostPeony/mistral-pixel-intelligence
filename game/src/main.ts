import './style.css'
import { World } from './ecs/world'
import { GameLoop } from './engine/game-loop'
import { Renderer } from './engine/renderer'
import { PhysicsSystem } from './systems/physics'
import { InputSystem } from './systems/input'

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

input.setPlayer(player)
renderer.setFollowTarget(player)

const loop = new GameLoop(
  (dt) => {
    input.update(world)
    physics.update(world, dt)
  },
  () => renderer.render(world, 'default'),
)
loop.start()
