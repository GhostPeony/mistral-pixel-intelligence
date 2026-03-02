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
    this.renderOrchestratorControls()
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
        <span class="step-kv-label">Method</span><span class="step-kv-value">Rephrase, variation, novel generation, DPO pairs</span>
      </div>
      <div class="step-controls">
        <div class="context-row">
          <label class="context-label">Factor</label>
          <input type="number" class="editor-input editor-input-number" id="amplify-factor" value="5" min="1" max="10">
          <span class="trace-count" style="margin-left:4px">synthetic expansion multiplier</span>
        </div>
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
        const factor = parseInt((document.getElementById('amplify-factor') as HTMLInputElement).value) || 5
        const res = await fetch('/api/pipeline/amplify-nvidia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seedDir: this.seedDir, factor }),
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
        <div class="context-row">
          <label class="context-label">Strategy</label>
          <select class="editor-input" id="train-strategy" style="width:160px">
            <option value="auto" selected>Auto-detect</option>
            <option value="sft">SFT</option>
            <option value="dpo">DPO</option>
            <option value="grpo">GRPO</option>
            <option value="distillation">Distillation</option>
          </select>
        </div>
      </div>
      <div class="step-kv" style="margin-top:4px">
        <span class="step-kv-label">Hint</span><span class="step-kv-value" style="font-size:12px">Auto picks DPO if dpo_seeds.jsonl exists, otherwise SFT</span>
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
        const strategyVal = (document.getElementById('train-strategy') as HTMLSelectElement).value
        const strategy = strategyVal === 'auto' ? undefined : strategyVal

        const res = await fetch('/api/pipeline/train', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seedDir: this.seedDir, cloud, hardware, rank, maxSteps, learningRate, strategy }),
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

  private async renderOrchestratorControls(): Promise<void> {
    const section = document.createElement('div')
    section.className = 'pipeline-step'
    section.style.marginTop = '24px'

    section.innerHTML = `
      <div class="step-header">
        <span class="step-number">\u2699</span>
        <h3 class="step-title">Orchestrator</h3>
        <span class="tag-badge" id="orch-mode-badge">MANUAL</span>
      </div>
      <div class="step-controls">
        <div class="context-row">
          <label class="context-label">Mode</label>
          <select class="editor-input" id="orch-mode" style="width:160px">
            <option value="manual">Manual</option>
            <option value="semi_auto">Semi-Auto</option>
            <option value="full_auto">Full-Auto</option>
          </select>
        </div>
        <div class="context-row">
          <label class="context-label">Amplify after gold</label>
          <input type="number" class="editor-input editor-input-number" id="orch-amplify-threshold" value="10">
        </div>
        <div class="context-row">
          <label class="context-label">Train after examples</label>
          <input type="number" class="editor-input editor-input-number" id="orch-train-threshold" value="100">
        </div>
        <div class="context-row">
          <label class="context-label">Cooldown (min)</label>
          <select class="editor-input" id="orch-cooldown" style="width:100px">
            <option value="30">30</option>
            <option value="60" selected>60</option>
            <option value="120">120</option>
            <option value="360">360</option>
          </select>
        </div>
        <div class="context-row">
          <label class="context-label">Max daily runs</label>
          <select class="editor-input" id="orch-max-daily" style="width:100px">
            <option value="1">1</option>
            <option value="2" selected>2</option>
            <option value="5">5</option>
            <option value="10">10</option>
          </select>
        </div>
      </div>
    `

    const btnRow = document.createElement('div')
    btnRow.style.display = 'flex'
    btnRow.style.gap = '8px'
    btnRow.style.marginTop = '12px'

    const startBtn = document.createElement('button')
    startBtn.className = 'editor-btn editor-btn-primary'
    startBtn.textContent = 'Start'

    const stopBtn = document.createElement('button')
    stopBtn.className = 'editor-btn editor-btn-secondary'
    stopBtn.textContent = 'Stop'

    const saveBtn = document.createElement('button')
    saveBtn.className = 'editor-btn editor-btn-secondary'
    saveBtn.textContent = 'Save Config'

    const result = document.createElement('div')
    result.className = 'step-result'

    startBtn.addEventListener('click', async () => {
      const mode = (document.getElementById('orch-mode') as HTMLSelectElement).value
      startBtn.disabled = true
      try {
        const res = await fetch('/api/pipeline/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        result.innerHTML = `<span class="step-success">\u2713 Started (${data.status?.status ?? mode})</span>`
      } catch (err) {
        result.innerHTML = `<span class="step-error">${err instanceof Error ? err.message : err}</span>`
      }
      startBtn.disabled = false
    })

    stopBtn.addEventListener('click', async () => {
      stopBtn.disabled = true
      try {
        const res = await fetch('/api/pipeline/stop', { method: 'POST' })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        result.innerHTML = `<span class="step-success">\u2713 Stopped</span>`
      } catch (err) {
        result.innerHTML = `<span class="step-error">${err instanceof Error ? err.message : err}</span>`
      }
      stopBtn.disabled = false
    })

    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true
      try {
        const config = {
          pipelineMode: (document.getElementById('orch-mode') as HTMLSelectElement).value,
          amplifyAfterGoldTraces: parseInt((document.getElementById('orch-amplify-threshold') as HTMLInputElement).value),
          trainAfterExamples: parseInt((document.getElementById('orch-train-threshold') as HTMLInputElement).value),
          cooldownMinutes: parseInt((document.getElementById('orch-cooldown') as HTMLSelectElement).value),
          maxDailyTrainingRuns: parseInt((document.getElementById('orch-max-daily') as HTMLSelectElement).value),
        }
        const res = await fetch('/api/pipeline/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        result.innerHTML = '<span class="step-success">\u2713 Config saved</span>'
      } catch (err) {
        result.innerHTML = `<span class="step-error">${err instanceof Error ? err.message : err}</span>`
      }
      saveBtn.disabled = false
    })

    btnRow.appendChild(startBtn)
    btnRow.appendChild(stopBtn)
    btnRow.appendChild(saveBtn)
    section.appendChild(btnRow)
    section.appendChild(result)
    this.container!.appendChild(section)

    // Load current config
    try {
      const res = await fetch('/api/pipeline/config')
      const config = await res.json()
      if (config.pipelineMode) {
        (document.getElementById('orch-mode') as HTMLSelectElement).value = config.pipelineMode
        const badge = document.getElementById('orch-mode-badge')
        if (badge) badge.textContent = config.pipelineMode.toUpperCase().replace('_', ' ')
      }
      if (config.amplifyAfterGoldTraces)
        (document.getElementById('orch-amplify-threshold') as HTMLInputElement).value = String(config.amplifyAfterGoldTraces)
      if (config.trainAfterExamples)
        (document.getElementById('orch-train-threshold') as HTMLInputElement).value = String(config.trainAfterExamples)
      if (config.cooldownMinutes)
        (document.getElementById('orch-cooldown') as HTMLSelectElement).value = String(config.cooldownMinutes)
      if (config.maxDailyTrainingRuns)
        (document.getElementById('orch-max-daily') as HTMLSelectElement).value = String(config.maxDailyTrainingRuns)
    } catch {
      // config endpoint offline, use defaults
    }
  }

  destroy(): void {
    this.container?.remove()
  }
}
