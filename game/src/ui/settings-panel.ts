import { GAME_CONFIG } from '../config/game-config'

export class SettingsPanel {
  private overlay: HTMLElement | null = null

  onPhysicsChange: ((gravity: number, killZoneY: number) => void) | null = null
  onPlayerChange: ((walkSpeed: number, jumpVelocity: number, maxJumps: number) => void) | null = null
  onEditorChange: ((gridSize: number) => void) | null = null

  toggle(): void {
    if (this.overlay) {
      this.close()
    } else {
      this.open()
    }
  }

  open(): void {
    this.overlay = document.createElement('div')
    this.overlay.className = 'settings-overlay'
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close()
    })

    const modal = document.createElement('div')
    modal.className = 'settings-modal'

    // Header
    const header = document.createElement('div')
    header.className = 'settings-header'
    const title = document.createElement('h2')
    title.className = 'settings-title'
    title.textContent = 'Settings'
    const closeBtn = document.createElement('button')
    closeBtn.className = 'settings-close'
    closeBtn.textContent = '\u00D7'
    closeBtn.addEventListener('click', () => this.close())
    header.appendChild(title)
    header.appendChild(closeBtn)
    modal.appendChild(header)

    // Physics section
    this.addSection(modal, 'Physics')
    this.addNumberRow(modal, 'Gravity', GAME_CONFIG.physics.gravity, (v) => {
      GAME_CONFIG.physics.gravity = v
      this.onPhysicsChange?.(GAME_CONFIG.physics.gravity, GAME_CONFIG.physics.killZoneY)
    })
    this.addNumberRow(modal, 'Kill Zone Y', GAME_CONFIG.physics.killZoneY, (v) => {
      GAME_CONFIG.physics.killZoneY = v
      this.onPhysicsChange?.(GAME_CONFIG.physics.gravity, GAME_CONFIG.physics.killZoneY)
    })

    // Player section
    this.addSection(modal, 'Player')
    this.addNumberRow(modal, 'Walk Speed', GAME_CONFIG.player.walkSpeed, (v) => {
      GAME_CONFIG.player.walkSpeed = v
      this.onPlayerChange?.(GAME_CONFIG.player.walkSpeed, GAME_CONFIG.player.jumpVelocity, GAME_CONFIG.player.maxJumps)
    })
    this.addNumberRow(modal, 'Jump Velocity', GAME_CONFIG.player.jumpVelocity, (v) => {
      GAME_CONFIG.player.jumpVelocity = v
      this.onPlayerChange?.(GAME_CONFIG.player.walkSpeed, GAME_CONFIG.player.jumpVelocity, GAME_CONFIG.player.maxJumps)
    })
    this.addNumberRow(modal, 'Max Jumps', GAME_CONFIG.player.maxJumps, (v) => {
      GAME_CONFIG.player.maxJumps = v
      this.onPlayerChange?.(GAME_CONFIG.player.walkSpeed, GAME_CONFIG.player.jumpVelocity, GAME_CONFIG.player.maxJumps)
    })

    // Editor section
    this.addSection(modal, 'Editor')
    this.addNumberRow(modal, 'Grid Size', GAME_CONFIG.editor.gridSize, (v) => {
      GAME_CONFIG.editor.gridSize = v
      this.onEditorChange?.(GAME_CONFIG.editor.gridSize)
    })

    this.overlay.appendChild(modal)
    document.body.appendChild(this.overlay)
  }

  close(): void {
    if (this.overlay) {
      this.overlay.remove()
      this.overlay = null
    }
  }

  private addSection(parent: HTMLElement, label: string): void {
    const el = document.createElement('div')
    el.className = 'context-section'
    el.textContent = label
    parent.appendChild(el)
  }

  private addNumberRow(parent: HTMLElement, label: string, value: number, onChange: (v: number) => void): void {
    const row = document.createElement('div')
    row.className = 'context-row'
    const lbl = document.createElement('label')
    lbl.className = 'context-label'
    lbl.textContent = label
    const input = document.createElement('input')
    input.type = 'number'
    input.className = 'editor-input editor-input-number'
    input.value = String(value)
    input.addEventListener('change', () => {
      const v = parseFloat(input.value)
      if (!isNaN(v)) onChange(v)
    })
    row.appendChild(lbl)
    row.appendChild(input)
    parent.appendChild(row)
  }
}
