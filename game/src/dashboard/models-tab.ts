interface ModelRun {
  name: string
  timestamp: string
  hasAdapter: boolean
}

export class ModelsTab {
  private container: HTMLElement | null = null

  async render(parent: HTMLElement): Promise<void> {
    this.container = document.createElement('div')
    this.container.className = 'models-tab'
    parent.appendChild(this.container)

    this.container.innerHTML = '<div class="dash-loading">Loading models...</div>'

    try {
      const res = await fetch('/api/pipeline/models')
      const models: ModelRun[] = await res.json()
      this.container.innerHTML = ''
      this.renderModels(models)
    } catch {
      this.container.innerHTML = '<div class="dash-error">Failed to load models. Is the server running?</div>'
    }
  }

  private renderModels(models: ModelRun[]): void {
    if (models.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'models-empty'
      empty.innerHTML = `
        <h3 class="dash-empty-title">No Runs Yet</h3>
        <p class="dash-empty-desc">Launch training from the Training tab. Completed adapters appear here.</p>
      `
      this.container!.appendChild(empty)
      return
    }

    const header = document.createElement('div')
    header.className = 'stats-section'
    header.innerHTML = `<h3 class="stats-section-title">${models.length} Run${models.length !== 1 ? 's' : ''}</h3>`
    this.container!.appendChild(header)

    const list = document.createElement('div')
    list.className = 'model-list'

    for (const model of [...models].reverse()) {
      const card = document.createElement('div')
      card.className = 'model-card'

      const ts = model.timestamp || model.name.replace('run_', '')
      let displayTime: string
      try {
        displayTime = new Date(parseInt(ts)).toLocaleString()
      } catch {
        displayTime = ts
      }

      card.innerHTML = `
        <div class="model-card-header">
          <span class="model-name">${model.name}</span>
          <span class="tag-badge">${model.hasAdapter ? 'READY' : 'TRAINING'}</span>
        </div>
        <div class="model-card-meta">${displayTime}</div>
      `

      if (model.hasAdapter) {
        const copyBtn = document.createElement('button')
        copyBtn.className = 'editor-btn editor-btn-secondary'
        copyBtn.textContent = 'Copy Path'
        copyBtn.style.marginTop = '8px'
        copyBtn.addEventListener('click', () => {
          const path = `.mistral-maker/models/${model.name}/adapter`
          navigator.clipboard.writeText(path).then(() => {
            copyBtn.textContent = 'Copied!'
            setTimeout(() => { copyBtn.textContent = 'Copy Path' }, 2000)
          }).catch(() => {
            alert(`Path: ${path}`)
          })
        })
        card.appendChild(copyBtn)
      }

      list.appendChild(card)
    }

    this.container!.appendChild(list)
  }

  destroy(): void {
    this.container?.remove()
  }
}
