export class Background {
  // Sky gradient (pre-computed 1px-wide strip)
  private skyStrip: HTMLCanvasElement

  // Clouds (screen-space with parallax)
  private clouds: { x: number; y: number; width: number; height: number; speed: number; opacity: number }[]

  // Animated grass tiles (4-frame, pre-rendered)
  private grassFrames: HTMLCanvasElement[]
  private grassFrameIndex = 0
  private grassTimer = 0
  private grassFrameDuration = 400 // ms per frame

  constructor() {
    // Pre-compute sky gradient strip
    this.skyStrip = document.createElement('canvas')
    this.skyStrip.width = 1
    this.skyStrip.height = 512
    const ctx = this.skyStrip.getContext('2d')!
    const grad = ctx.createLinearGradient(0, 0, 0, 512)
    grad.addColorStop(0, '#A0CED9')    // sky blue
    grad.addColorStop(0.6, '#FDE8DF')  // peach mist
    grad.addColorStop(1, '#FDF6F0')    // cream
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 1, 512)

    // Generate 5 procedural clouds
    this.clouds = []
    for (let i = 0; i < 5; i++) {
      this.clouds.push({
        x: Math.random() * 2000 - 500,
        y: 30 + Math.random() * 120,
        width: 80 + Math.random() * 120,
        height: 25 + Math.random() * 25,
        speed: 8 + Math.random() * 12,
        opacity: 0.25 + Math.random() * 0.2,
      })
    }

    // Pre-render 4 grass sway frames
    this.grassFrames = []
    for (let frame = 0; frame < 4; frame++) {
      const c = document.createElement('canvas')
      c.width = 32
      c.height = 32
      const gctx = c.getContext('2d')!
      this.drawGrassFrame(gctx, frame)
      this.grassFrames.push(c)
    }
  }

  private drawGrassFrame(ctx: CanvasRenderingContext2D, frame: number): void {
    // Draw a few grass blades with varying sway per frame
    const swayOffsets = [0, 2, 0, -2] // sway pattern across 4 frames
    const sway = swayOffsets[frame]

    ctx.fillStyle = '#5A9C3E'
    // Several thin grass blades
    const blades = [
      { x: 4, h: 12 },
      { x: 10, h: 16 },
      { x: 16, h: 14 },
      { x: 22, h: 18 },
      { x: 28, h: 10 },
    ]
    for (const blade of blades) {
      ctx.beginPath()
      ctx.moveTo(blade.x, 32)
      ctx.lineTo(blade.x + sway, 32 - blade.h)
      ctx.lineTo(blade.x + 2 + sway, 32 - blade.h)
      ctx.lineTo(blade.x + 2, 32)
      ctx.fill()
    }

    // Lighter highlights
    ctx.fillStyle = '#7BC850'
    for (const blade of blades.filter((_, i) => i % 2 === 0)) {
      ctx.beginPath()
      ctx.moveTo(blade.x + 1, 32)
      ctx.lineTo(blade.x + 1 + sway * 0.7, 32 - blade.h * 0.7)
      ctx.lineTo(blade.x + 2 + sway * 0.7, 32 - blade.h * 0.7)
      ctx.lineTo(blade.x + 2, 32)
      ctx.fill()
    }
  }

  /** Render sky gradient + clouds (call BEFORE camera transform) */
  renderScreenSpace(ctx: CanvasRenderingContext2D, w: number, h: number, dt: number, cameraX: number, cameraY: number): void {
    // Sky gradient (stretched from 1px strip)
    ctx.drawImage(this.skyStrip, 0, 0, 1, 512, 0, 0, w, h)

    // Clouds with parallax
    for (const cloud of this.clouds) {
      cloud.x += cloud.speed * (dt / 1000)
      // Wrap around
      if (cloud.x > w + 200) cloud.x = -cloud.width - 100

      const parallaxX = -cameraX * 0.05
      const parallaxY = -cameraY * 0.03
      const cx = cloud.x + parallaxX
      const cy = cloud.y + parallaxY

      ctx.globalAlpha = cloud.opacity
      ctx.fillStyle = '#FFFFFF'
      // Draw as overlapping ellipses for organic shape
      ctx.beginPath()
      ctx.ellipse(cx + cloud.width * 0.3, cy, cloud.width * 0.35, cloud.height * 0.8, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(cx + cloud.width * 0.55, cy - cloud.height * 0.1, cloud.width * 0.3, cloud.height, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(cx + cloud.width * 0.75, cy + cloud.height * 0.05, cloud.width * 0.25, cloud.height * 0.7, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  /** Render flat earth fill for top-down view (call BEFORE camera transform) */
  renderTopDownScreenSpace(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.fillStyle = '#C8B89A'
    ctx.fillRect(0, 0, w, h)
  }

  /** Render tiled floor sprite for top-down view (call AFTER camera transform) */
  renderTopDownWorldSpace(
    ctx: CanvasRenderingContext2D,
    tileId: string | null,
    spriteCache: Map<string, HTMLCanvasElement>,
    cameraX: number, cameraY: number,
    viewW: number, viewH: number, zoom: number,
  ): void {
    if (!tileId) return
    const tileCanvas = spriteCache.get(tileId)
    if (!tileCanvas) return

    const tileSize = 32
    const startX = Math.floor(cameraX / tileSize) * tileSize
    const endX = cameraX + viewW / zoom + tileSize
    const startY = Math.floor(cameraY / tileSize) * tileSize
    const endY = cameraY + viewH / zoom + tileSize

    ctx.globalAlpha = 0.4
    for (let x = startX; x <= endX; x += tileSize) {
      for (let y = startY; y <= endY; y += tileSize) {
        ctx.drawImage(tileCanvas, x, y, tileSize, tileSize)
      }
    }
    ctx.globalAlpha = 1
  }

  /** Render animated grass tiles (call AFTER camera transform, before entities) */
  renderWorldSpace(ctx: CanvasRenderingContext2D, dt: number, cameraX: number, cameraY: number, viewW: number, viewH: number, zoom: number): void {
    // Advance grass animation
    this.grassTimer += dt
    if (this.grassTimer >= this.grassFrameDuration) {
      this.grassTimer -= this.grassFrameDuration
      this.grassFrameIndex = (this.grassFrameIndex + 1) % 4
    }

    const grassY = 380 // Ground level — below this Y coordinate
    const tileSize = 32

    // Cull: only draw visible tiles
    const startX = Math.floor(cameraX / tileSize) * tileSize
    const endX = cameraX + viewW / zoom + tileSize
    const startY = Math.max(grassY, Math.floor(cameraY / tileSize) * tileSize)
    const endY = cameraY + viewH / zoom + tileSize

    // Cap how far down we render grass (no point rendering to infinity)
    const maxY = Math.min(endY, grassY + tileSize * 20)

    ctx.globalAlpha = 0.15
    const frame = this.grassFrames[this.grassFrameIndex]
    for (let x = startX; x <= endX; x += tileSize) {
      for (let y = startY; y <= maxY; y += tileSize) {
        ctx.drawImage(frame, x, y, tileSize, tileSize)
      }
    }
    ctx.globalAlpha = 1
  }
}
