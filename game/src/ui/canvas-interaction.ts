import type { World } from '../ecs/world'
import type { Renderer } from '../engine/renderer'
import type { PositionComponent, SpriteComponent, PhysicsComponent, PatrolComponent, DoorComponent } from '../ecs/types'
import type { VFXSystem } from '../systems/vfx'
import { GAME_CONFIG } from '../config/game-config'

export class CanvasInteraction {
  selectedEntityId: string | null = null
  mode: 'play' | 'build' = 'build'

  onModeChange: ((mode: 'play' | 'build') => void) | null = null
  onEntitySelected: ((id: string | null) => void) | null = null
  onControlSwitch: ((entityId: string) => void) | null = null

  private isDragging = false
  private isPanning = false
  private isResizing = false
  private resizeHandle: 'tl' | 'tr' | 'bl' | 'br' | null = null
  private resizeStartX = 0
  private resizeStartY = 0
  private resizeStartW = 0
  private resizeStartH = 0
  private resizeStartPosX = 0
  private resizeStartPosY = 0
  private dragOffsetX = 0
  private dragOffsetY = 0
  private lastMouseX = 0
  private lastMouseY = 0
  private gridSnap = false
  private gridSize = GAME_CONFIG.editor.gridSize

  // Drag velocity tracking for toss-on-release
  private dragHistory: { x: number; y: number; t: number }[] = []

  // Right-click 5px drag threshold
  private rightClickStartX = 0
  private rightClickStartY = 0
  private rightClickStarted = false
  private rightClickCommittedToPan = false

  // Context menu reference
  private contextMenu: { open: (entityId: string, x: number, y: number) => void; close: () => void; isOpen: () => boolean } | null = null
  private vfx: VFXSystem | null = null
  controlledEntityId: string | null = null

  // Patrol path editing
  private patrolEditEntityId: string | null = null
  private draggingWaypointIdx: number | null = null
  onPatrolChanged: ((entityId: string) => void) | null = null
  onPatrolEditExit: (() => void) | null = null

  // Door link mode
  private doorLinkSourceId: string | null = null
  onDoorLinked: ((sourceId: string, targetId: string) => void) | null = null
  onDoorLinkExit: (() => void) | null = null

  // Right-click move command (play mode)
  onMoveCommand: ((entityId: string, x: number, y: number) => void) | null = null

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

  setVFX(vfx: VFXSystem): void { this.vfx = vfx }

  setContextMenu(menu: { open: (entityId: string, x: number, y: number) => void; close: () => void; isOpen: () => boolean }): void {
    this.contextMenu = menu
  }

  setPatrolEditEntity(entityId: string | null): void {
    this.patrolEditEntityId = entityId
    this.draggingWaypointIdx = null
    if (entityId) {
      this.canvas.style.cursor = 'crosshair'
    } else {
      this.canvas.style.cursor = 'default'
    }
  }

  get isPatrolEditing(): boolean {
    return this.patrolEditEntityId !== null
  }

  setOnControlSwitch(cb: (entityId: string) => void): void {
    this.onControlSwitch = cb
  }

  enterDoorLinkMode(entityId: string): void {
    this.doorLinkSourceId = entityId
    this.canvas.style.cursor = 'crosshair'
  }

  exitDoorLinkMode(): void {
    this.doorLinkSourceId = null
    this.canvas.style.cursor = 'default'
    this.onDoorLinkExit?.()
  }

  private onDrop = (e: DragEvent): void => {
    e.preventDefault()
    const assetId = e.dataTransfer?.getData('text/plain')
    if (!assetId || !this.onAssetDrop) return
    const { x, y } = this.renderer.screenToWorld(e.clientX, e.clientY)
    const snapped = this.snapToGrid(x, y)
    this.onAssetDrop(assetId, snapped.x, snapped.y)
  }

  private onMouseDown = (e: MouseEvent): void => {
    // Close context menu on any click on the canvas (not overlay)
    if (this.contextMenu?.isOpen()) {
      this.contextMenu.close()
      return
    }

    // Door link mode intercept (build mode, left-click on a different door)
    if (this.doorLinkSourceId && this.mode === 'build' && e.button === 0) {
      const { x: wx, y: wy } = this.renderer.screenToWorld(e.clientX, e.clientY)
      const hit = this.hitTest(wx, wy)
      if (hit && hit !== this.doorLinkSourceId) {
        const targetDoor = this.world.getComponent(hit, 'door') as DoorComponent | undefined
        if (targetDoor) {
          // Link source → target
          const sourceDoor = this.world.getComponent(this.doorLinkSourceId, 'door') as DoorComponent | undefined
          if (sourceDoor) {
            sourceDoor.destinationId = hit
            // Bidirectional: also link target → source
            if (sourceDoor.bidirectional) {
              targetDoor.destinationId = this.doorLinkSourceId
            }
            this.onDoorLinked?.(this.doorLinkSourceId, hit)
          }
          this.exitDoorLinkMode()
          return
        }
      }
      // Clicking empty space or non-door cancels link mode
      this.exitDoorLinkMode()
      return
    }

    // Patrol edit mode intercept
    if (this.patrolEditEntityId && this.mode === 'build') {
      const { x: wx, y: wy } = this.renderer.screenToWorld(e.clientX, e.clientY)

      // Right-click: delete waypoint
      if (e.button === 2) {
        const hitIdx = this.hitTestWaypoint(wx, wy)
        if (hitIdx !== null) {
          const entity = this.world.getEntity(this.patrolEditEntityId)
          if (entity) {
            const patrol = entity.components.get('patrol') as PatrolComponent | undefined
            if (patrol) {
              this.world.saveSnapshot()
              patrol.waypoints.splice(hitIdx, 1)
              if (patrol.currentIndex >= patrol.waypoints.length) {
                patrol.currentIndex = 0
              }
              this.onPatrolChanged?.(this.patrolEditEntityId)
            }
          }
        }
        return
      }

      // Left-click: drag existing waypoint or add new one
      if (e.button === 0) {
        const hitIdx = this.hitTestWaypoint(wx, wy)
        if (hitIdx !== null) {
          this.world.saveSnapshot()
          this.draggingWaypointIdx = hitIdx
        } else {
          const entity = this.world.getEntity(this.patrolEditEntityId)
          if (entity) {
            const patrol = entity.components.get('patrol') as PatrolComponent | undefined
            if (patrol) {
              this.world.saveSnapshot()
              const snapped = this.snapToGrid(wx - 16, wy - 16)
              patrol.waypoints.push({ x: snapped.x, y: snapped.y })
              this.onPatrolChanged?.(this.patrolEditEntityId)
            }
          }
        }
        return
      }
    }

    // Middle-click: immediate pan
    if (e.button === 1) {
      this.isPanning = true
      this.lastMouseX = e.clientX
      this.lastMouseY = e.clientY
      return
    }

    // Right-click: start tracking for 5px threshold
    if (e.button === 2) {
      this.rightClickStartX = e.clientX
      this.rightClickStartY = e.clientY
      this.rightClickStarted = true
      this.rightClickCommittedToPan = false
      this.lastMouseX = e.clientX
      this.lastMouseY = e.clientY
      return
    }

    // Left-click in play mode: click-to-control entity
    if (e.button === 0 && this.mode === 'play') {
      const { x: wx, y: wy } = this.renderer.screenToWorld(e.clientX, e.clientY)
      const hit = this.hitTest(wx, wy)
      if (hit && hit !== this.controlledEntityId) {
        this.onControlSwitch?.(hit)
      }
      return
    }

    // Left-click in build mode: resize handle, select, or drag
    if (e.button === 0 && this.mode === 'build') {
      const { x: wx, y: wy } = this.renderer.screenToWorld(e.clientX, e.clientY)

      // Check resize handles first (if entity is selected)
      const handle = this.hitTestResizeHandle(wx, wy)
      if (handle && this.selectedEntityId) {
        const sprite = this.world.getComponent(this.selectedEntityId, 'sprite') as SpriteComponent | undefined
        const pos = this.world.getComponent(this.selectedEntityId, 'position') as PositionComponent | undefined
        if (sprite && pos) {
          this.isResizing = true
          this.resizeHandle = handle
          this.resizeStartX = wx
          this.resizeStartY = wy
          this.resizeStartW = sprite.width
          this.resizeStartH = sprite.height
          this.resizeStartPosX = pos.x
          this.resizeStartPosY = pos.y
          this.world.saveSnapshot()
          return
        }
      }

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
          this.dragHistory = [{ x: e.clientX, y: e.clientY, t: performance.now() }]
          this.world.saveSnapshot()
        }
      } else {
        this.selectEntity(null)
      }
    }
  }

  private onMouseMove = (e: MouseEvent): void => {
    // Right-click drag threshold
    if (this.rightClickStarted && !this.rightClickCommittedToPan) {
      const dx = e.clientX - this.rightClickStartX
      const dy = e.clientY - this.rightClickStartY
      if (Math.sqrt(dx * dx + dy * dy) >= 5) {
        this.rightClickCommittedToPan = true
        this.isPanning = true
      }
    }

    // Patrol waypoint dragging
    if (this.draggingWaypointIdx !== null && this.patrolEditEntityId) {
      const { x: wx, y: wy } = this.renderer.screenToWorld(e.clientX, e.clientY)
      const entity = this.world.getEntity(this.patrolEditEntityId)
      if (entity) {
        const patrol = entity.components.get('patrol') as PatrolComponent | undefined
        if (patrol && this.draggingWaypointIdx < patrol.waypoints.length) {
          const snapped = this.snapToGrid(wx - 16, wy - 16)
          patrol.waypoints[this.draggingWaypointIdx].x = snapped.x
          patrol.waypoints[this.draggingWaypointIdx].y = snapped.y
        }
      }
      return
    }

    if (this.isPanning) {
      const dx = e.clientX - this.lastMouseX
      const dy = e.clientY - this.lastMouseY
      this.renderer.cameraX -= dx / this.renderer.zoom
      this.renderer.cameraY -= dy / this.renderer.zoom
      this.lastMouseX = e.clientX
      this.lastMouseY = e.clientY
      return
    }

    // Update cursor based on hover target (build mode, not in door link mode)
    if (this.mode === 'build' && !this.isDragging && !this.isResizing && !this.isPanning && !this.doorLinkSourceId) {
      const { x: wx, y: wy } = this.renderer.screenToWorld(e.clientX, e.clientY)
      const handle = this.hitTestResizeHandle(wx, wy)
      if (handle === 'tl' || handle === 'br') {
        this.canvas.style.cursor = 'nwse-resize'
      } else if (handle === 'tr' || handle === 'bl') {
        this.canvas.style.cursor = 'nesw-resize'
      } else {
        const hit = this.hitTest(wx, wy)
        this.canvas.style.cursor = hit ? 'grab' : 'default'
      }
    }

    // Resize dragging
    if (this.isResizing && this.selectedEntityId && this.resizeHandle) {
      const { x: wx, y: wy } = this.renderer.screenToWorld(e.clientX, e.clientY)
      const dx = wx - this.resizeStartX
      const dy = wy - this.resizeStartY
      const sprite = this.world.getComponent(this.selectedEntityId, 'sprite') as SpriteComponent | undefined
      const pos = this.world.getComponent(this.selectedEntityId, 'position') as PositionComponent | undefined
      if (sprite && pos) {
        const minSize = 8
        switch (this.resizeHandle) {
          case 'br':
            sprite.width = Math.max(minSize, this.resizeStartW + dx)
            sprite.height = Math.max(minSize, this.resizeStartH + dy)
            break
          case 'bl':
            sprite.width = Math.max(minSize, this.resizeStartW - dx)
            sprite.height = Math.max(minSize, this.resizeStartH + dy)
            pos.x = this.resizeStartPosX + this.resizeStartW - sprite.width
            break
          case 'tr':
            sprite.width = Math.max(minSize, this.resizeStartW + dx)
            sprite.height = Math.max(minSize, this.resizeStartH - dy)
            pos.y = this.resizeStartPosY + this.resizeStartH - sprite.height
            break
          case 'tl':
            sprite.width = Math.max(minSize, this.resizeStartW - dx)
            sprite.height = Math.max(minSize, this.resizeStartH - dy)
            pos.x = this.resizeStartPosX + this.resizeStartW - sprite.width
            pos.y = this.resizeStartPosY + this.resizeStartH - sprite.height
            break
        }
        if (this.gridSnap) {
          sprite.width = Math.round(sprite.width / this.gridSize) * this.gridSize || this.gridSize
          sprite.height = Math.round(sprite.height / this.gridSize) * this.gridSize || this.gridSize
        }
      }
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
      // Track recent cursor positions for toss velocity
      const now = performance.now()
      this.dragHistory.push({ x: e.clientX, y: e.clientY, t: now })
      // Keep only last 80ms of samples
      while (this.dragHistory.length > 1 && now - this.dragHistory[0].t > 80) {
        this.dragHistory.shift()
      }
    }
  }

  private onMouseUp = (e: MouseEvent): void => {
    // Patrol waypoint drag release
    if (this.draggingWaypointIdx !== null) {
      const entityId = this.patrolEditEntityId
      this.draggingWaypointIdx = null
      if (entityId) this.onPatrolChanged?.(entityId)
      return
    }

    // Right-click release: show context menu (build) or move command (play)
    if (this.rightClickStarted && !this.rightClickCommittedToPan && e.button === 2) {
      if (this.mode === 'build') {
        const { x: wx, y: wy } = this.renderer.screenToWorld(e.clientX, e.clientY)
        const hit = this.hitTest(wx, wy)
        if (hit && this.contextMenu) {
          this.selectEntity(hit)
          this.contextMenu.open(hit, e.clientX, e.clientY)
        }
      } else if (this.mode === 'play' && this.controlledEntityId && this.onMoveCommand) {
        const { x: wx, y: wy } = this.renderer.screenToWorld(e.clientX, e.clientY)
        this.onMoveCommand(this.controlledEntityId, wx, wy)
      }
    }

    // Toss entity with cursor velocity on drag release
    if (this.isDragging && this.selectedEntityId && this.dragHistory.length >= 2) {
      const first = this.dragHistory[0]
      const last = this.dragHistory[this.dragHistory.length - 1]
      const dtSec = (last.t - first.t) / 1000
      if (dtSec > 0.005) {
        // Convert screen-space px/s to world-space px/s (divide by zoom), dampen to 35%
        const vx = ((last.x - first.x) / dtSec) / this.renderer.zoom * 0.35
        const vy = ((last.y - first.y) / dtSec) / this.renderer.zoom * 0.35
        // Only toss if moving fast enough (> 50 world px/s)
        if (Math.sqrt(vx * vx + vy * vy) > 50) {
          const phys = this.world.getComponent(this.selectedEntityId, 'physics') as PhysicsComponent | undefined
          if (phys) {
            phys.velocityX = vx
            phys.velocityY = vy
          }
        }
      }
    }

    this.rightClickStarted = false
    this.rightClickCommittedToPan = false
    this.isDragging = false
    this.isResizing = false
    this.resizeHandle = null
    this.isPanning = false
    this.dragHistory = []
  }

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault()
    const { x: beforeX, y: beforeY } = this.renderer.screenToWorld(e.clientX, e.clientY)

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9
    this.renderer.zoom = Math.max(GAME_CONFIG.canvas.minZoom, Math.min(GAME_CONFIG.canvas.maxZoom, this.renderer.zoom * zoomFactor))

    // Preserve world point under cursor
    const { x: afterX, y: afterY } = this.renderer.screenToWorld(e.clientX, e.clientY)
    this.renderer.cameraX -= (afterX - beforeX)
    this.renderer.cameraY -= (afterY - beforeY)
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    // Ignore keypresses when focused on inputs
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

    if (e.code === 'Escape' && this.doorLinkSourceId) {
      this.exitDoorLinkMode()
      return
    }

    if (e.code === 'Escape' && this.patrolEditEntityId) {
      this.setPatrolEditEntity(null)
      this.onPatrolEditExit?.()
      return
    }

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
      this.contextMenu?.close()
      const undone = this.world.undo()
      if (undone) this.vfx?.addToast('Undo', 1200)
      return
    }
  }

  private toggleMode(): void {
    this.mode = this.mode === 'build' ? 'play' : 'build'
    this.renderer.setMode(this.mode)
    if (this.doorLinkSourceId) this.exitDoorLinkMode()
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
    if (this.doorLinkSourceId) this.exitDoorLinkMode()
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

  /** Hit-test entities at world position, reverse-iterate for topmost.
   *  Adds padding around small entities to make them easier to click. */
  private hitTest(wx: number, wy: number): string | null {
    const entities = this.world.query('position', 'sprite')
    // Reverse iterate so topmost (last rendered, sorted by Y) is checked first
    for (let i = entities.length - 1; i >= 0; i--) {
      const entity = entities[i]
      const pos = entity.components.get('position') as PositionComponent
      const sprite = entity.components.get('sprite') as SpriteComponent
      // Add click padding for small entities (scale inversely with size)
      const pad = Math.max(0, (40 - Math.min(sprite.width, sprite.height)) / 2)
      if (
        wx >= pos.x - pad &&
        wx <= pos.x + sprite.width + pad &&
        wy >= pos.y - pad &&
        wy <= pos.y + sprite.height + pad
      ) {
        return entity.id
      }
    }
    return null
  }

  /** Hit-test the 4 resize handles of the selected entity */
  private hitTestResizeHandle(wx: number, wy: number): 'tl' | 'tr' | 'bl' | 'br' | null {
    if (!this.selectedEntityId) return null
    const pos = this.world.getComponent(this.selectedEntityId, 'position') as PositionComponent | undefined
    const sprite = this.world.getComponent(this.selectedEntityId, 'sprite') as SpriteComponent | undefined
    if (!pos || !sprite) return null

    const handleSize = 10 / this.renderer.zoom
    const corners: { key: 'tl' | 'tr' | 'bl' | 'br'; cx: number; cy: number }[] = [
      { key: 'tl', cx: pos.x, cy: pos.y },
      { key: 'tr', cx: pos.x + sprite.width, cy: pos.y },
      { key: 'bl', cx: pos.x, cy: pos.y + sprite.height },
      { key: 'br', cx: pos.x + sprite.width, cy: pos.y + sprite.height },
    ]

    for (const { key, cx, cy } of corners) {
      if (
        wx >= cx - handleSize &&
        wx <= cx + handleSize &&
        wy >= cy - handleSize &&
        wy <= cy + handleSize
      ) {
        return key
      }
    }
    return null
  }

  private hitTestWaypoint(wx: number, wy: number): number | null {
    if (!this.patrolEditEntityId) return null
    const entity = this.world.getEntity(this.patrolEditEntityId)
    if (!entity) return null
    const patrol = entity.components.get('patrol') as PatrolComponent | undefined
    if (!patrol) return null

    const hitRadius = 12 / this.renderer.zoom
    for (let i = 0; i < patrol.waypoints.length; i++) {
      const wp = patrol.waypoints[i]
      const dx = wx - (wp.x + 16)
      const dy = wy - (wp.y + 16)
      if (Math.sqrt(dx * dx + dy * dy) < hitRadius) return i
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
