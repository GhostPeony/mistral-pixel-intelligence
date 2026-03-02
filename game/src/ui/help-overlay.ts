export class HelpOverlay {
  private overlay: HTMLElement | null = null
  private keyHandler: ((e: KeyboardEvent) => void) | null = null

  toggle(): void {
    if (this.overlay) {
      this.close()
    } else {
      this.open()
    }
  }

  open(): void {
    this.overlay = document.createElement('div')
    this.overlay.className = 'help-overlay'
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close()
    })

    const modal = document.createElement('div')
    modal.className = 'help-modal'

    const title = document.createElement('h2')
    title.className = 'help-title'
    title.textContent = 'Keyboard Shortcuts'
    modal.appendChild(title)

    const shortcuts: [string, string, boolean?][] = [
      ['Tab', 'Toggle Build / Play mode'],
      ['G', 'Toggle grid snap'],
      ['Del / Backspace', 'Delete selected entity'],
      ['Ctrl+Z', 'Undo'],
      ['Shift+Click', 'Clone entity'],
      ['Middle / Right drag', 'Pan camera'],
      ['Scroll', 'Zoom in / out'],
      ['?', 'Toggle this help'],
      ['T', 'Toggle chat panel'],
      ['B / I', 'Toggle backpack'],
      ['', '', true], // separator
      ['Space / W / Up', 'Jump', undefined],
      ['A / D / Arrows', 'Move left / right'],
      ['F', 'Pick up item'],
      ['E', 'Attack'],
      ['Escape', 'Pause'],
    ]

    const table = document.createElement('table')
    table.className = 'help-table'

    for (const [key, action, isSep] of shortcuts) {
      if (isSep) {
        const sepRow = document.createElement('tr')
        const sepCell = document.createElement('td')
        sepCell.colSpan = 2
        sepCell.className = 'help-separator'
        sepCell.textContent = 'Play Mode'
        sepRow.appendChild(sepCell)
        table.appendChild(sepRow)
        continue
      }
      const tr = document.createElement('tr')
      const keyCell = document.createElement('td')
      const kbd = document.createElement('kbd')
      kbd.className = 'help-key'
      kbd.textContent = key
      keyCell.appendChild(kbd)
      const actionCell = document.createElement('td')
      actionCell.className = 'help-action'
      actionCell.textContent = action
      tr.appendChild(keyCell)
      tr.appendChild(actionCell)
      table.appendChild(tr)
    }

    modal.appendChild(table)

    const hint = document.createElement('div')
    hint.className = 'help-hint'
    hint.textContent = 'Press ? or Escape to close'
    modal.appendChild(hint)

    this.overlay.appendChild(modal)
    document.body.appendChild(this.overlay)

    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === '?') {
        e.preventDefault()
        e.stopPropagation()
        this.close()
      }
    }
    window.addEventListener('keydown', this.keyHandler, true)
  }

  close(): void {
    if (this.overlay) {
      this.overlay.remove()
      this.overlay = null
    }
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler, true)
      this.keyHandler = null
    }
  }
}
