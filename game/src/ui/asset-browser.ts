import { SPRITE_REGISTRY } from '../assets/sprites'

/** Category definitions mapped from sprite key prefixes */
const CATEGORIES: { label: string; prefix: string }[] = [
  { label: 'Heroes', prefix: 'hero_' },
  { label: 'Enemies', prefix: 'enemy_' },
  { label: 'NPCs', prefix: 'npc_' },
  { label: 'Tiles', prefix: 'tile_' },
  { label: 'Structures', prefix: 'structure_' },
  { label: 'Trees', prefix: 'tree_' },
  { label: 'Items', prefix: 'item_' },
  { label: 'Decorations', prefix: 'deco_' },
]

export class AssetBrowser {
  onSpawn: ((assetId: string, x: number, y: number) => void) | null = null

  private container: HTMLElement
  private searchInput: HTMLInputElement
  private grid: HTMLElement

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div')
    this.container.className = 'asset-browser'

    // Header
    const header = document.createElement('h3')
    header.className = 'panel-header'
    header.textContent = 'Assets'
    this.container.appendChild(header)

    // Search
    this.searchInput = document.createElement('input')
    this.searchInput.type = 'text'
    this.searchInput.placeholder = 'Search sprites...'
    this.searchInput.className = 'editor-input asset-search'
    this.searchInput.addEventListener('input', () => this.render())
    this.container.appendChild(this.searchInput)

    // Grid container
    this.grid = document.createElement('div')
    this.grid.className = 'asset-grid-container'
    this.container.appendChild(this.grid)

    parent.appendChild(this.container)
    this.render()
  }

  private render(): void {
    this.grid.innerHTML = ''
    const filter = this.searchInput.value.toLowerCase()

    for (const cat of CATEGORIES) {
      const sprites = Object.keys(SPRITE_REGISTRY).filter(
        (id) => id.startsWith(cat.prefix) && id.toLowerCase().includes(filter),
      )
      if (sprites.length === 0) continue

      const section = document.createElement('div')
      section.className = 'asset-category'

      const sectionHeader = document.createElement('div')
      sectionHeader.className = 'asset-category-header'
      sectionHeader.textContent = cat.label
      section.appendChild(sectionHeader)

      const grid = document.createElement('div')
      grid.className = 'asset-grid'

      for (const assetId of sprites) {
        const item = this.createThumbnail(assetId)
        grid.appendChild(item)
      }

      section.appendChild(grid)
      this.grid.appendChild(section)
    }
  }

  private createThumbnail(assetId: string): HTMLElement {
    const wrapper = document.createElement('div')
    wrapper.className = 'asset-thumb'
    wrapper.draggable = true
    wrapper.title = assetId

    // Render sprite onto small canvas
    const thumb = document.createElement('canvas')
    thumb.width = 40
    thumb.height = 40
    thumb.style.cssText = 'image-rendering:pixelated;'

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
      // Draw at native resolution then scale up
      const offscreen = document.createElement('canvas')
      offscreen.width = sprite.width
      offscreen.height = sprite.height
      offscreen.getContext('2d')!.putImageData(imageData, 0, 0)

      ctx.imageSmoothingEnabled = false
      // Scale to fit 40x40 preserving aspect ratio
      const scale = Math.min(40 / sprite.width, 40 / sprite.height)
      const dw = sprite.width * scale
      const dh = sprite.height * scale
      ctx.drawImage(offscreen, (40 - dw) / 2, (40 - dh) / 2, dw, dh)
    }

    wrapper.appendChild(thumb)

    // Label
    const label = document.createElement('div')
    label.className = 'asset-label'
    label.textContent = assetId.split('_').slice(1).join('_')
    wrapper.appendChild(label)

    // Drag events
    wrapper.addEventListener('dragstart', (e) => {
      e.dataTransfer?.setData('text/plain', assetId)
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy'
    })

    return wrapper
  }
}
