import type { World } from '../ecs/world'
import type { Renderer } from '../engine/renderer'
import type { PositionComponent, SpriteComponent } from '../ecs/types'

export class CanvasInteraction {
  selectedEntityId: string | null = null
  mode: 'play' | 'build' = 'build'

  onModeChange: ((mode: 'play' | 'build') => void) | null = null
  onEntitySelected: ((id: string | null) => void) | null = null

  private isDragging = false
  private isPanning = false
  private dragOffsetX = 0
  private dragOffsetY = 0
  private lastMouseX = 0
  private lastMouseY = 0
  private gridSnap = true
  private gridSize = 32

  constructor(
    private canvas: HTMLCanvasElement,
    private world: World,
    private renderer: Renderer,
  ) {
    this.canvas.addEventListener('mousedown', this.onMouseDown)
    this.canvas.addEventListener('mousemove', this.onMouseMove)
    this.canvas.addEventListener('mouseup', this.onMouseUp)
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false })
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault())
    window.addEventListener('keydown', this.onKeyDown)

    // Support drop from asset browser
    this.canvas.addEventListener('dragover', (e) => {
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    })
    this.canvas.addEventListener('drop', this.onDrop)
  }

  /** External callback for asset browser drops — set by main.ts */
  onAssetDrop: ((assetId: string, worldX: number, worldY: number) => void) | null = null

  private onDrop = (e: DragEvent): void => {
    e.preventDefault()
    const assetId = e.dataTransfer?.getData('text/plain')
    if (!assetId || !this.onAssetDrop) return
    const { x, y } = this.renderer.screenToWorld(e.clientX, e.clientY)
    const snapped = this.snapToGrid(x, y)
    this.onAssetDrop(assetId, snapped.x, snapped.y)
  }

  private onMouseDown = (e: MouseEvent): void => {
    // Middle-click or right-click: start pan
    if (e.button === 1 || e.button === 2) {
      this.isPanning = true
      this.lastMouseX = e.clientX
      this.lastMouseY = e.clientY
      return
    }

    // Left-click in build mode: select or drag
    if (e.button === 0 && this.mode === 'build') {
      const { x: wx, y: wy } = this.renderer.screenToWorld(e.clientX, e.clientY)
      const hit = this.hitTest(wx, wy)

      if (e.shiftKey && this.selectedEntityId && hit === this.selectedEntityId) {
        // Shift+click on selected entity: clone it
        this.cloneSelected(wx, wy)
        return
      }

      if (hit) {
        this.selectEntity(hit)
        // Start dragging
        const pos = this.world.getComponent(hit, 'position') as PositionComponent | undefined
        if (pos) {
          this.isDragging = true
          this.dragOffsetX = wx - pos.x
          this.dragOffsetY = wy - pos.y
          this.world.saveSnapshot()
        }
      } else {
        this.selectEntity(null)
      }
    }
  }

  private onMouseMove = (e: MouseEvent): void => {
    if (this.isPanning) {
      const dx = e.clientX - this.lastMouseX
      const dy = e.clientY - this.lastMouseY
      this.renderer.cameraX -= dx / this.renderer.zoom
      this.renderer.cameraY -= dy / this.renderer.zoom
      this.lastMouseX = e.clientX
      this.lastMouseY = e.clientY
      return
    }

    if (this.isDragging && this.selectedEntityId) {
      const { x: wx, y: wy } = this.renderer.screenToWorld(e.clientX, e.clientY)
      const pos = this.world.getComponent(this.selectedEntityId, 'position') as PositionComponent | undefined
      if (pos) {
        let newX = wx - this.dragOffsetX
        let newY = wy - this.dragOffsetY
        if (this.gridSnap) {
          const snapped = this.snapToGrid(newX, newY)
          newX = snapped.x
          newY = snapped.y
        }
        pos.x = newX
        pos.y = newY
      }
    }
  }

  private onMouseUp = (_e: MouseEvent): void => {
    this.isDragging = false
    this.isPanning = false
  }

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault()
    const { x: beforeX, y: beforeY } = this.renderer.screenToWorld(e.clientX, e.clientY)

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9
    this.renderer.zoom = Math.max(0.25, Math.min(4, this.renderer.zoom * zoomFactor))

    // Preserve world point under cursor
    const { x: afterX, y: afterY } = this.renderer.screenToWorld(e.clientX, e.clientY)
    this.renderer.cameraX -= (afterX - beforeX)
    this.renderer.cameraY -= (afterY - beforeY)
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    // Ignore keypresses when focused on inputs
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

    if (e.code === 'Tab') {
      e.preventDefault()
      this.toggleMode()
      return
    }

    if (this.mode !== 'build') return

    if (e.code === 'KeyG') {
      this.gridSnap = !this.gridSnap
      return
    }

    if ((e.code === 'Delete' || e.code === 'Backspace') && this.selectedEntityId) {
      this.world.saveSnapshot()
      this.world.removeEntity(this.selectedEntityId)
      this.selectEntity(null)
      return
    }

    // Ctrl+Z: undo
    if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      this.world.undo()
      return
    }
  }

  private toggleMode(): void {
    this.mode = this.mode === 'build' ? 'play' : 'build'
    this.renderer.setMode(this.mode)
    if (this.mode === 'play') {
      this.selectEntity(null)
    }
    this.onModeChange?.(this.mode)
  }

  /** Switch mode externally (e.g. from mode toggle button) */
  setMode(mode: 'play' | 'build'): void {
    if (this.mode === mode) return
    this.mode = mode
    this.renderer.setMode(mode)
    if (mode === 'play') {
      this.selectEntity(null)
    }
    this.onModeChange?.(mode)
  }

  private selectEntity(id: string | null): void {
    this.selectedEntityId = id
    this.renderer.setSelectedEntity(id)
    this.onEntitySelected?.(id)
  }

  /** Hit-test entities at world position, reverse-iterate for topmost */
  private hitTest(wx: number, wy: number): string | null {
    const entities = this.world.query('position', 'sprite')
    // Reverse iterate so topmost (last rendered, sorted by Y) is checked first
    for (let i = entities.length - 1; i >= 0; i--) {
      const entity = entities[i]
      const pos = entity.components.get('position') as PositionComponent
      const sprite = entity.components.get('sprite') as SpriteComponent
      if (
        wx >= pos.x &&
        wx <= pos.x + sprite.width &&
        wy >= pos.y &&
        wy <= pos.y + sprite.height
      ) {
        return entity.id
      }
    }
    return null
  }

  private cloneSelected(wx: number, wy: number): void {
    if (!this.selectedEntityId) return
    const src = this.world.getEntity(this.selectedEntityId)
    if (!src) return

    this.world.saveSnapshot()
    const newId = this.world.createEntity(`${src.name}_copy`)

    for (const [, comp] of src.components) {
      const clone = JSON.parse(JSON.stringify(comp))
      if (clone.type === 'position') {
        const snapped = this.snapToGrid(wx, wy)
        clone.x = snapped.x
        clone.y = snapped.y
      }
      this.world.addComponent(newId, clone)
    }

    this.selectEntity(newId)
  }

  private snapToGrid(x: number, y: number): { x: number; y: number } {
    if (!this.gridSnap) return { x, y }
    return {
      x: Math.round(x / this.gridSize) * this.gridSize,
      y: Math.round(y / this.gridSize) * this.gridSize,
    }
  }

  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.onMouseDown)
    this.canvas.removeEventListener('mousemove', this.onMouseMove)
    this.canvas.removeEventListener('mouseup', this.onMouseUp)
    this.canvas.removeEventListener('wheel', this.onWheel)
    window.removeEventListener('keydown', this.onKeyDown)
  }
}
