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
        const adapterPath = `.mistral-maker/models/${model.name}/adapter`
        const btnRow = document.createElement('div')
        btnRow.style.display = 'flex'
        btnRow.style.gap = '8px'
        btnRow.style.marginTop = '8px'
        btnRow.style.flexWrap = 'wrap'

        const copyBtn = document.createElement('button')
        copyBtn.className = 'editor-btn editor-btn-secondary'
        copyBtn.textContent = 'Copy Path'
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(adapterPath).then(() => {
            copyBtn.textContent = 'Copied!'
            setTimeout(() => { copyBtn.textContent = 'Copy Path' }, 2000)
          }).catch(() => {
            alert(`Path: ${adapterPath}`)
          })
        })

        const deployBtn = document.createElement('button')
        deployBtn.className = 'editor-btn editor-btn-primary'
        deployBtn.textContent = 'Deploy'

        const evalBtn = document.createElement('button')
        evalBtn.className = 'editor-btn editor-btn-secondary'
        evalBtn.textContent = 'Run Eval'

        const resultEl = document.createElement('div')
        resultEl.className = 'step-result'

        deployBtn.addEventListener('click', async () => {
          deployBtn.disabled = true
          deployBtn.textContent = 'Deploying...'
          try {
            const res = await fetch('/api/ai/deploy-student', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ modelId: adapterPath }),
            })
            const data = await res.json()
            if (data.error) throw new Error(data.error)
            resultEl.innerHTML = `<span class="step-success">\u2713 Deployed (${data.deployed?.strategy ?? 'ok'})</span>`
            deployBtn.textContent = 'Redeploy'
          } catch (err) {
            resultEl.innerHTML = `<span class="step-error">${err instanceof Error ? err.message : err}</span>`
            deployBtn.textContent = 'Deploy'
          }
          deployBtn.disabled = false
        })

        evalBtn.addEventListener('click', async () => {
          evalBtn.disabled = true
          evalBtn.textContent = 'Evaluating...'
          resultEl.innerHTML = ''
          try {
            const res = await fetch('/api/eval/run', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ modelId: adapterPath }),
            })
            const data = await res.json()
            if (data.error) throw new Error(data.error)
            let html = `<span class="step-success">Score: ${(data.overall * 100).toFixed(1)}%</span>`
            if (data.dimensions) {
              const dims = Object.entries(data.dimensions as Record<string, { score: number }>)
              html += '<div style="margin-top:8px">' + dims.map(([key, d]) =>
                `<div class="dimension-row">
                  <span class="dimension-label">${key}</span>
                  <div class="dimension-track"><div class="dimension-fill" style="width:${d.score * 100}%"></div></div>
                  <span class="dimension-value">${(d.score * 100).toFixed(0)}%</span>
                </div>`
              ).join('') + '</div>'
            }
            resultEl.innerHTML = html
            evalBtn.textContent = 'Re-run Eval'
          } catch (err) {
            resultEl.innerHTML = `<span class="step-error">${err instanceof Error ? err.message : err}</span>`
            evalBtn.textContent = 'Run Eval'
          }
          evalBtn.disabled = false
        })

        btnRow.appendChild(copyBtn)
        btnRow.appendChild(deployBtn)
        btnRow.appendChild(evalBtn)
        card.appendChild(btnRow)
        card.appendChild(resultEl)
      }

      list.appendChild(card)
    }

    this.container!.appendChild(list)
  }

  destroy(): void {
    this.container?.remove()
  }
}
