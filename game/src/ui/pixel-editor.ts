import { SPRITE_REGISTRY, type SpriteData } from '../assets/sprites'

const GRID_SIZES = [16, 32] as const

// Quick palette — Mistral colors
const PALETTE = [
  '#F4845F', '#FDE8DF', '#FDF6F0', '#2B2440',
  '#E8868B', '#A0CED9', '#5A9C3E', '#FFD700',
  '#8B5A2B', '#AAAAAA', '#555555', '#222222',
]

type Tool = 'pencil' | 'eraser' | 'fill'

export class PixelEditor {
  private overlay: HTMLElement | null = null
  private pixelCanvas: HTMLCanvasElement | null = null
  private pixelCtx: CanvasRenderingContext2D | null = null
  private gridSize: 16 | 32 = 16
  private pixels: (string | null)[][] = []
  private currentColor = PALETTE[0]
  private recentColors: string[] = []
  private tool: Tool = 'pencil'
  private isDrawing = false
  private nameInput: HTMLInputElement | null = null

  onSave: ((assetId: string, sprite: SpriteData, canvas: HTMLCanvasElement) => void) | null = null

  constructor() {}

  isOpen(): boolean {
    return this.overlay !== null
  }

  open(): void {
    this.close()
    this.initGrid(this.gridSize)

    // Overlay
    this.overlay = document.createElement('div')
    this.overlay.className = 'pixel-editor-overlay'

    const modal = document.createElement('div')
    modal.className = 'pixel-editor-modal'

    // Header
    const header = document.createElement('div')
    header.className = 'pixel-editor-header'

    const title = document.createElement('span')
    title.className = 'pixel-editor-title'
    title.textContent = 'Pixel Editor'
    header.appendChild(title)

    const closeBtn = document.createElement('button')
    closeBtn.className = 'settings-close'
    closeBtn.textContent = '\u00D7'
    closeBtn.addEventListener('click', () => this.close())
    header.appendChild(closeBtn)

    modal.appendChild(header)

    // Grid size toggle
    const sizeRow = document.createElement('div')
    sizeRow.className = 'pixel-size-row'
    for (const size of GRID_SIZES) {
      const btn = document.createElement('button')
      btn.className = `pixel-size-btn ${size === this.gridSize ? 'pixel-size-btn-active' : ''}`
      btn.textContent = `${size}x${size}`
      btn.addEventListener('click', () => {
        this.gridSize = size
        this.open() // Re-render
      })
      sizeRow.appendChild(btn)
    }
    modal.appendChild(sizeRow)

    // Canvas
    const canvasWrapper = document.createElement('div')
    canvasWrapper.className = 'pixel-canvas-wrapper'

    this.pixelCanvas = document.createElement('canvas')
    const displaySize = this.gridSize === 16 ? 320 : 384
    this.pixelCanvas.width = displaySize
    this.pixelCanvas.height = displaySize
    this.pixelCanvas.className = 'pixel-editor-canvas'
    this.pixelCtx = this.pixelCanvas.getContext('2d')!
    this.pixelCtx.imageSmoothingEnabled = false

    this.pixelCanvas.addEventListener('mousedown', this.onCanvasMouseDown)
    this.pixelCanvas.addEventListener('mousemove', this.onCanvasMouseMove)
    this.pixelCanvas.addEventListener('mouseup', () => { this.isDrawing = false })
    this.pixelCanvas.addEventListener('mouseleave', () => { this.isDrawing = false })
    this.pixelCanvas.addEventListener('contextmenu', (e) => e.preventDefault())

    canvasWrapper.appendChild(this.pixelCanvas)
    modal.appendChild(canvasWrapper)

    // Tools row
    const toolsRow = document.createElement('div')
    toolsRow.className = 'pixel-tools'
    const tools: { name: Tool; label: string }[] = [
      { name: 'pencil', label: 'Pencil' },
      { name: 'eraser', label: 'Eraser' },
      { name: 'fill', label: 'Fill' },
    ]
    for (const t of tools) {
      const btn = document.createElement('button')
      btn.className = `pixel-tool-btn ${this.tool === t.name ? 'pixel-tool-btn-active' : ''}`
      btn.textContent = t.label
      btn.addEventListener('click', () => {
        this.tool = t.name
        // Update active state
        toolsRow.querySelectorAll('.pixel-tool-btn').forEach(b => b.classList.remove('pixel-tool-btn-active'))
        btn.classList.add('pixel-tool-btn-active')
      })
      toolsRow.appendChild(btn)
    }
    modal.appendChild(toolsRow)

    // Palette
    const paletteEl = document.createElement('div')
    paletteEl.className = 'pixel-palette'

    // Quick palette
    const quickRow = document.createElement('div')
    quickRow.className = 'pixel-palette-row'
    for (const color of PALETTE) {
      const swatch = this.createSwatch(color, quickRow)
      quickRow.appendChild(swatch)
    }
    paletteEl.appendChild(quickRow)

    // Recent colors
    if (this.recentColors.length > 0) {
      const recentLabel = document.createElement('div')
      recentLabel.className = 'pixel-palette-label'
      recentLabel.textContent = 'Recent'
      paletteEl.appendChild(recentLabel)

      const recentRow = document.createElement('div')
      recentRow.className = 'pixel-palette-row'
      for (const color of this.recentColors) {
        const swatch = this.createSwatch(color, recentRow)
        recentRow.appendChild(swatch)
      }
      paletteEl.appendChild(recentRow)
    }

    // Custom color picker
    const customRow = document.createElement('div')
    customRow.className = 'pixel-custom-color-row'
    const colorInput = document.createElement('input')
    colorInput.type = 'color'
    colorInput.className = 'pixel-color-input'
    colorInput.value = this.currentColor
    colorInput.addEventListener('input', () => {
      this.currentColor = colorInput.value
      this.addRecentColor(colorInput.value)
    })
    const colorLabel = document.createElement('span')
    colorLabel.className = 'pixel-color-label'
    colorLabel.textContent = 'Custom'
    customRow.appendChild(colorInput)
    customRow.appendChild(colorLabel)
    paletteEl.appendChild(customRow)

    modal.appendChild(paletteEl)

    // Name + Save
    const saveRow = document.createElement('div')
    saveRow.className = 'pixel-save-row'

    this.nameInput = document.createElement('input')
    this.nameInput.type = 'text'
    this.nameInput.className = 'editor-input'
    this.nameInput.placeholder = 'sprite name (e.g. hero_custom)'
    this.nameInput.value = `custom_${Date.now().toString(36)}`
    saveRow.appendChild(this.nameInput)

    const saveBtn = document.createElement('button')
    saveBtn.className = 'pixel-save-btn'
    saveBtn.textContent = 'Save Sprite'
    saveBtn.addEventListener('click', () => this.save())
    saveRow.appendChild(saveBtn)

    modal.appendChild(saveRow)

    this.overlay.appendChild(modal)
    document.body.appendChild(this.overlay)

    this.renderPixels()
  }

  close(): void {
    if (this.overlay) {
      this.overlay.remove()
      this.overlay = null
    }
    this.pixelCanvas = null
    this.pixelCtx = null
  }

  private initGrid(size: number): void {
    // Preserve pixels if same size, otherwise reset
    if (this.pixels.length !== size) {
      this.pixels = []
      for (let y = 0; y < size; y++) {
        this.pixels.push(new Array(size).fill(null))
      }
    }
  }

  private createSwatch(color: string, _parent: HTMLElement): HTMLElement {
    const swatch = document.createElement('div')
    swatch.className = `pixel-swatch ${color === this.currentColor ? 'pixel-swatch-active' : ''}`
    swatch.style.background = color
    swatch.addEventListener('click', () => {
      this.currentColor = color
      // Update active swatch indicators
      document.querySelectorAll('.pixel-swatch').forEach(s => s.classList.remove('pixel-swatch-active'))
      swatch.classList.add('pixel-swatch-active')
    })
    return swatch
  }

  private onCanvasMouseDown = (e: MouseEvent): void => {
    e.preventDefault()
    this.isDrawing = true
    const { gx, gy } = this.getGridPos(e)
    if (e.button === 2) {
      // Right-click: pick color
      const existing = this.pixels[gy]?.[gx]
      if (existing) {
        this.currentColor = existing
        this.addRecentColor(existing)
      }
      this.isDrawing = false
      return
    }
    this.applyTool(gx, gy)
    this.renderPixels()
  }

  private onCanvasMouseMove = (e: MouseEvent): void => {
    if (!this.isDrawing) return
    const { gx, gy } = this.getGridPos(e)
    if (this.tool === 'pencil' || this.tool === 'eraser') {
      this.applyTool(gx, gy)
      this.renderPixels()
    }
  }

  private getGridPos(e: MouseEvent): { gx: number; gy: number } {
    if (!this.pixelCanvas) return { gx: 0, gy: 0 }
    const rect = this.pixelCanvas.getBoundingClientRect()
    const cellSize = rect.width / this.gridSize
    const gx = Math.floor((e.clientX - rect.left) / cellSize)
    const gy = Math.floor((e.clientY - rect.top) / cellSize)
    return { gx: Math.max(0, Math.min(this.gridSize - 1, gx)), gy: Math.max(0, Math.min(this.gridSize - 1, gy)) }
  }

  private applyTool(gx: number, gy: number): void {
    if (gx < 0 || gx >= this.gridSize || gy < 0 || gy >= this.gridSize) return
    if (this.tool === 'pencil') {
      this.pixels[gy][gx] = this.currentColor
      this.addRecentColor(this.currentColor)
    } else if (this.tool === 'eraser') {
      this.pixels[gy][gx] = null
    } else if (this.tool === 'fill') {
      this.floodFill(gx, gy, this.pixels[gy][gx], this.currentColor)
      this.addRecentColor(this.currentColor)
    }
  }

  private floodFill(x: number, y: number, targetColor: string | null, fillColor: string): void {
    if (targetColor === fillColor) return
    const stack: [number, number][] = [[x, y]]
    const visited = new Set<string>()

    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!
      const key = `${cx},${cy}`
      if (visited.has(key)) continue
      if (cx < 0 || cx >= this.gridSize || cy < 0 || cy >= this.gridSize) continue
      if (this.pixels[cy][cx] !== targetColor) continue

      visited.add(key)
      this.pixels[cy][cx] = fillColor
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1])
    }
  }

  private addRecentColor(color: string): void {
    this.recentColors = this.recentColors.filter(c => c !== color)
    this.recentColors.unshift(color)
    if (this.recentColors.length > 5) this.recentColors.pop()
  }

  private renderPixels(): void {
    if (!this.pixelCtx || !this.pixelCanvas) return
    const ctx = this.pixelCtx
    const displaySize = this.pixelCanvas.width
    const cellSize = displaySize / this.gridSize

    // Clear with warm checker pattern
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#F0E8E0' : '#E8DDD4'
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
      }
    }

    // Draw pixels
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const color = this.pixels[y][x]
        if (color) {
          ctx.fillStyle = color
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
        }
      }
    }

    // Grid lines
    ctx.strokeStyle = 'rgba(43, 36, 64, 0.1)'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= this.gridSize; i++) {
      ctx.beginPath()
      ctx.moveTo(i * cellSize, 0)
      ctx.lineTo(i * cellSize, displaySize)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i * cellSize)
      ctx.lineTo(displaySize, i * cellSize)
      ctx.stroke()
    }
  }

  private save(): void {
    const name = this.nameInput?.value?.trim()
    if (!name) return

    // Ensure name starts with custom_ prefix
    const assetId = name.startsWith('custom_') ? name : `custom_${name}`

    // Build SpriteData
    const pixelData: string[][] = []
    for (let y = 0; y < this.gridSize; y++) {
      const row: string[] = []
      for (let x = 0; x < this.gridSize; x++) {
        row.push(this.pixels[y][x] ?? '')
      }
      pixelData.push(row)
    }

    const sprite: SpriteData = {
      width: this.gridSize,
      height: this.gridSize,
      pixels: pixelData,
    }

    // Register in SPRITE_REGISTRY
    SPRITE_REGISTRY[assetId] = sprite

    // Build offscreen canvas for rendering
    const offscreen = document.createElement('canvas')
    offscreen.width = this.gridSize
    offscreen.height = this.gridSize
    const ctx = offscreen.getContext('2d')!
    const imageData = ctx.createImageData(this.gridSize, this.gridSize)
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const hex = pixelData[y][x]
        if (hex) {
          const i = (y * this.gridSize + x) * 4
          imageData.data[i] = parseInt(hex.slice(1, 3), 16)
          imageData.data[i + 1] = parseInt(hex.slice(3, 5), 16)
          imageData.data[i + 2] = parseInt(hex.slice(5, 7), 16)
          imageData.data[i + 3] = 255
        }
      }
    }
    ctx.putImageData(imageData, 0, 0)

    this.onSave?.(assetId, sprite, offscreen)
    this.close()
  }
}
