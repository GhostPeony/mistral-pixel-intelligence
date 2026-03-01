import { SPRITE_REGISTRY, SKIN_PALETTES, HAIR_PALETTES, type SpriteData } from '../assets/sprites'

interface CharacterRecord {
  id: number
  name: string
  sprite_data: string
  skin_palette: number
  hair_palette: number
  hue_shift: number
  base_template: string | null
  created_at: string
  updated_at: string
}

const PALETTE = [
  '#F4845F', '#FDE8DF', '#FDF6F0', '#2B2440',
  '#E8868B', '#A0CED9', '#5A9C3E', '#FFD700',
  '#8B5A2B', '#AAAAAA', '#555555', '#222222',
  '#FFFFFF', '#FF0000', '#0000FF', '#00AA00',
]

const GRID_SIZE = 32
const DISPLAY_SIZE = 384
const CELL_SIZE = DISPLAY_SIZE / GRID_SIZE

type Tool = 'pencil' | 'eraser' | 'fill'

const TEMPLATE_HEROES = [
  { id: 'hero_knight', label: 'Knight' },
  { id: 'hero_mage', label: 'Mage' },
  { id: 'hero_thief', label: 'Thief' },
  { id: 'hero_cleric', label: 'Cleric' },
  { id: 'hero_berserker', label: 'Berserker' },
  { id: 'hero_witch', label: 'Witch' },
  { id: 'hero_ranger', label: 'Ranger' },
]

export class CharacterCreator {
  private overlay: HTMLElement | null = null
  private pixels: (string | null)[][] = []
  private currentColor = PALETTE[0]
  private tool: Tool = 'pencil'
  private isDrawing = false
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private editingChar: CharacterRecord | null = null
  private skinPalette = 2
  private hairPalette = 1
  private hueShift = 0
  private baseTemplate: string | null = null
  private nameValue = ''

  constructor(private onSave: () => void) {}

  open(existingChar?: CharacterRecord) {
    this.close()
    this.editingChar = existingChar ?? null

    if (existingChar) {
      // Load existing character data directly into editor
      const spriteData: SpriteData = JSON.parse(existingChar.sprite_data)
      this.pixels = []
      for (let y = 0; y < GRID_SIZE; y++) {
        const row: (string | null)[] = []
        for (let x = 0; x < GRID_SIZE; x++) {
          const px = spriteData.pixels[y]?.[x]
          row.push(px && px !== '' ? px : null)
        }
        this.pixels.push(row)
      }
      this.nameValue = existingChar.name
      this.skinPalette = existingChar.skin_palette
      this.hairPalette = existingChar.hair_palette
      this.hueShift = existingChar.hue_shift
      this.baseTemplate = existingChar.base_template
      this.renderEditorStep()
    } else {
      // Reset state
      this.initBlankGrid()
      this.nameValue = ''
      this.skinPalette = 2
      this.hairPalette = 1
      this.hueShift = 0
      this.baseTemplate = null
      this.renderTemplateStep()
    }
  }

  close() {
    if (this.overlay) {
      this.overlay.remove()
      this.overlay = null
    }
    this.canvas = null
    this.ctx = null
  }

  private initBlankGrid() {
    this.pixels = []
    for (let y = 0; y < GRID_SIZE; y++) {
      this.pixels.push(new Array(GRID_SIZE).fill(null))
    }
  }

  private loadFromSprite(sprite: SpriteData) {
    this.pixels = []
    for (let y = 0; y < GRID_SIZE; y++) {
      const row: (string | null)[] = []
      for (let x = 0; x < GRID_SIZE; x++) {
        const px = sprite.pixels[y]?.[x]
        row.push(px && px !== '' ? px : null)
      }
      this.pixels.push(row)
    }
  }

  private createOverlay(): HTMLElement {
    this.overlay = document.createElement('div')
    this.overlay.className = 'cc-overlay'
    Object.assign(this.overlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
      background: 'rgba(27, 32, 64, 0.7)', zIndex: '1000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    })
    document.body.appendChild(this.overlay)
    return this.overlay
  }

  private renderTemplateStep() {
    const overlay = this.createOverlay()

    const modal = document.createElement('div')
    modal.className = 'cc-modal'
    Object.assign(modal.style, {
      background: '#FDF6F0', border: '2px solid #1B2040', boxShadow: '4px 4px 0 #1B2040',
      padding: '40px', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto',
    })

    // Header
    const header = document.createElement('div')
    Object.assign(header.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' })
    const title = document.createElement('h2')
    title.textContent = 'Choose a Starting Point'
    Object.assign(title.style, { fontFamily: "'DM Serif Display', serif", fontSize: '28px', margin: '0' })
    const closeBtn = document.createElement('button')
    closeBtn.textContent = '\u00D7'
    Object.assign(closeBtn.style, { background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer' })
    closeBtn.addEventListener('click', () => this.close())
    header.appendChild(title)
    header.appendChild(closeBtn)
    modal.appendChild(header)

    // Template grid
    const grid = document.createElement('div')
    Object.assign(grid.style, {
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px',
    })

    // Hero templates
    for (const tmpl of TEMPLATE_HEROES) {
      const sprite = SPRITE_REGISTRY[tmpl.id]
      if (!sprite) continue
      const btn = document.createElement('button')
      Object.assign(btn.style, {
        background: '#FFFFFF', border: '2px solid #1B2040', padding: '16px',
        cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
        boxShadow: '2px 2px 0 #1B2040', transition: 'all 0.15s ease',
      })
      btn.addEventListener('mouseenter', () => { btn.style.transform = 'translate(1px, 1px)'; btn.style.boxShadow = '1px 1px 0 #1B2040' })
      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; btn.style.boxShadow = '2px 2px 0 #1B2040' })

      const canvas = this.renderSpriteToCanvas(sprite, 64, 64)
      canvas.style.imageRendering = 'pixelated'
      btn.appendChild(canvas)

      const label = document.createElement('span')
      label.textContent = tmpl.label
      Object.assign(label.style, { fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' })
      btn.appendChild(label)

      btn.addEventListener('click', () => {
        this.loadFromSprite(sprite)
        this.baseTemplate = tmpl.id
        overlay.remove()
        this.overlay = null
        this.renderEditorStep()
      })
      grid.appendChild(btn)
    }

    // Blank Canvas
    const blankBtn = document.createElement('button')
    Object.assign(blankBtn.style, {
      background: '#FFFFFF', border: '2px dashed #1B2040', padding: '16px',
      cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
      minHeight: '110px', transition: 'all 0.15s ease',
    })
    const plus = document.createElement('span')
    plus.textContent = '+'
    Object.assign(plus.style, { fontSize: '32px', color: '#5A607A' })
    blankBtn.appendChild(plus)
    const blankLabel = document.createElement('span')
    blankLabel.textContent = 'Blank'
    Object.assign(blankLabel.style, { fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#5A607A' })
    blankBtn.appendChild(blankLabel)
    blankBtn.addEventListener('click', () => {
      this.initBlankGrid()
      this.baseTemplate = null
      overlay.remove()
      this.overlay = null
      this.renderEditorStep()
    })
    grid.appendChild(blankBtn)

    modal.appendChild(grid)
    overlay.appendChild(modal)
  }

  private renderEditorStep() {
    const overlay = this.createOverlay()

    const modal = document.createElement('div')
    modal.className = 'cc-editor-modal'
    Object.assign(modal.style, {
      background: '#FDF6F0', border: '2px solid #1B2040', boxShadow: '4px 4px 0 #1B2040',
      padding: '32px', maxWidth: '800px', width: '95%', maxHeight: '90vh', overflowY: 'auto',
      display: 'grid', gridTemplateColumns: '1fr 200px', gap: '24px',
    })

    // Left: canvas + tools + palette
    const left = document.createElement('div')

    // Header
    const header = document.createElement('div')
    Object.assign(header.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' })
    const title = document.createElement('h2')
    title.textContent = this.editingChar ? 'Edit Character' : 'Create Character'
    Object.assign(title.style, { fontFamily: "'DM Serif Display', serif", fontSize: '24px', margin: '0' })
    const closeBtn = document.createElement('button')
    closeBtn.textContent = '\u00D7'
    Object.assign(closeBtn.style, { background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer' })
    closeBtn.addEventListener('click', () => this.close())
    header.appendChild(title)
    header.appendChild(closeBtn)
    left.appendChild(header)

    // Canvas
    this.canvas = document.createElement('canvas')
    this.canvas.width = DISPLAY_SIZE
    this.canvas.height = DISPLAY_SIZE
    Object.assign(this.canvas.style, { border: '2px solid #1B2040', cursor: 'crosshair', display: 'block', maxWidth: '100%' })
    this.ctx = this.canvas.getContext('2d')!
    this.ctx.imageSmoothingEnabled = false
    this.canvas.addEventListener('mousedown', this.onMouseDown)
    this.canvas.addEventListener('mousemove', this.onMouseMove)
    this.canvas.addEventListener('mouseup', () => { this.isDrawing = false })
    this.canvas.addEventListener('mouseleave', () => { this.isDrawing = false })
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault())
    left.appendChild(this.canvas)

    // Tools
    const toolsRow = document.createElement('div')
    Object.assign(toolsRow.style, { display: 'flex', gap: '8px', marginTop: '12px' })
    const tools: { name: Tool; label: string }[] = [
      { name: 'pencil', label: 'Pencil' },
      { name: 'eraser', label: 'Eraser' },
      { name: 'fill', label: 'Fill' },
    ]
    for (const t of tools) {
      const btn = document.createElement('button')
      Object.assign(btn.style, {
        fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', padding: '6px 14px',
        border: '2px solid #1B2040', cursor: 'pointer',
        background: this.tool === t.name ? '#E8868B' : '#FFFFFF',
        color: this.tool === t.name ? 'white' : '#1B2040',
        boxShadow: '2px 2px 0 #1B2040', transition: 'all 0.15s ease',
      })
      btn.textContent = t.label
      btn.addEventListener('click', () => {
        this.tool = t.name
        toolsRow.querySelectorAll('button').forEach(b => {
          Object.assign((b as HTMLElement).style, { background: '#FFFFFF', color: '#1B2040' })
        })
        Object.assign(btn.style, { background: '#E8868B', color: 'white' })
      })
      toolsRow.appendChild(btn)
    }
    left.appendChild(toolsRow)

    // Color palette
    const paletteRow = document.createElement('div')
    Object.assign(paletteRow.style, { display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '12px' })
    for (const color of PALETTE) {
      const swatch = document.createElement('div')
      Object.assign(swatch.style, {
        width: '24px', height: '24px', background: color,
        border: color === this.currentColor ? '3px solid #1B2040' : '1px solid #1B2040',
        cursor: 'pointer',
      })
      swatch.addEventListener('click', () => {
        this.currentColor = color
        paletteRow.querySelectorAll('div').forEach(s => { (s as HTMLElement).style.border = '1px solid #1B2040' })
        swatch.style.border = '3px solid #1B2040'
      })
      paletteRow.appendChild(swatch)
    }
    // Custom color picker
    const colorInput = document.createElement('input')
    colorInput.type = 'color'
    colorInput.value = this.currentColor
    Object.assign(colorInput.style, { width: '24px', height: '24px', border: '1px solid #1B2040', padding: '0', cursor: 'pointer' })
    colorInput.addEventListener('input', () => { this.currentColor = colorInput.value })
    paletteRow.appendChild(colorInput)
    left.appendChild(paletteRow)

    modal.appendChild(left)

    // Right sidebar
    const sidebar = document.createElement('div')
    Object.assign(sidebar.style, { display: 'flex', flexDirection: 'column', gap: '20px' })

    // Name input
    const nameGroup = this.createFieldGroup('Name')
    const nameInput = document.createElement('input')
    nameInput.type = 'text'
    nameInput.placeholder = 'Character name'
    nameInput.value = this.nameValue
    Object.assign(nameInput.style, {
      width: '100%', padding: '8px', border: '2px solid #1B2040',
      fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px',
      background: '#FFFFFF', boxSizing: 'border-box',
    })
    nameInput.addEventListener('input', () => { this.nameValue = nameInput.value })
    nameGroup.appendChild(nameInput)
    sidebar.appendChild(nameGroup)

    // Skin tone picker
    const skinGroup = this.createFieldGroup('Skin Tone')
    const skinRow = document.createElement('div')
    Object.assign(skinRow.style, { display: 'flex', flexWrap: 'wrap', gap: '6px' })
    SKIN_PALETTES.forEach((palette, i) => {
      const swatch = document.createElement('div')
      Object.assign(swatch.style, {
        width: '24px', height: '24px', borderRadius: '50%', background: palette.base,
        border: i === this.skinPalette ? '3px solid #1B2040' : '1px solid #1B2040',
        cursor: 'pointer',
      })
      swatch.addEventListener('click', () => {
        this.skinPalette = i
        skinRow.querySelectorAll('div').forEach(s => { (s as HTMLElement).style.border = '1px solid #1B2040' })
        swatch.style.border = '3px solid #1B2040'
      })
      skinRow.appendChild(swatch)
    })
    skinGroup.appendChild(skinRow)
    sidebar.appendChild(skinGroup)

    // Hair color picker
    const hairGroup = this.createFieldGroup('Hair Color')
    const hairRow = document.createElement('div')
    Object.assign(hairRow.style, { display: 'flex', flexWrap: 'wrap', gap: '6px' })
    HAIR_PALETTES.forEach((palette, i) => {
      const swatch = document.createElement('div')
      Object.assign(swatch.style, {
        width: '24px', height: '24px', borderRadius: '50%', background: palette.base,
        border: i === this.hairPalette ? '3px solid #1B2040' : '1px solid #1B2040',
        cursor: 'pointer',
      })
      swatch.addEventListener('click', () => {
        this.hairPalette = i
        hairRow.querySelectorAll('div').forEach(s => { (s as HTMLElement).style.border = '1px solid #1B2040' })
        swatch.style.border = '3px solid #1B2040'
      })
      hairRow.appendChild(swatch)
    })
    hairGroup.appendChild(hairRow)
    sidebar.appendChild(hairGroup)

    // Hue shift slider
    const hueGroup = this.createFieldGroup('Hue Shift')
    const hueSlider = document.createElement('input')
    hueSlider.type = 'range'
    hueSlider.min = '-180'
    hueSlider.max = '180'
    hueSlider.value = String(this.hueShift)
    Object.assign(hueSlider.style, { width: '100%' })
    const hueLabel = document.createElement('span')
    hueLabel.textContent = `${this.hueShift}\u00B0`
    Object.assign(hueLabel.style, { fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: '#5A607A' })
    hueSlider.addEventListener('input', () => {
      this.hueShift = parseInt(hueSlider.value)
      hueLabel.textContent = `${this.hueShift}\u00B0`
    })
    hueGroup.appendChild(hueSlider)
    hueGroup.appendChild(hueLabel)
    sidebar.appendChild(hueGroup)

    // Save button
    const saveBtn = document.createElement('button')
    saveBtn.textContent = this.editingChar ? 'Update Character' : 'Save Character'
    Object.assign(saveBtn.style, {
      fontFamily: "'IBM Plex Mono', monospace", fontSize: '14px', fontWeight: '600',
      padding: '12px', background: '#E8868B', color: 'white',
      border: '2px solid #1B2040', boxShadow: '3px 3px 0 #1B2040',
      cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em',
      transition: 'all 0.15s ease', marginTop: 'auto',
    })
    saveBtn.addEventListener('mouseenter', () => { saveBtn.style.transform = 'translate(2px, 2px)'; saveBtn.style.boxShadow = '1px 1px 0 #1B2040' })
    saveBtn.addEventListener('mouseleave', () => { saveBtn.style.transform = ''; saveBtn.style.boxShadow = '3px 3px 0 #1B2040' })
    saveBtn.addEventListener('click', () => this.save())
    sidebar.appendChild(saveBtn)

    // Back to templates button (only for new characters)
    if (!this.editingChar) {
      const backBtn = document.createElement('button')
      backBtn.textContent = 'Back to Templates'
      Object.assign(backBtn.style, {
        fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px',
        padding: '8px', background: 'transparent', color: '#5A607A',
        border: '1px solid #5A607A', cursor: 'pointer',
      })
      backBtn.addEventListener('click', () => {
        this.close()
        this.renderTemplateStep()
      })
      sidebar.appendChild(backBtn)
    }

    modal.appendChild(sidebar)
    overlay.appendChild(modal)

    this.renderPixels()
  }

  private createFieldGroup(label: string): HTMLElement {
    const group = document.createElement('div')
    const labelEl = document.createElement('label')
    labelEl.textContent = label
    Object.assign(labelEl.style, {
      fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', fontWeight: '600',
      textTransform: 'uppercase', letterSpacing: '0.15em', display: 'block',
      marginBottom: '8px', color: '#1B2040',
    })
    group.appendChild(labelEl)
    return group
  }

  private onMouseDown = (e: MouseEvent) => {
    e.preventDefault()
    this.isDrawing = true
    const { gx, gy } = this.getGridPos(e)
    if (e.button === 2) {
      // Right-click: pick color
      const existing = this.pixels[gy]?.[gx]
      if (existing) this.currentColor = existing
      this.isDrawing = false
      return
    }
    this.applyTool(gx, gy)
    this.renderPixels()
  }

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isDrawing) return
    const { gx, gy } = this.getGridPos(e)
    if (this.tool === 'pencil' || this.tool === 'eraser') {
      this.applyTool(gx, gy)
      this.renderPixels()
    }
  }

  private getGridPos(e: MouseEvent): { gx: number; gy: number } {
    if (!this.canvas) return { gx: 0, gy: 0 }
    const rect = this.canvas.getBoundingClientRect()
    const scale = DISPLAY_SIZE / rect.width
    const gx = Math.floor((e.clientX - rect.left) * scale / CELL_SIZE)
    const gy = Math.floor((e.clientY - rect.top) * scale / CELL_SIZE)
    return { gx: Math.max(0, Math.min(GRID_SIZE - 1, gx)), gy: Math.max(0, Math.min(GRID_SIZE - 1, gy)) }
  }

  private applyTool(gx: number, gy: number) {
    if (gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE) return
    if (this.tool === 'pencil') this.pixels[gy][gx] = this.currentColor
    else if (this.tool === 'eraser') this.pixels[gy][gx] = null
    else if (this.tool === 'fill') this.floodFill(gx, gy, this.pixels[gy][gx], this.currentColor)
  }

  private floodFill(x: number, y: number, target: string | null, fill: string) {
    if (target === fill) return
    const stack: [number, number][] = [[x, y]]
    const visited = new Set<string>()
    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!
      const key = `${cx},${cy}`
      if (visited.has(key)) continue
      if (cx < 0 || cx >= GRID_SIZE || cy < 0 || cy >= GRID_SIZE) continue
      if (this.pixels[cy][cx] !== target) continue
      visited.add(key)
      this.pixels[cy][cx] = fill
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1])
    }
  }

  private renderPixels() {
    if (!this.ctx || !this.canvas) return
    const ctx = this.ctx

    // Checker pattern for transparency
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#F0E8E0' : '#E8DDD4'
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE)
      }
    }

    // Draw pixels
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const color = this.pixels[y][x]
        if (color) {
          ctx.fillStyle = color
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE)
        }
      }
    }

    // Grid lines
    ctx.strokeStyle = 'rgba(43, 36, 64, 0.1)'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath()
      ctx.moveTo(i * CELL_SIZE, 0)
      ctx.lineTo(i * CELL_SIZE, DISPLAY_SIZE)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i * CELL_SIZE)
      ctx.lineTo(DISPLAY_SIZE, i * CELL_SIZE)
      ctx.stroke()
    }
  }

  private renderSpriteToCanvas(sprite: SpriteData, w: number, h: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    const tiny = document.createElement('canvas')
    tiny.width = sprite.width
    tiny.height = sprite.height
    const tCtx = tiny.getContext('2d')!
    const imageData = tCtx.createImageData(sprite.width, sprite.height)
    for (let y = 0; y < sprite.height; y++) {
      for (let x = 0; x < sprite.width; x++) {
        const hex = sprite.pixels[y]?.[x]
        if (hex) {
          const i = (y * sprite.width + x) * 4
          imageData.data[i] = parseInt(hex.slice(1, 3), 16)
          imageData.data[i + 1] = parseInt(hex.slice(3, 5), 16)
          imageData.data[i + 2] = parseInt(hex.slice(5, 7), 16)
          imageData.data[i + 3] = 255
        }
      }
    }
    tCtx.putImageData(imageData, 0, 0)
    ctx.drawImage(tiny, 0, 0, w, h)
    return canvas
  }

  private async save() {
    const name = this.nameValue.trim()
    if (!name) {
      alert('Please enter a character name')
      return
    }

    // Build pixel data
    const pixelData: string[][] = []
    for (let y = 0; y < GRID_SIZE; y++) {
      const row: string[] = []
      for (let x = 0; x < GRID_SIZE; x++) {
        row.push(this.pixels[y][x] ?? '')
      }
      pixelData.push(row)
    }

    const spriteData: SpriteData = { width: GRID_SIZE, height: GRID_SIZE, pixels: pixelData }

    const body = {
      name,
      sprite_data: JSON.stringify(spriteData),
      skin_palette: this.skinPalette,
      hair_palette: this.hairPalette,
      hue_shift: this.hueShift,
      base_template: this.baseTemplate,
    }

    try {
      if (this.editingChar) {
        await fetch(`/api/characters/${this.editingChar.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        await fetch('/api/characters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      this.close()
      this.onSave()
    } catch (err) {
      console.error('Failed to save character:', err)
    }
  }
}
