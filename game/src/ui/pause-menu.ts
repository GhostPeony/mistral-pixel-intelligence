export class PauseMenu {
  private overlay: HTMLElement | null = null
  private keyHandler: ((e: KeyboardEvent) => void) | null = null

  onResume: (() => void) | null = null
  onBackToBuild: (() => void) | null = null

  get isOpen(): boolean {
    return this.overlay !== null
  }

  toggle(): void {
    if (this.overlay) {
      this.close()
      this.onResume?.()
    } else {
      this.open()
    }
  }

  open(): void {
    this.overlay = document.createElement('div')
    this.overlay.className = 'pause-overlay'

    const modal = document.createElement('div')
    modal.className = 'pause-modal'

    const title = document.createElement('h2')
    title.className = 'pause-title'
    title.textContent = 'PAUSED'
    modal.appendChild(title)

    const resumeBtn = document.createElement('button')
    resumeBtn.className = 'editor-btn editor-btn-primary'
    resumeBtn.textContent = 'Resume'
    resumeBtn.addEventListener('click', () => {
      this.close()
      this.onResume?.()
    })
    modal.appendChild(resumeBtn)

    const buildBtn = document.createElement('button')
    buildBtn.className = 'editor-btn editor-btn-secondary'
    buildBtn.textContent = 'Back to Build'
    buildBtn.addEventListener('click', () => {
      this.close()
      this.onBackToBuild?.()
    })
    modal.appendChild(buildBtn)

    this.overlay.appendChild(modal)
    document.body.appendChild(this.overlay)

    this.keyHandler = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        this.close()
        this.onResume?.()
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
