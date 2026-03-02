import { SPRITE_REGISTRY } from '../assets/sprites'

const CATEGORIES: { label: string; prefix: string }[] = [
  { label: 'Custom', prefix: 'custom_' },
  { label: 'Heroes', prefix: 'hero_' },
  { label: 'Enemies', prefix: 'enemy_' },
  { label: 'Bosses', prefix: 'boss_' },
  { label: 'NPCs', prefix: 'npc_' },
  { label: 'Tiles', prefix: 'tile_' },
  { label: 'Structures', prefix: 'structure_' },
  { label: 'Doors & Portals', prefix: 'door_' },
  { label: 'Trees', prefix: 'tree_' },
  { label: 'Items', prefix: 'item_' },
  { label: 'Weapons', prefix: 'weapon_' },
  { label: 'Decorations', prefix: 'deco_' },
]

const SIZES = { S: 32, M: 40, L: 56 } as const
type SizeKey = keyof typeof SIZES

const STORAGE_KEY = 'mistral-asset-collapsed'
const SIZE_STORAGE_KEY = 'mistral-asset-size'

export class AssetBrowser {
  onSpawn: ((assetId: string, x: number, y: number) => void) | null = null
  onCreateSprite: (() => void) | null = null

  private container: HTMLElement
  private searchInput: HTMLInputElement
  private gridContainer: HTMLElement
  private collapsedSet: Set<string>
  private currentSize: SizeKey
  private thumbCache: Map<string, HTMLCanvasElement> = new Map()
  private debounceTimer: number | null = null

  constructor(parent: HTMLElement) {
    this.collapsedSet = this.loadCollapsed()
    this.currentSize = this.loadSize()

    this.container = document.createElement('div')
    this.container.className = 'asset-browser'

    // Header
    const header = document.createElement('h3')
    header.className = 'panel-header'
    header.textContent = 'Assets'
    this.container.appendChild(header)

    // Toolbar
    const toolbar = document.createElement('div')
    toolbar.className = 'asset-toolbar'

    const toolbarRow = document.createElement('div')
    toolbarRow.className = 'asset-toolbar-row'

    // Search
    this.searchInput = document.createElement('input')
    this.searchInput.type = 'text'
    this.searchInput.placeholder = 'Search sprites...'
    this.searchInput.className = 'editor-input asset-search'
    this.searchInput.addEventListener('input', () => this.debouncedRender())
    toolbarRow.appendChild(this.searchInput)

    // Size toggle
    const sizeToggle = document.createElement('div')
    sizeToggle.className = 'asset-size-toggle'
    for (const key of Object.keys(SIZES) as SizeKey[]) {
      const btn = document.createElement('button')
      btn.className = `asset-size-btn${key === this.currentSize ? ' asset-size-btn-active' : ''}`
      btn.textContent = key
      btn.title = `${SIZES[key]}px thumbnails`
      btn.addEventListener('click', () => this.setSize(key))
      sizeToggle.appendChild(btn)
    }
    toolbarRow.appendChild(sizeToggle)
    toolbar.appendChild(toolbarRow)

    // Second row: Create Sprite button
    const createBtn = document.createElement('button')
    createBtn.className = 'editor-btn editor-btn-primary'
    createBtn.style.width = '100%'
    createBtn.textContent = '+ Create Sprite'
    createBtn.addEventListener('click', () => this.onCreateSprite?.())
    toolbar.appendChild(createBtn)

    this.container.appendChild(toolbar)

    // Grid container
    this.gridContainer = document.createElement('div')
    this.gridContainer.className = 'asset-grid-container'
    this.container.appendChild(this.gridContainer)

    parent.appendChild(this.container)
    this.render()
  }

  private debouncedRender(): void {
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer)
    this.debounceTimer = window.setTimeout(() => {
      this.debounceTimer = null
      this.render()
    }, 150)
  }

  private render(): void {
    this.gridContainer.innerHTML = ''
    const filter = this.searchInput.value.toLowerCase()
    const isSearching = filter.length > 0
    const px = SIZES[this.currentSize]
    const colWidth = px + 14 // thumb padding + gap

    for (const cat of CATEGORIES) {
      const sprites = Object.keys(SPRITE_REGISTRY).filter(
        (id) => id.startsWith(cat.prefix) && id.toLowerCase().includes(filter),
      )
      if (sprites.length === 0) continue

      const section = document.createElement('div')
      section.className = 'asset-category'

      const isCollapsed = !isSearching && this.collapsedSet.has(cat.prefix)

      // Header
      const headerRow = document.createElement('div')
      headerRow.className = 'asset-category-header'
      headerRow.addEventListener('click', () => this.toggleCategory(cat.prefix))

      const chevron = document.createElement('span')
      chevron.className = `asset-category-chevron${isCollapsed ? '' : ' expanded'}`
      chevron.textContent = '\u25B6'
      headerRow.appendChild(chevron)

      const label = document.createElement('span')
      label.className = 'asset-category-label'
      label.textContent = cat.label
      headerRow.appendChild(label)

      const count = document.createElement('span')
      count.className = 'asset-category-count'
      count.textContent = String(sprites.length)
      headerRow.appendChild(count)

      section.appendChild(headerRow)

      // Grid
      const grid = document.createElement('div')
      grid.className = `asset-grid${isCollapsed ? ' hidden' : ''}`
      grid.style.gridTemplateColumns = `repeat(auto-fill, minmax(${colWidth}px, 1fr))`

      for (const assetId of sprites) {
        grid.appendChild(this.createThumbnail(assetId, px))
      }

      section.appendChild(grid)
      this.gridContainer.appendChild(section)
    }
  }

  private createThumbnail(assetId: string, size: number): HTMLElement {
    const wrapper = document.createElement('div')
    wrapper.className = 'asset-thumb'
    wrapper.draggable = true
    wrapper.title = assetId

    const cacheKey = `${assetId}_${size}`
    let thumb = this.thumbCache.get(cacheKey)

    if (!thumb) {
      thumb = document.createElement('canvas')
      thumb.width = size
      thumb.height = size

      const sprite = SPRITE_REGISTRY[assetId]
      if (sprite) {
        const ctx = thumb.getContext('2d')!
        const imageData = ctx.createImageData(sprite.width, sprite.height)
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
        const offscreen = document.createElement('canvas')
        offscreen.width = sprite.width
        offscreen.height = sprite.height
        offscreen.getContext('2d')!.putImageData(imageData, 0, 0)

        ctx.imageSmoothingEnabled = false
        const scale = Math.min(size / sprite.width, size / sprite.height)
        const dw = sprite.width * scale
        const dh = sprite.height * scale
        ctx.drawImage(offscreen, (size - dw) / 2, (size - dh) / 2, dw, dh)
      }

      this.thumbCache.set(cacheKey, thumb)
    }

    // Clone cached canvas for DOM insertion
    const display = document.createElement('canvas')
    display.width = size
    display.height = size
    display.getContext('2d')!.drawImage(thumb, 0, 0)
    wrapper.appendChild(display)

    const label = document.createElement('div')
    label.className = 'asset-label'
    label.textContent = assetId.split('_').slice(1).join('_')
    wrapper.appendChild(label)

    wrapper.addEventListener('dragstart', (e) => {
      e.dataTransfer?.setData('text/plain', assetId)
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy'
    })

    return wrapper
  }

  private toggleCategory(prefix: string): void {
    if (this.collapsedSet.has(prefix)) {
      this.collapsedSet.delete(prefix)
    } else {
      this.collapsedSet.add(prefix)
    }
    this.saveCollapsed()
    this.render()
  }

  private setSize(key: SizeKey): void {
    this.currentSize = key
    this.thumbCache.clear()
    this.saveSize()

    // Update active button state
    const buttons = this.container.querySelectorAll('.asset-size-btn')
    buttons.forEach((btn) => {
      btn.classList.toggle('asset-size-btn-active', btn.textContent === key)
    })

    this.render()
  }

  private loadCollapsed(): Set<string> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return new Set(JSON.parse(raw))
    } catch { /* ignore */ }
    return new Set()
  }

  private saveCollapsed(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.collapsedSet]))
    } catch { /* ignore */ }
  }

  private loadSize(): SizeKey {
    try {
      const raw = localStorage.getItem(SIZE_STORAGE_KEY)
      if (raw && raw in SIZES) return raw as SizeKey
    } catch { /* ignore */ }
    return 'M'
  }

  private saveSize(): void {
    try {
      localStorage.setItem(SIZE_STORAGE_KEY, this.currentSize)
    } catch { /* ignore */ }
  }

  refresh(): void {
    this.thumbCache.clear()
    this.render()
  }
}
