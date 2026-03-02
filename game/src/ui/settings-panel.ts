export class SettingsPanel {
  private overlay: HTMLElement | null = null

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
    title.textContent = 'API Keys'
    const closeBtn = document.createElement('button')
    closeBtn.className = 'settings-close'
    closeBtn.textContent = '\u00D7'
    closeBtn.addEventListener('click', () => this.close())
    header.appendChild(title)
    header.appendChild(closeBtn)
    modal.appendChild(header)

    const desc = document.createElement('p')
    desc.className = 'settings-desc'
    desc.textContent = 'Keys are stored in your browser and sent as headers with each request. The server never stores them.'
    modal.appendChild(desc)

    // Mistral API Key
    this.addKeyField(modal, {
      label: 'Mistral API Key',
      storageKey: 'mistral-api-key',
      helpUrl: 'https://console.mistral.ai/api-keys/',
      helpText: 'Get a key at console.mistral.ai',
    })

    // ElevenLabs API Key
    this.addKeyField(modal, {
      label: 'ElevenLabs API Key',
      storageKey: 'elevenlabs-api-key',
      helpUrl: 'https://elevenlabs.io/app/settings/api-keys',
      helpText: 'Get a key at elevenlabs.io',
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

  private addKeyField(
    parent: HTMLElement,
    opts: { label: string; storageKey: string; helpUrl: string; helpText: string },
  ): void {
    const section = document.createElement('div')
    section.className = 'settings-key-section'

    // Label row with status dot
    const labelRow = document.createElement('div')
    labelRow.className = 'settings-key-label-row'

    const stored = localStorage.getItem(opts.storageKey)

    const dot = document.createElement('span')
    dot.className = 'settings-key-dot'
    dot.style.background = stored ? '#48BB78' : '#A0AEC0'

    const label = document.createElement('label')
    label.className = 'settings-key-label'
    label.textContent = opts.label

    labelRow.appendChild(dot)
    labelRow.appendChild(label)
    section.appendChild(labelRow)

    // Input row with visibility toggle
    const inputRow = document.createElement('div')
    inputRow.className = 'settings-key-input-row'

    const input = document.createElement('input')
    input.type = 'password'
    input.className = 'settings-key-input'
    input.placeholder = 'Paste your key here...'
    input.spellcheck = false
    input.autocomplete = 'off'
    input.value = stored ?? ''

    input.addEventListener('blur', () => {
      const val = input.value.trim()
      if (val) {
        localStorage.setItem(opts.storageKey, val)
      } else {
        localStorage.removeItem(opts.storageKey)
      }
      dot.style.background = val ? '#48BB78' : '#A0AEC0'
    })

    const toggleBtn = document.createElement('button')
    toggleBtn.className = 'settings-key-toggle'
    toggleBtn.type = 'button'
    toggleBtn.innerHTML = eyeClosedSvg
    toggleBtn.title = 'Show/hide key'
    toggleBtn.addEventListener('click', () => {
      const visible = input.type === 'text'
      input.type = visible ? 'password' : 'text'
      toggleBtn.innerHTML = visible ? eyeClosedSvg : eyeOpenSvg
    })

    inputRow.appendChild(input)
    inputRow.appendChild(toggleBtn)
    section.appendChild(inputRow)

    // Helper link
    const help = document.createElement('a')
    help.className = 'settings-key-help'
    help.href = opts.helpUrl
    help.target = '_blank'
    help.rel = 'noopener'
    help.textContent = opts.helpText
    section.appendChild(help)

    parent.appendChild(section)
  }

  /** Read current API keys from localStorage. */
  static getApiKeys(): { mistral?: string; elevenlabs?: string } {
    return {
      mistral: localStorage.getItem('mistral-api-key') ?? undefined,
      elevenlabs: localStorage.getItem('elevenlabs-api-key') ?? undefined,
    }
  }
}

const eyeOpenSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`

const eyeClosedSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
