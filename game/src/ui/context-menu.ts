import type { World } from '../ecs/world'
import type { Renderer } from '../engine/renderer'
import type {
  PositionComponent,
  SpriteComponent,
  PhysicsComponent,
  HealthComponent,
  PatrolComponent,
  DoorComponent,
  BehaviorComponent,
  ConsumableComponent,
  VoiceLineComponent,
} from '../ecs/types'

export class ContextMenu {
  private overlay: HTMLElement | null = null
  private entityId: string | null = null
  private escHandler: ((e: KeyboardEvent) => void) | null = null

  onEntityDeleted: ((id: string) => void) | null = null
  onEntityDuplicated: ((newId: string) => void) | null = null
  onEntityChanged: ((id: string) => void) | null = null
  onCameraLock: ((entityId: string | null) => void) | null = null
  onEditPatrol: ((entityId: string) => void) | null = null

  constructor(
    private world: World,
    private renderer: Renderer,
  ) {}

  isOpen(): boolean {
    return this.overlay !== null
  }

  open(entityId: string, screenX: number, screenY: number): void {
    this.close()
    this.entityId = entityId
    const entity = this.world.getEntity(entityId)
    if (!entity) return

    // Overlay — fullscreen backdrop that captures all pointer events,
    // preventing interaction with the canvas underneath
    this.overlay = document.createElement('div')
    this.overlay.className = 'context-menu-overlay'
    this.overlay.addEventListener('contextmenu', (e) => e.preventDefault())
    this.overlay.addEventListener('mousedown', (e) => {
      e.stopPropagation()
      e.preventDefault()
    })
    this.overlay.addEventListener('mouseup', (e) => {
      e.stopPropagation()
    })
    // Click on empty area of overlay closes menu
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close()
    })

    // Menu container — stop all mouse events from reaching overlay/canvas
    const menu = document.createElement('div')
    menu.className = 'context-menu'
    menu.addEventListener('mousedown', (e) => {
      e.stopPropagation()
      e.stopImmediatePropagation()
    })
    menu.addEventListener('mouseup', (e) => e.stopPropagation())
    menu.addEventListener('click', (e) => e.stopPropagation())

    const pad = 8
    let left = screenX
    let top = screenY
    menu.style.left = `${left}px`
    menu.style.top = `${top}px`

    // --- Header ---
    const header = document.createElement('div')
    header.className = 'context-menu-header'

    const spritePreview = document.createElement('canvas')
    spritePreview.width = 32
    spritePreview.height = 32
    spritePreview.style.cssText = 'image-rendering:pixelated; width:32px; height:32px; border:1px solid var(--border); border-radius:2px;'
    const sprite = entity.components.get('sprite') as SpriteComponent | undefined
    if (sprite) {
      const cached = this.renderer.getSpriteCanvas(sprite.assetId)
      if (cached) {
        const pctx = spritePreview.getContext('2d')!
        pctx.imageSmoothingEnabled = false
        pctx.drawImage(cached, 0, 0, 32, 32)
      }
    }
    header.appendChild(spritePreview)

    const nameEl = document.createElement('span')
    nameEl.className = 'context-menu-name'
    nameEl.textContent = entity.name
    header.appendChild(nameEl)

    const closeBtn = document.createElement('button')
    closeBtn.className = 'context-menu-close'
    closeBtn.textContent = '\u00D7'
    closeBtn.addEventListener('click', () => this.close())
    header.appendChild(closeBtn)

    menu.appendChild(header)

    // --- Quick Actions ---
    const isLocked = this.renderer.isCameraLocked() && this.renderer.getFollowTarget() === entityId
    this.addGroup(menu, 'Actions', [
      {
        label: isLocked ? 'Unlock Camera' : 'Lock Camera',
        active: isLocked,
        onClick: () => {
          this.onCameraLock?.(isLocked ? null : entityId)
          this.close()
        },
      },
      { label: 'Duplicate', onClick: () => this.duplicateEntity(entityId) },
      { label: 'Delete', danger: true, onClick: () => this.deleteEntity(entityId) },
    ])

    // --- Physics toggles ---
    const phys = entity.components.get('physics') as PhysicsComponent | undefined
    if (phys) {
      this.addGroup(menu, 'Physics', [
        {
          label: `Gravity: ${phys.gravity ? 'ON' : 'OFF'}`,
          active: phys.gravity,
          onClick: () => { phys.gravity = !phys.gravity; this.onEntityChanged?.(entityId); this.refresh(screenX, screenY) },
        },
        {
          label: `Solid: ${phys.solid ? 'ON' : 'OFF'}`,
          active: phys.solid,
          onClick: () => { phys.solid = !phys.solid; this.onEntityChanged?.(entityId); this.refresh(screenX, screenY) },
        },
      ])
    }

    // --- Appearance ---
    if (sprite) {
      this.addGroup(menu, 'Appearance', [
        {
          label: `Flip X: ${sprite.flipX ? 'ON' : 'OFF'}`,
          active: sprite.flipX ?? false,
          onClick: () => { sprite.flipX = !sprite.flipX; this.onEntityChanged?.(entityId); this.refresh(screenX, screenY) },
        },
      ])
    }

    // --- Consumable quick-edit (if already a consumable) ---
    const consumable = entity.components.get('consumable') as ConsumableComponent | undefined
    if (consumable) {
      this.addGroup(menu, 'Consumable', [
        {
          label: `Effect: ${consumable.effect}`,
          active: true,
          onClick: () => {
            const effects: ConsumableComponent['effect'][] = ['heal', 'speed', 'ammo', 'score']
            const idx = effects.indexOf(consumable.effect)
            consumable.effect = effects[(idx + 1) % effects.length]
            this.onEntityChanged?.(entityId)
            this.refresh(screenX, screenY)
          },
        },
      ])
    }

    // --- Voice Line ---
    const voiceLine = entity.components.get('voiceLine') as VoiceLineComponent | undefined
    const behavior = entity.components.get('behavior') as BehaviorComponent | undefined
    const hasSayVoice = behavior?.rules.some(r => r.action.startsWith('say_voice'))
    if (voiceLine) {
      const truncated = voiceLine.text.length > 18 ? voiceLine.text.slice(0, 18) + '...' : voiceLine.text
      this.addGroup(menu, 'Voice', [
        {
          label: `"${truncated}"`,
          active: true,
          onClick: () => this.openVoiceLinePopup(entityId, screenX, screenY),
        },
      ])
    } else if (hasSayVoice) {
      this.addGroup(menu, 'Voice', [
        {
          label: '+ Set Voice Line',
          onClick: () => this.openVoiceLinePopup(entityId, screenX, screenY),
        },
      ])
    }

    // --- Add Components (only show missing ones) ---
    const addButtons: { label: string; onClick: () => void }[] = []

    if (!entity.components.has('consumable')) {
      addButtons.push({
        label: '+ Make Consumable',
        onClick: () => {
          this.world.addComponent(entityId, { type: 'consumable', effect: 'heal', value: 20 })
          if (!entity.components.has('physics')) {
            this.world.addComponent(entityId, { type: 'physics', velocityX: 0, velocityY: 0, gravity: false, solid: false })
          }
          this.onEntityChanged?.(entityId)
          this.refresh(screenX, screenY)
        },
      })
    }
    if (!entity.components.has('physics')) {
      addButtons.push({
        label: '+ Add Physics',
        onClick: () => {
          this.world.addComponent(entityId, { type: 'physics', velocityX: 0, velocityY: 0, gravity: false, solid: true })
          this.onEntityChanged?.(entityId)
          this.refresh(screenX, screenY)
        },
      })
    }
    if (!entity.components.has('health')) {
      addButtons.push({
        label: '+ Add Health',
        onClick: () => {
          const p = entity.components.get('position') as PositionComponent | undefined
          this.world.addComponent(entityId, { type: 'health', hp: 100, maxHp: 100, invulnerableTimer: 0, spawnX: p?.x ?? 0, spawnY: p?.y ?? 0, respawnDelay: 3000, deadTimer: 0 })
          this.onEntityChanged?.(entityId)
          this.refresh(screenX, screenY)
        },
      })
    }
    if (!entity.components.has('patrol')) {
      addButtons.push({
        label: '+ Add Patrol',
        onClick: () => {
          this.world.addComponent(entityId, { type: 'patrol', waypoints: [], currentIndex: 0, speed: 60, loop: false, direction: 1 })
          this.onEntityChanged?.(entityId)
          this.close()
          this.onEditPatrol?.(entityId)
        },
      })
    }
    if (!entity.components.has('door')) {
      addButtons.push({
        label: '+ Add Door/Portal',
        onClick: () => {
          this.world.addComponent(entityId, { type: 'door', destinationId: null, bidirectional: false })
          this.onEntityChanged?.(entityId)
          this.refresh(screenX, screenY)
        },
      })
    }
    if (!entity.components.has('behavior')) {
      addButtons.push({
        label: '+ Add Behavior',
        onClick: () => {
          this.world.addComponent(entityId, { type: 'behavior', rules: [] })
          this.onEntityChanged?.(entityId)
          this.refresh(screenX, screenY)
        },
      })
    }
    if (!entity.components.has('voiceLine') && !hasSayVoice) {
      addButtons.push({
        label: '+ Add Voice Line',
        onClick: () => {
          if (!entity.components.has('behavior')) {
            this.world.addComponent(entityId, {
              type: 'behavior',
              rules: [{
                id: 'voice_bark',
                description: 'Say voice line when player is nearby',
                trigger: 'on_proximity 80',
                action: 'say_voice custom',
                enabled: true,
              }],
            })
          } else {
            const beh = entity.components.get('behavior') as BehaviorComponent
            beh.rules.push({
              id: 'voice_bark',
              description: 'Say voice line when player is nearby',
              trigger: 'on_proximity 80',
              action: 'say_voice custom',
              enabled: true,
            })
          }
          this.world.addComponent(entityId, { type: 'voiceLine', text: '' })
          this.onEntityChanged?.(entityId)
          this.openVoiceLinePopup(entityId, screenX, screenY)
        },
      })
    }

    if (addButtons.length > 0) {
      this.addGroup(menu, 'Add Component', addButtons)
    }

    this.overlay.appendChild(menu)
    document.body.appendChild(this.overlay)

    // Adjust position to keep menu on screen
    const rect = menu.getBoundingClientRect()
    if (left + rect.width > window.innerWidth - pad) {
      left = window.innerWidth - rect.width - pad
    }
    if (top + rect.height > window.innerHeight - pad) {
      top = window.innerHeight - rect.height - pad
    }
    menu.style.left = `${Math.max(pad, left)}px`
    menu.style.top = `${Math.max(pad, top)}px`

    // Escape to close
    this.escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.close()
    }
    window.addEventListener('keydown', this.escHandler)
  }

  close(): void {
    if (this.overlay) {
      this.overlay.remove()
      this.overlay = null
    }
    if (this.escHandler) {
      window.removeEventListener('keydown', this.escHandler)
      this.escHandler = null
    }
    this.entityId = null
  }

  private refresh(screenX: number, screenY: number): void {
    if (this.entityId) {
      this.open(this.entityId, screenX, screenY)
    }
  }

  private addGroup(parent: HTMLElement, title: string, items: { label: string; danger?: boolean; active?: boolean; onClick: () => void }[]): void {
    const group = document.createElement('div')
    group.className = 'context-menu-group'

    const titleEl = document.createElement('div')
    titleEl.className = 'context-menu-group-title'
    titleEl.textContent = title
    group.appendChild(titleEl)

    for (const item of items) {
      const btn = document.createElement('button')
      btn.className = item.danger ? 'context-menu-btn context-menu-btn-danger' : 'context-menu-btn'
      if (item.active) btn.classList.add('context-menu-btn-active')
      btn.textContent = item.label
      btn.addEventListener('mousedown', (e) => {
        e.stopPropagation()
        e.stopImmediatePropagation()
      })
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        e.stopImmediatePropagation()
        e.preventDefault()
        item.onClick()
      })
      group.appendChild(btn)
    }

    parent.appendChild(group)
  }

  private openVoiceLinePopup(entityId: string, screenX: number, screenY: number): void {
    this.close()
    const entity = this.world.getEntity(entityId)
    if (!entity) return

    const voiceLine = entity.components.get('voiceLine') as VoiceLineComponent | undefined

    const overlay = document.createElement('div')
    overlay.className = 'context-menu-overlay'
    overlay.addEventListener('contextmenu', (e) => e.preventDefault())
    overlay.addEventListener('mousedown', (e) => { e.stopPropagation(); e.preventDefault() })
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove() })

    const popup = document.createElement('div')
    popup.className = 'context-menu voice-line-popup'
    popup.addEventListener('mousedown', (e) => { e.stopPropagation(); e.stopImmediatePropagation() })
    popup.addEventListener('click', (e) => e.stopPropagation())

    const title = document.createElement('div')
    title.className = 'context-menu-group-title'
    title.textContent = 'VOICE LINE'
    title.style.padding = '0 0 6px'
    popup.appendChild(title)

    const textarea = document.createElement('textarea')
    textarea.className = 'voice-line-textarea'
    textarea.rows = 3
    textarea.placeholder = 'What should this entity say?'
    textarea.value = voiceLine?.text ?? ''
    popup.appendChild(textarea)

    const btnRow = document.createElement('div')
    btnRow.className = 'voice-line-btn-row'

    const saveBtn = document.createElement('button')
    saveBtn.className = 'context-menu-btn voice-line-save'
    saveBtn.textContent = 'Save'
    saveBtn.addEventListener('click', () => {
      const text = textarea.value.trim()
      if (entity.components.has('voiceLine')) {
        (entity.components.get('voiceLine') as VoiceLineComponent).text = text
      } else {
        this.world.addComponent(entityId, { type: 'voiceLine', text })
      }
      // Ensure entity has a say_voice behavior rule
      const beh = entity.components.get('behavior') as BehaviorComponent | undefined
      if (beh && !beh.rules.some(r => r.action.startsWith('say_voice'))) {
        beh.rules.push({
          id: 'voice_bark',
          description: 'Say voice line when player is nearby',
          trigger: 'on_proximity 80',
          action: 'say_voice custom',
          enabled: true,
        })
      }
      this.onEntityChanged?.(entityId)
      overlay.remove()
    })
    btnRow.appendChild(saveBtn)

    const cancelBtn = document.createElement('button')
    cancelBtn.className = 'context-menu-btn'
    cancelBtn.textContent = 'Cancel'
    cancelBtn.addEventListener('click', () => overlay.remove())
    btnRow.appendChild(cancelBtn)

    popup.appendChild(btnRow)

    const pad = 8
    let left = screenX
    let top = screenY
    popup.style.left = `${left}px`
    popup.style.top = `${top}px`

    overlay.appendChild(popup)
    document.body.appendChild(overlay)

    // Adjust position to keep on screen
    const rect = popup.getBoundingClientRect()
    if (left + rect.width > window.innerWidth - pad) left = window.innerWidth - rect.width - pad
    if (top + rect.height > window.innerHeight - pad) top = window.innerHeight - rect.height - pad
    popup.style.left = `${Math.max(pad, left)}px`
    popup.style.top = `${Math.max(pad, top)}px`

    textarea.focus()

    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { overlay.remove(); window.removeEventListener('keydown', escHandler) }
    }
    window.addEventListener('keydown', escHandler)
  }

  private duplicateEntity(entityId: string): void {
    const src = this.world.getEntity(entityId)
    if (!src) return

    this.world.saveSnapshot()
    const newId = this.world.createEntity(`${src.name}_copy`)

    for (const [, comp] of src.components) {
      const clone = JSON.parse(JSON.stringify(comp))
      if (clone.type === 'position') {
        clone.x += 32
      }
      this.world.addComponent(newId, clone)
    }

    this.close()
    this.onEntityDuplicated?.(newId)
  }

  private deleteEntity(entityId: string): void {
    this.world.saveSnapshot()
    this.world.removeEntity(entityId)
    this.close()
    this.onEntityDeleted?.(entityId)
  }
}
