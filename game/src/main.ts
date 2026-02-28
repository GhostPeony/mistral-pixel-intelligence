import './style.css'
import { World } from './ecs/world'

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!

function resize() {
  const container = canvas.parentElement!
  canvas.width = container.clientWidth
  canvas.height = container.clientHeight
}
resize()
window.addEventListener('resize', resize)

// Test ECS
const world = new World()
const id = world.createEntity('test')
world.addComponent(id, { type: 'position', x: 100, y: 200 })
console.log('ECS working:', world.serialize())

ctx.fillStyle = '#1A1720'
ctx.fillRect(0, 0, canvas.width, canvas.height)
ctx.fillStyle = '#F4845F'
ctx.font = '24px "DM Serif Display"'
ctx.textAlign = 'center'
ctx.fillText('Mistral Maker', canvas.width / 2, canvas.height / 2)
