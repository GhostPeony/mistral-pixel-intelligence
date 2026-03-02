export class TrainingTab {
  private container: HTMLElement | null = null
  private seedDir: string | null = null

  async render(parent: HTMLElement): Promise<void> {
    this.container = document.createElement('div')
    this.container.className = 'training-tab'
    parent.appendChild(this.container)

    let status: any = null
    try {
      const res = await fetch('/api/pipeline/status')
      status = await res.json()
    } catch {
      // server offline
    }

    this.container.innerHTML = ''
    this.renderPipelineSteps(status)
  }

  private renderPipelineSteps(status: any): void {
    const pipeline = document.createElement('div')
    pipeline.className = 'pipeline-steps'

    pipeline.appendChild(this.renderStep1(status))
    pipeline.appendChild(this.renderStep2(status))
    pipeline.appendChild(this.renderStep3())

    this.container!.appendChild(pipeline)
  }

  private renderStep1(status: any): HTMLElement {
    const step = document.createElement('div')
    step.className = 'pipeline-step'

    const traceCount = status?.traces ?? 0
    const tiers = status?.tiers ?? { gold: 0, silver: 0, bronze: 0, failed: 0 }

    step.innerHTML = `
      <div class="step-header">
        <span class="step-number">1</span>
        <h3 class="step-title">Build Seeds</h3>
        <span class="tag-badge">${traceCount} TRACES</span>
      </div>
      <div class="step-tier-row">
        <span class="step-tier step-tier-gold">${tiers.gold} gold</span>
        <span class="step-tier step-tier-silver">${tiers.silver} silver</span>
        <span class="step-tier step-tier-bronze">${tiers.bronze} bronze</span>
        <span class="step-tier step-tier-failed">${tiers.failed} failed</span>
      </div>
      <div class="step-controls">
        <div class="context-row">
          <label class="context-label">Min Tier</label>
          <select class="editor-input" id="min-tier" style="width:120px">
            <option value="bronze" selected>Bronze+</option>
            <option value="silver">Silver+</option>
            <option value="gold">Gold only</option>
          </select>
        </div>
        <div class="context-row">
          <label class="context-label">Dedup</label>
          <input type="checkbox" class="editor-checkbox" id="dedup" checked>
        </div>
        <div class="context-row">
          <label class="context-label">Max Seeds</label>
          <input type="number" class="editor-input editor-input-number" id="max-seeds" value="500">
        </div>
      </div>
    `

    const btn = document.createElement('button')
    btn.className = 'editor-btn editor-btn-primary'
    btn.textContent = 'Build Seeds'
    btn.style.marginTop = '12px'

    const result = document.createElement('div')
    result.className = 'step-result'
    result.id = 'step1-result'

    btn.addEventListener('click', async () => {
      btn.disabled = true
      btn.textContent = 'Building...'
      try {
        const minTier = (document.getElementById('min-tier') as HTMLSelectElement).value
        const dedup = (document.getElementById('dedup') as HTMLInputElement).checked
        const maxSeeds = parseInt((document.getElementById('max-seeds') as HTMLInputElement).value)

        const res = await fetch('/api/pipeline/build-seeds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ minTier, dedup, maxSeeds }),
        })
        const data = await res.json()
        this.seedDir = data.outputDir
        result.innerHTML = `<span class="step-success">\u2713 ${data.outputDir}</span>`
        btn.textContent = 'Rebuild'
      } catch (err) {
        result.innerHTML = `<span class="step-error">${err instanceof Error ? err.message : err}</span>`
        btn.textContent = 'Build Seeds'
      }
      btn.disabled = false
    })

    step.appendChild(btn)
    step.appendChild(result)
    return step
  }

  private renderStep2(status: any): HTMLElement {
    const step = document.createElement('div')
    step.className = 'pipeline-step'

    const designer = status?.dataDesigner ?? { available: false, method: 'none' }

    step.innerHTML = `
      <div class="step-header">
        <span class="step-number">2</span>
        <h3 class="step-title">Amplify</h3>
        <span class="tag-badge">${designer.available ? (designer.method === 'nvidia_nim' ? 'NVIDIA NIM' : designer.method.toUpperCase()) : 'OFFLINE'}</span>
      </div>
      <div class="step-kv">
        <span class="step-kv-label">Engine</span><span class="step-kv-value">NVIDIA NIM (Nemotron)</span>
        <span class="step-kv-label">Factor</span><span class="step-kv-value">5x synthetic expansion</span>
        <span class="step-kv-label">Method</span><span class="step-kv-value">Rephrase, variation, novel generation, DPO pairs</span>
      </div>
      ${!designer.available ? `<div class="step-install-hint"><code>Set NVIDIA_API_KEY in .env</code></div>` : ''}
    `

    const btn = document.createElement('button')
    btn.className = 'editor-btn editor-btn-primary'
    btn.textContent = 'Amplify'
    btn.style.marginTop = '12px'
    btn.disabled = !designer.available

    const result = document.createElement('div')
    result.className = 'step-result'
    result.id = 'step2-result'

    btn.addEventListener('click', async () => {
      if (!this.seedDir) {
        result.innerHTML = '<span class="step-error">Build seeds first</span>'
        return
      }
      btn.disabled = true
      btn.textContent = 'Amplifying...'
      try {
        const res = await fetch('/api/pipeline/amplify-nvidia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seedDir: this.seedDir }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        result.innerHTML = `<span class="step-success">\u2713 ${data.count ?? data.outputExamples ?? '?'} examples</span>`
        btn.textContent = 'Re-amplify'
      } catch (err) {
        result.innerHTML = `<span class="step-error">${err instanceof Error ? err.message : err}</span>`
        btn.textContent = 'Amplify'
      }
      btn.disabled = false
    })

    step.appendChild(btn)
    step.appendChild(result)
    return step
  }

  private renderStep3(): HTMLElement {
    const step = document.createElement('div')
    step.className = 'pipeline-step'

    step.innerHTML = `
      <div class="step-header">
        <span class="step-number">3</span>
        <h3 class="step-title">Train</h3>
        <span class="tag-badge">UNSLOTH</span>
      </div>
      <div class="step-kv">
        <span class="step-kv-label">Base</span><span class="step-kv-value">Mistral-7B-Instruct-v0.3</span>
        <span class="step-kv-label">Method</span><span class="step-kv-value">QLoRA 4-bit</span>
        <span class="step-kv-label">Cloud</span><span class="step-kv-value">HuggingFace Spaces</span>
      </div>
      <div class="step-controls">
        <div class="context-row">
          <label class="context-label">Backend</label>
          <select class="editor-input" id="train-backend" style="width:160px">
            <option value="cloud" selected>HuggingFace Cloud</option>
            <option value="local">Local GPU</option>
          </select>
        </div>
        <div class="context-row">
          <label class="context-label">Hardware</label>
          <select class="editor-input" id="train-hardware" style="width:160px">
            <option value="t4-small">T4 Small</option>
            <option value="a10g-large" selected>A10G Large</option>
            <option value="a100-large">A100 Large</option>
          </select>
        </div>
        <div class="context-row">
          <label class="context-label">LoRA Rank</label>
          <input type="number" class="editor-input editor-input-number" id="train-rank" value="32">
        </div>
        <div class="context-row">
          <label class="context-label">Max Steps</label>
          <input type="number" class="editor-input editor-input-number" id="train-steps" value="60">
        </div>
        <div class="context-row">
          <label class="context-label">LR</label>
          <input type="text" class="editor-input" id="train-lr" value="2e-5" style="width:100px">
        </div>
      </div>
    `

    const btn = document.createElement('button')
    btn.className = 'editor-btn editor-btn-primary'
    btn.textContent = 'Launch Training'
    btn.style.marginTop = '12px'

    const result = document.createElement('div')
    result.className = 'step-result'
    result.id = 'step3-result'

    btn.addEventListener('click', async () => {
      if (!this.seedDir) {
        result.innerHTML = '<span class="step-error">Build seeds first</span>'
        return
      }
      btn.disabled = true
      btn.textContent = 'Launching...'
      try {
        const cloud = (document.getElementById('train-backend') as HTMLSelectElement).value === 'cloud'
        const hardware = (document.getElementById('train-hardware') as HTMLSelectElement).value
        const rank = parseInt((document.getElementById('train-rank') as HTMLInputElement).value)
        const maxSteps = parseInt((document.getElementById('train-steps') as HTMLInputElement).value)
        const learningRate = parseFloat((document.getElementById('train-lr') as HTMLInputElement).value)

        const res = await fetch('/api/pipeline/train', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seedDir: this.seedDir, cloud, hardware, rank, maxSteps, learningRate }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        result.innerHTML = `<span class="step-success">\u2713 ${data.status} ${cloud ? '(HF Cloud)' : '(local)'}</span>`
        btn.textContent = 'Launch Again'
      } catch (err) {
        result.innerHTML = `<span class="step-error">${err instanceof Error ? err.message : err}</span>`
        btn.textContent = 'Launch Training'
      }
      btn.disabled = false
    })

    step.appendChild(btn)
    step.appendChild(result)
    return step
  }

  destroy(): void {
    this.container?.remove()
  }
}
