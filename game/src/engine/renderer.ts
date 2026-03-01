import { World } from '../ecs/world'
import type { Entity, PositionComponent, SpriteComponent, HealthComponent } from '../ecs/types'
import { SPRITE_REGISTRY } from '../assets/sprites'
import { Background } from './background'
import type { VFXSystem, SpeechBubble } from '../systems/vfx'

export class Renderer {
  private ctx: CanvasRenderingContext2D
  // Camera
  cameraX = 0
  cameraY = 0
  zoom = 1
  private followTarget: string | null = null
  // Selection
  selectedEntityId: string | null = null
  controlledEntityId: string | null = null
  // Mode
  private mode: 'play' | 'build' = 'build'
  private showGrid = true
  private gridSize = 32
  // Sprite cache (pre-rendered offscreen canvases for each sprite)
  private spriteCache = new Map<string, HTMLCanvasElement>()
  private background = new Background()
  private vfx: VFXSystem | null = null

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!
    this.ctx.imageSmoothingEnabled = false // Pixel-perfect
    this.preRenderSprites()
  }

  setMode(mode: 'play' | 'build'): void { this.mode = mode }
  setVFX(vfx: VFXSystem): void { this.vfx = vfx }
  setFollowTarget(entityId: string | null): void { this.followTarget = entityId }
  setSelectedEntity(id: string | null): void { this.selectedEntityId = id }
  toggleGrid(): void { this.showGrid = !this.showGrid }

  getSpriteCanvas(assetId: string): HTMLCanvasElement | undefined {
    return this.spriteCache.get(assetId)
  }

  registerSprite(assetId: string, canvas: HTMLCanvasElement): void {
    this.spriteCache.set(assetId, canvas)
  }

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

  render(world: World, activeLayer: string, dt: number = 0): void {
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

    // Sky + clouds (screen-space, before camera transform)
    this.background.renderScreenSpace(ctx, w, h, dt, this.cameraX, this.cameraY)

    ctx.save()
    ctx.scale(this.zoom, this.zoom)
    ctx.translate(-this.cameraX, -this.cameraY)

    // Animated grass (world-space, after camera transform, before entities)
    this.background.renderWorldSpace(ctx, dt, this.cameraX, this.cameraY, w, h, this.zoom)

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

    // VFX: world-space effects (slash arcs, floating texts, pickup prompts, speech bubbles)
    if (this.vfx && this.mode === 'play') {
      this.drawWorldVFX(ctx, world)
    }

    ctx.restore()

    // VFX: screen-space HUD (item toasts)
    if (this.vfx && this.mode === 'play') {
      this.drawScreenVFX(ctx, w, h)
    }

    // Layer transition overlay (skew animation)
    if (this._transitionProgress > 0 && this._transitionProgress < 1) {
      const t = this._transitionProgress
      // Fade to white at midpoint, then fade back
      const alpha = t < 0.5 ? t * 2 : (1 - t) * 2
      ctx.fillStyle = `rgba(253, 246, 240, ${alpha * 0.7})`
      ctx.fillRect(0, 0, w, h)
    }
  }

  private _transitionProgress = 0

  setTransitionProgress(p: number): void {
    this._transitionProgress = p
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

    // Invulnerability flash: skip rendering every other 100ms to create blink
    if (this.vfx && this.vfx.isFlashing(entity.id)) {
      if (Math.floor(Date.now() / 80) % 2 === 0) {
        ctx.globalAlpha = 1
        return
      }
    }

    // Get cached sprite canvas (with optional hue shift)
    const cachedSprite = sprite.hueShift
      ? this.getHueShiftedSprite(sprite.assetId, sprite.hueShift)
      : this.spriteCache.get(sprite.assetId)

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

    // Controlled entity indicator (play mode — green triangle above)
    if (this.mode === 'play' && entity.id === this.controlledEntityId) {
      const triSize = 6 / this.zoom
      const triX = pos.x + sprite.width / 2
      const triY = pos.y - 10
      ctx.fillStyle = '#48BB78'
      ctx.beginPath()
      ctx.moveTo(triX, triY - triSize)
      ctx.lineTo(triX - triSize, triY + triSize)
      ctx.lineTo(triX + triSize, triY + triSize)
      ctx.closePath()
      ctx.fill()
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

  /** Get a hue-shifted version of a sprite, using cache to avoid recomputing */
  private getHueShiftedSprite(assetId: string, hueShift: number): HTMLCanvasElement | undefined {
    const cacheKey = `${assetId}_hue${Math.round(hueShift)}`
    const cached = this.spriteCache.get(cacheKey)
    if (cached) return cached

    const baseSprite = this.spriteCache.get(assetId)
    if (!baseSprite) return undefined

    const offscreen = document.createElement('canvas')
    offscreen.width = baseSprite.width
    offscreen.height = baseSprite.height
    const ctx = offscreen.getContext('2d')!

    ctx.drawImage(baseSprite, 0, 0)
    const imageData = ctx.getImageData(0, 0, offscreen.width, offscreen.height)
    const data = imageData.data
    const hueOffset = hueShift / 360

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue // skip transparent pixels
      const [h, s, l] = this.rgbToHsl(data[i], data[i + 1], data[i + 2])
      const newH = (h + hueOffset) % 1
      const [r, g, b] = this.hslToRgb(newH, s, l)
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
    }

    ctx.putImageData(imageData, 0, 0)
    this.spriteCache.set(cacheKey, offscreen)
    return offscreen
  }

  /** Convert RGB (0-255) to HSL (0-1) */
  private rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255
    g /= 255
    b /= 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const l = (max + min) / 2
    let h = 0
    let s = 0

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
        case g: h = ((b - r) / d + 2) / 6; break
        case b: h = ((r - g) / d + 4) / 6; break
      }
    }

    return [h, s, l]
  }

  /** Convert HSL (0-1) to RGB (0-255) */
  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    if (s === 0) {
      const v = Math.round(l * 255)
      return [v, v, v]
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q

    const hue2rgb = (t: number): number => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    return [
      Math.round(hue2rgb(h + 1 / 3) * 255),
      Math.round(hue2rgb(h) * 255),
      Math.round(hue2rgb(h - 1 / 3) * 255),
    ]
  }

  private drawWorldVFX(ctx: CanvasRenderingContext2D, world: World): void {
    if (!this.vfx) return

    // Slash arcs
    for (const arc of this.vfx.slashArcs) {
      const progress = arc.age / arc.lifetime
      const alpha = 1 - progress
      ctx.save()
      ctx.globalAlpha = alpha * 0.8
      ctx.strokeStyle = arc.color
      ctx.lineWidth = 3 - progress * 2
      ctx.lineCap = 'round'
      // Animate the sweep
      const sweepProgress = Math.min(progress * 2, 1)
      const currentEnd = arc.startAngle + (arc.endAngle - arc.startAngle) * sweepProgress
      ctx.beginPath()
      ctx.arc(arc.x, arc.y, arc.radius * (0.5 + progress * 0.5), arc.startAngle, currentEnd)
      ctx.stroke()
      // Inner arc
      ctx.globalAlpha = alpha * 0.4
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(arc.x, arc.y, arc.radius * (0.3 + progress * 0.3), arc.startAngle, currentEnd)
      ctx.stroke()
      ctx.restore()
    }

    // Floating texts (damage/heal numbers)
    for (const ft of this.vfx.floatingTexts) {
      const progress = ft.age / ft.lifetime
      const alpha = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.font = `bold ${ft.fontSize}px "IBM Plex Mono"`
      ctx.textAlign = 'center'
      // Outline for readability
      ctx.strokeStyle = '#2B2440'
      ctx.lineWidth = 3
      ctx.strokeText(ft.text, ft.x, ft.y)
      ctx.fillStyle = ft.color
      ctx.fillText(ft.text, ft.x, ft.y)
      ctx.restore()
    }

    // Pickup prompts ("Press F")
    for (const prompt of this.vfx.pickupPrompts) {
      const bobY = Math.sin(Date.now() / 300) * 2
      const py = prompt.y - 14 + bobY
      ctx.save()
      ctx.globalAlpha = 0.9
      // Background pill
      ctx.font = 'bold 8px "IBM Plex Mono"'
      const text = '[F] Pick up'
      const metrics = ctx.measureText(text)
      const pw = metrics.width + 8
      const ph = 12
      const px = prompt.x + prompt.width / 2 - pw / 2
      ctx.fillStyle = 'rgba(43, 36, 64, 0.85)'
      ctx.beginPath()
      ctx.roundRect(px, py - ph + 2, pw, ph, 3)
      ctx.fill()
      // Text
      ctx.fillStyle = '#FDF6F0'
      ctx.textAlign = 'center'
      ctx.fillText(text, prompt.x + prompt.width / 2, py)
      ctx.restore()
    }

    // Speech bubbles
    for (const bubble of this.vfx.speechBubbles) {
      this.drawSpeechBubble(ctx, bubble, world)
    }
  }

  private drawSpeechBubble(ctx: CanvasRenderingContext2D, bubble: SpeechBubble, world: World): void {
    const entity = world.getEntity(bubble.entityId)
    if (!entity) return
    const pos = entity.components.get('position') as PositionComponent | undefined
    const sprite = entity.components.get('sprite') as SpriteComponent | undefined
    if (!pos || !sprite) return

    const progress = bubble.age / bubble.lifetime
    // Fade out during last 20% of lifetime
    const alpha = progress > 0.8 ? 1 - (progress - 0.8) / 0.2 : 1

    ctx.save()
    ctx.globalAlpha = alpha

    // Word wrap
    const maxWidth = 120
    const fontSize = 9
    const lineHeight = fontSize + 3
    ctx.font = `${fontSize}px "IBM Plex Mono"`
    const words = bubble.text.split(' ')
    const lines: string[] = []
    let currentLine = ''
    for (const word of words) {
      const test = currentLine ? `${currentLine} ${word}` : word
      if (ctx.measureText(test).width > maxWidth) {
        if (currentLine) lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = test
      }
    }
    if (currentLine) lines.push(currentLine)

    // Measure bubble dimensions
    let bubbleWidth = 0
    for (const line of lines) {
      bubbleWidth = Math.max(bubbleWidth, ctx.measureText(line).width)
    }
    const padH = 8
    const padV = 6
    bubbleWidth += padH * 2
    const bubbleHeight = lines.length * lineHeight + padV * 2
    const tailHeight = 6

    // Position bubble above entity, centered
    const bx = pos.x + sprite.width / 2 - bubbleWidth / 2
    const by = pos.y - bubbleHeight - tailHeight - 4

    // Background rounded rect
    ctx.fillStyle = 'rgba(43, 36, 64, 0.9)'
    ctx.beginPath()
    ctx.roundRect(bx, by, bubbleWidth, bubbleHeight, 4)
    ctx.fill()

    // Tail triangle pointing down to entity
    const tailX = pos.x + sprite.width / 2
    ctx.beginPath()
    ctx.moveTo(tailX - 4, by + bubbleHeight)
    ctx.lineTo(tailX, by + bubbleHeight + tailHeight)
    ctx.lineTo(tailX + 4, by + bubbleHeight)
    ctx.closePath()
    ctx.fill()

    // Text
    ctx.fillStyle = '#FDF6F0'
    ctx.textAlign = 'left'
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], bx + padH, by + padV + fontSize + i * lineHeight)
    }

    ctx.restore()
  }

  private drawScreenVFX(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (!this.vfx) return

    // Item toasts (bottom center of screen)
    const toasts = this.vfx.itemToasts
    for (let i = 0; i < toasts.length; i++) {
      const toast = toasts[i]
      const progress = toast.age / toast.lifetime
      // Slide up and fade out
      const alpha = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3
      const slideY = progress < 0.1 ? (1 - progress / 0.1) * 20 : 0

      ctx.save()
      ctx.globalAlpha = alpha
      ctx.font = '12px "IBM Plex Mono"'
      ctx.textAlign = 'center'
      const text = toast.text
      const metrics = ctx.measureText(text)
      const tx = w / 2
      const ty = h - 60 - i * 24 + slideY

      // Background pill
      ctx.fillStyle = 'rgba(43, 36, 64, 0.85)'
      const pillW = metrics.width + 16
      const pillH = 20
      ctx.beginPath()
      ctx.roundRect(tx - pillW / 2, ty - pillH + 4, pillW, pillH, 4)
      ctx.fill()

      // Text
      ctx.fillStyle = '#4CAF50'
      ctx.fillText(text, tx, ty)
      ctx.restore()
    }
  }

  private drawGrid(canvasW: number, canvasH: number): void {
    const ctx = this.ctx
    ctx.strokeStyle = 'rgba(43, 36, 64, 0.12)'
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
