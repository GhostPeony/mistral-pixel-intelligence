import './style.css'

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!

function resize() {
  const container = canvas.parentElement!
  canvas.width = container.clientWidth
  canvas.height = container.clientHeight
}

resize()
window.addEventListener('resize', resize)

ctx.fillStyle = '#1A1720'
ctx.fillRect(0, 0, canvas.width, canvas.height)
ctx.fillStyle = '#F4845F'
ctx.font = '24px "DM Serif Display"'
ctx.textAlign = 'center'
ctx.fillText('Mistral Maker', canvas.width / 2, canvas.height / 2)
