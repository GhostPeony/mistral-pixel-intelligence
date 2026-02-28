import './style.css'
import { World } from './ecs/world'
import { GameLoop } from './engine/game-loop'
import { Renderer } from './engine/renderer'

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement

function resize() {
  const container = canvas.parentElement!
  canvas.width = container.clientWidth
  canvas.height = container.clientHeight
}
resize()
window.addEventListener('resize', resize)

const world = new World()

// Ground
for (let i = 0; i < 20; i++) {
  const tile = world.createEntity(`ground_${i}`)
  world.addComponent(tile, { type: 'position', x: i * 32, y: 400 })
  world.addComponent(tile, { type: 'sprite', assetId: 'tile_grass', width: 32, height: 32 })
  world.addComponent(tile, { type: 'physics', velocityX: 0, velocityY: 0, gravity: false, solid: true })
}

// Player
const player = world.createEntity('hero')
world.addComponent(player, { type: 'position', x: 200, y: 300 })
world.addComponent(player, { type: 'sprite', assetId: 'hero_knight', width: 32, height: 32 })
world.addComponent(player, { type: 'physics', velocityX: 0, velocityY: 0, gravity: true, solid: true })

// Tree
const tree = world.createEntity('oak')
world.addComponent(tree, { type: 'position', x: 100, y: 336 })
world.addComponent(tree, { type: 'sprite', assetId: 'tree_oak', width: 48, height: 64 })
world.addComponent(tree, { type: 'physics', velocityX: 0, velocityY: 0, gravity: false, solid: false })

const renderer = new Renderer(canvas)
const loop = new GameLoop(
  (_dt) => { /* systems come in Task 4 */ },
  () => renderer.render(world, 'default'),
)
loop.start()
