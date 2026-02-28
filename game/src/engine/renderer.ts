import { World } from '../ecs/world'
import type { Entity, PositionComponent, SpriteComponent, HealthComponent } from '../ecs/types'
import { SPRITE_REGISTRY } from '../assets/sprites'

export class Renderer {
  private ctx: CanvasRenderingContext2D
  // Camera
  cameraX = 0
  cameraY = 0
  zoom = 1
  private followTarget: string | null = null
  // Selection
  selectedEntityId: string | null = null
  // Mode
  private mode: 'play' | 'build' = 'build'
  private showGrid = true
  private gridSize = 32
  // Sprite cache (pre-rendered offscreen canvases for each sprite)
  private spriteCache = new Map<string, HTMLCanvasElement>()

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!
    this.ctx.imageSmoothingEnabled = false // Pixel-perfect
    this.preRenderSprites()
  }

  setMode(mode: 'play' | 'build'): void { this.mode = mode }
  setFollowTarget(entityId: string | null): void { this.followTarget = entityId }
  setSelectedEntity(id: string | null): void { this.selectedEntityId = id }
  toggleGrid(): void { this.showGrid = !this.showGrid }

  /** Pre-render all sprites to offscreen canvases for fast blitting */
  private preRenderSprites(): void {
    for (const [assetId, sprite] of Object.entries(SPRITE_REGISTRY)) {
      const offscreen = document.createElement('canvas')
      offscreen.width = sprite.width
      offscreen.height = sprite.height
      const ctx = offscreen.getContext('2d')!
      const imageData = ctx.createImageData(sprite.width, sprite.height)

      for (let y = 0; y < sprite.height; y++) {
        for (let x = 0; x < sprite.width; x++) {
          const hex = sprite.pixels[y]?.[x]
          if (hex) {
            const i = (y * sprite.width + x) * 4
            const r = parseInt(hex.slice(1, 3), 16)
            const g = parseInt(hex.slice(3, 5), 16)
            const b = parseInt(hex.slice(5, 7), 16)
            imageData.data[i] = r
            imageData.data[i + 1] = g
            imageData.data[i + 2] = b
            imageData.data[i + 3] = 255
          }
        }
      }
      ctx.putImageData(imageData, 0, 0)
      this.spriteCache.set(assetId, offscreen)
    }
  }

  /** Convert screen coordinates to world coordinates */
  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect()
    return {
      x: (sx - rect.left) / this.zoom + this.cameraX,
      y: (sy - rect.top) / this.zoom + this.cameraY,
    }
  }

  /** Convert world coordinates to screen coordinates */
  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return {
      x: (wx - this.cameraX) * this.zoom,
      y: (wy - this.cameraY) * this.zoom,
    }
  }

  render(world: World, activeLayer: string): void {
    const ctx = this.ctx
    const w = this.canvas.width
    const h = this.canvas.height

    // Follow target (smooth camera)
    if (this.followTarget && this.mode === 'play') {
      const entity = world.getEntity(this.followTarget)
      if (entity) {
        const pos = entity.components.get('position') as PositionComponent | undefined
        const sprite = entity.components.get('sprite') as SpriteComponent | undefined
        if (pos && sprite) {
          const targetX = pos.x + sprite.width / 2 - w / (2 * this.zoom)
          const targetY = pos.y + sprite.height / 2 - h / (2 * this.zoom)
          this.cameraX += (targetX - this.cameraX) * 0.08
          this.cameraY += (targetY - this.cameraY) * 0.08
        }
      }
    }

    // Clear
    ctx.fillStyle = '#1A1720'
    ctx.fillRect(0, 0, w, h)

    ctx.save()
    ctx.scale(this.zoom, this.zoom)
    ctx.translate(-this.cameraX, -this.cameraY)

    // Grid (build mode only)
    if (this.mode === 'build' && this.showGrid) {
      this.drawGrid(w, h)
    }

    // Entities
    const entities = world.query('position', 'sprite')
    // Sort by Y for depth ordering
    entities.sort((a, b) => {
      const aPos = a.components.get('position') as PositionComponent
      const bPos = b.components.get('position') as PositionComponent
      return aPos.y - bPos.y
    })

    for (const entity of entities) {
      this.drawEntity(ctx, entity, activeLayer)
    }

    ctx.restore()
  }

  private drawEntity(ctx: CanvasRenderingContext2D, entity: Entity, activeLayer: string): void {
    const pos = entity.components.get('position') as PositionComponent
    const sprite = entity.components.get('sprite') as SpriteComponent
    if (!pos || !sprite) return

    // Layer filtering: dim entities on other layers
    const layerComp = entity.components.get('layer')
    const entityLayer = layerComp ? (layerComp as { layerId: string }).layerId : 'default'
    if (entityLayer !== activeLayer) {
      ctx.globalAlpha = 0.3
    }

    // Get cached sprite canvas
    const cachedSprite = this.spriteCache.get(sprite.assetId)

    ctx.save()

    // Handle flipX
    if (sprite.flipX) {
      ctx.translate(pos.x + sprite.width, pos.y)
      ctx.scale(-1, 1)
      if (cachedSprite) {
        ctx.drawImage(cachedSprite, 0, 0, sprite.width, sprite.height)
      } else {
        this.drawFallbackRect(ctx, 0, 0, sprite.width, sprite.height, entity.name)
      }
    } else {
      if (cachedSprite) {
        ctx.drawImage(cachedSprite, pos.x, pos.y, sprite.width, sprite.height)
      } else {
        this.drawFallbackRect(ctx, pos.x, pos.y, sprite.width, sprite.height, entity.name)
      }
    }

    ctx.restore()
    ctx.globalAlpha = 1

    // Health bar
    const health = entity.components.get('health') as HealthComponent | undefined
    if (health && health.hp < health.maxHp) {
      this.drawHealthBar(ctx, pos.x, pos.y - 8, sprite.width, health.hp, health.maxHp)
    }

    // Selection highlight (build mode)
    if (this.mode === 'build' && entity.id === this.selectedEntityId) {
      ctx.strokeStyle = '#F4845F'
      ctx.lineWidth = 2 / this.zoom
      ctx.setLineDash([4 / this.zoom, 4 / this.zoom])
      ctx.strokeRect(pos.x - 2, pos.y - 2, sprite.width + 4, sprite.height + 4)
      ctx.setLineDash([])

      // Resize handles (4 corners)
      const handleSize = 6 / this.zoom
      ctx.fillStyle = '#F4845F'
      const corners = [
        [pos.x - handleSize / 2, pos.y - handleSize / 2],
        [pos.x + sprite.width - handleSize / 2, pos.y - handleSize / 2],
        [pos.x - handleSize / 2, pos.y + sprite.height - handleSize / 2],
        [pos.x + sprite.width - handleSize / 2, pos.y + sprite.height - handleSize / 2],
      ]
      for (const [cx, cy] of corners) {
        ctx.fillRect(cx, cy, handleSize, handleSize)
      }
    }
  }

  private drawFallbackRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, name: string): void {
    ctx.fillStyle = '#F4845F44'
    ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = '#F4845F'
    ctx.lineWidth = 1
    ctx.strokeRect(x, y, w, h)
    ctx.fillStyle = '#FDF6F0'
    ctx.font = `${Math.min(10, w / 4)}px "IBM Plex Mono"`
    ctx.textAlign = 'center'
    ctx.fillText(name, x + w / 2, y + h / 2 + 4)
  }

  private drawHealthBar(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, hp: number, maxHp: number): void {
    const ratio = hp / maxHp
    const barWidth = width
    const barHeight = 4

    ctx.fillStyle = '#2B244088'
    ctx.fillRect(x, y, barWidth, barHeight)

    const color = ratio > 0.5 ? '#4CAF50' : ratio > 0.25 ? '#FFC107' : '#F44336'
    ctx.fillStyle = color
    ctx.fillRect(x, y, barWidth * ratio, barHeight)
  }

  private drawGrid(canvasW: number, canvasH: number): void {
    const ctx = this.ctx
    ctx.strokeStyle = 'rgba(224, 216, 208, 0.1)'
    ctx.lineWidth = 0.5 / this.zoom

    const startX = Math.floor(this.cameraX / this.gridSize) * this.gridSize
    const startY = Math.floor(this.cameraY / this.gridSize) * this.gridSize
    const endX = this.cameraX + canvasW / this.zoom
    const endY = this.cameraY + canvasH / this.zoom

    for (let x = startX; x <= endX; x += this.gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, startY)
      ctx.lineTo(x, endY)
      ctx.stroke()
    }
    for (let y = startY; y <= endY; y += this.gridSize) {
      ctx.beginPath()
      ctx.moveTo(startX, y)
      ctx.lineTo(endX, y)
      ctx.stroke()
    }
  }
}
