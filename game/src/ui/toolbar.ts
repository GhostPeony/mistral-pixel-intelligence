import type { World } from '../ecs/world'
import { createMusicButton, startMusic } from './music-player'

export class Toolbar {
  private container: HTMLElement
  private statusDot: HTMLElement
  private autoSaveInterval: number | null = null

  onNew: (() => void) | null = null
  onSave: (() => void) | null = null
  onLoad: (() => void) | null = null
  onExport: (() => void) | null = null
  onSettings: (() => void) | null = null
  onChat: (() => void) | null = null
  onBestiary: (() => void) | null = null

  constructor(parent: HTMLElement, private world: World) {
    this.container = document.createElement('div')
    this.container.className = 'toolbar'

    const left = document.createElement('div')
    left.className = 'toolbar-group'

    const logo = document.createElement('span')
    logo.className = 'toolbar-logo'
    logo.textContent = 'Q-Bit and Build'
    left.appendChild(logo)

    left.appendChild(this.makeBtn('New', () => this.handleNew()))
    left.appendChild(this.makeBtn('Save', () => this.handleSave()))
    left.appendChild(this.makeBtn('Load', () => this.handleLoad()))
    left.appendChild(this.makeBtn('Export JSON', () => this.handleExport()))

    const homeLink = document.createElement('a')
    homeLink.className = 'toolbar-btn'
    homeLink.textContent = 'Menu'
    homeLink.href = '/landing.html'
    homeLink.style.textDecoration = 'none'
    left.appendChild(homeLink)

    const dashLink = document.createElement('a')
    dashLink.className = 'toolbar-btn'
    dashLink.textContent = 'Dashboard'
    dashLink.href = '/dashboard.html'
    dashLink.style.textDecoration = 'none'
    left.appendChild(dashLink)

    const chatBtn = this.makeBtn('Chat', () => this.onChat?.())
    chatBtn.title = 'Toggle chat (T)'
    left.appendChild(chatBtn)

    const bestiaryBtn = document.createElement('button')
    bestiaryBtn.className = 'toolbar-btn'
    bestiaryBtn.title = 'Bestiary (B)'
    bestiaryBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z"/></svg>'
    bestiaryBtn.addEventListener('click', () => this.onBestiary?.())
    left.appendChild(bestiaryBtn)

    const right = document.createElement('div')
    right.className = 'toolbar-group'

    const musicEl = createMusicButton()
    right.appendChild(musicEl)

    this.statusDot = document.createElement('span')
    this.statusDot.className = 'status-dot connected'
    this.statusDot.title = 'Server status'
    right.appendChild(this.statusDot)

    const gearBtn = document.createElement('button')
    gearBtn.className = 'toolbar-btn'
    gearBtn.title = 'Settings'
    gearBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/><path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.892 3.434-.901 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.892-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.421 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.421-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/></svg>'
    gearBtn.addEventListener('click', () => this.onSettings?.())
    right.appendChild(gearBtn)

    this.container.appendChild(left)
    this.container.appendChild(right)
    parent.prepend(this.container)

    // Start music on first user interaction (browser autoplay policy)
    const tryStart = () => {
      startMusic()
      document.removeEventListener('click', tryStart)
      document.removeEventListener('keydown', tryStart)
    }
    document.addEventListener('click', tryStart, { once: true })
    document.addEventListener('keydown', tryStart, { once: true })

    this.startAutoSave()
  }

  setConnectionStatus(status: 'connected' | 'disconnected' | 'processing'): void {
    this.statusDot.className = `status-dot ${status}`
  }

  startAutoSave(): void {
    this.autoSaveInterval = window.setInterval(() => {
      try {
        localStorage.setItem('mistral-maker-autosave', this.world.serialize())
      } catch { /* quota exceeded — ignore */ }
    }, 30_000)
  }

  stopAutoSave(): void {
    if (this.autoSaveInterval !== null) {
      clearInterval(this.autoSaveInterval)
      this.autoSaveInterval = null
    }
  }

  destroy(): void {
    this.stopAutoSave()
  }

  private makeBtn(label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.className = 'toolbar-btn'
    btn.textContent = label
    btn.addEventListener('click', onClick)
    return btn
  }

  private handleNew(): void {
    if (!confirm('Create a new level? Unsaved changes will be lost.')) return
    this.onNew?.()
    this.world.replaceFromSnapshot(JSON.stringify({ entities: [] }))
  }

  private async handleSave(): Promise<void> {
    const name = prompt('Level name:', 'my-level')
    if (!name) return
    const sanitized = name.replace(/[^a-zA-Z0-9_-]/g, '_')
    try {
      const res = await fetch('/api/levels/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: sanitized, data: this.world.serialize() }),
      })
      if (!res.ok) throw new Error(await res.text())
      localStorage.setItem('mistral-maker-autosave', this.world.serialize())
      alert(`Saved "${sanitized}"`)
    } catch (err) {
      alert(`Save failed: ${err instanceof Error ? err.message : err}`)
    }
  }

  private async handleLoad(): Promise<void> {
    try {
      const res = await fetch('/api/levels')
      if (!res.ok) throw new Error('Failed to list levels')
      const levels: string[] = await res.json()

      if (levels.length === 0) {
        // Try autosave from localStorage
        const autosave = localStorage.getItem('mistral-maker-autosave')
        if (autosave) {
          if (confirm('No saved levels on server. Load autosave from browser?')) {
            this.world.replaceFromSnapshot(autosave)
          }
          return
        }
        alert('No saved levels found.')
        return
      }

      const choice = prompt(`Available levels:\n${levels.join('\n')}\n\nEnter level name to load:`)
      if (!choice) return

      const dataRes = await fetch(`/api/levels/${encodeURIComponent(choice)}`)
      if (!dataRes.ok) throw new Error(`Level "${choice}" not found`)
      const data = await dataRes.text()
      this.world.replaceFromSnapshot(data)
    } catch (err) {
      alert(`Load failed: ${err instanceof Error ? err.message : err}`)
    }
  }

  private handleExport(): void {
    const json = this.world.serialize()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'level.json'
    a.click()
    URL.revokeObjectURL(url)
  }
}
