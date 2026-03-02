interface PipelineStatus {
  traces: number
  tiers: { gold: number; silver: number; bronze: number; failed: number }
  dataDesigner: { available: boolean; method: string }
}

interface Trace {
  type: 'success' | 'correction'
  prompt: string
  attempts?: number
  critiques?: string[]
  cognitive?: { thinking?: string; plan?: string; reflection?: string }
  context: { timestamp: string; model: string }
}

export class StatsTab {
  private container: HTMLElement | null = null

  async render(parent: HTMLElement): Promise<void> {
    this.container = document.createElement('div')
    this.container.className = 'stats-tab'
    parent.appendChild(this.container)

    this.container.innerHTML = '<div class="dash-loading">Loading stats...</div>'

    try {
      const [statusRes, tracesRes] = await Promise.all([
        fetch('/api/pipeline/status'),
        fetch('/api/traces'),
      ])
      const status: PipelineStatus = await statusRes.json()
      const { traces }: { traces: Trace[] } = await tracesRes.json()

      this.container.innerHTML = ''
      this.renderCards(status, traces)
      this.renderTierBar(status.tiers)
      this.renderScoring()
      this.renderPipeline()
      this.renderWeaveActions()
      this.renderRecentActivity(traces)
    } catch {
      this.container.innerHTML = '<div class="dash-error">Failed to load stats. Is the server running on :3001?</div>'
    }
  }

  private renderCards(status: PipelineStatus, traces: Trace[]): void {
    const total = status.traces
    const successes = traces.filter(t => t.type === 'success').length
    const corrections = traces.filter(t => t.type === 'correction').length
    const successRate = total > 0 ? Math.round((successes / total) * 100) : 0
    const avgAttempts = corrections > 0
      ? (traces.filter(t => t.type === 'correction').reduce((s, t) => s + ((t as any).attempts ?? 1), 0) / corrections).toFixed(1)
      : '\u2014'
    const withCognitive = traces.filter(t => (t as any).cognitive?.thinking).length
    const cogRate = total > 0 ? Math.round((withCognitive / total) * 100) : 0

    const cards = document.createElement('div')
    cards.className = 'stat-cards'

    cards.innerHTML = `
      ${this.card('Traces', String(total), 'total captured')}
      ${this.card('Success', `${successRate}%`, `${successes} first-try`)}
      ${this.card('Corrections', String(corrections), `avg ${avgAttempts} attempts`)}
      ${this.card('Gold', String(status.tiers.gold), '\u2265 0.75 score')}
      ${this.card('Cognitive', `${cogRate}%`, `${withCognitive} with reasoning`)}
      ${this.card('Amplify', status.dataDesigner.available ? 'Ready' : 'Offline', status.dataDesigner.method === 'nvidia_nim' ? 'NVIDIA NIM' : 'not configured')}
    `
    this.container!.appendChild(cards)
  }

  private card(title: string, value: string, subtitle: string): string {
    return `
      <div class="stat-card">
        <div class="stat-card-title">${title}</div>
        <div class="stat-card-value">${value}</div>
        <div class="stat-card-sub">${subtitle}</div>
      </div>
    `
  }

  private renderTierBar(tiers: PipelineStatus['tiers']): void {
    const total = tiers.gold + tiers.silver + tiers.bronze + tiers.failed
    if (total === 0) return

    const section = document.createElement('div')
    section.className = 'stats-section'
    section.innerHTML = `<h3 class="stats-section-title">Quality Distribution</h3>`

    const bar = document.createElement('div')
    bar.className = 'tier-bar'

    const segments: [string, number, string][] = [
      ['gold', tiers.gold, '#D4A017'],
      ['silver', tiers.silver, '#A0A0A0'],
      ['bronze', tiers.bronze, '#CD7F32'],
      ['failed', tiers.failed, '#C53030'],
    ]

    for (const [label, count, color] of segments) {
      if (count === 0) continue
      const pct = (count / total) * 100
      const seg = document.createElement('div')
      seg.className = 'tier-segment'
      seg.style.width = `${pct}%`
      seg.style.background = color
      seg.title = `${label}: ${count} (${Math.round(pct)}%)`
      seg.textContent = count > 0 ? `${label} ${count}` : ''
      bar.appendChild(seg)
    }

    const legend = document.createElement('div')
    legend.className = 'tier-legend'
    for (const [label, count, color] of segments) {
      legend.innerHTML += `<span class="tier-legend-item"><span class="tier-dot" style="background:${color}"></span>${label}: ${count}</span>`
    }

    section.appendChild(bar)
    section.appendChild(legend)
    this.container!.appendChild(section)
  }

  private renderScoring(): void {
    const section = document.createElement('div')
    section.className = 'stats-section'
    section.innerHTML = `
      <h3 class="stats-section-title">Scoring Weights</h3>
      <div class="dimension-bars">
        ${this.dim('Success Rate', 25)}
        ${this.dim('Verification', 20)}
        ${this.dim('Cognitive', 15, true)}
        ${this.dim('Complexity', 15)}
        ${this.dim('Tool Diversity', 10)}
        ${this.dim('Efficiency', 10)}
        ${this.dim('Length', 5)}
      </div>
    `
    this.container!.appendChild(section)
  }

  private dim(label: string, weight: number, cognitive = false): string {
    return `
      <div class="dimension-row">
        <span class="dimension-label">${label}</span>
        <div class="dimension-track"><div class="dimension-fill${cognitive ? ' dimension-fill-cognitive' : ''}" style="width:${weight * 4}%"></div></div>
        <span class="dimension-value">${weight}%</span>
      </div>
    `
  }

  private renderPipeline(): void {
    const section = document.createElement('div')
    section.className = 'stats-section'
    section.innerHTML = `
      <h3 class="stats-section-title">Pipeline</h3>
      <div class="pipeline-flow">
        ${this.flowStep('1', 'Play', 'Player prompts AI')}
        <div class="flow-arrow">\u2192</div>
        ${this.flowStep('2', 'Capture', 'Record traces + cognitive data')}
        <div class="flow-arrow">\u2192</div>
        ${this.flowStep('3', 'Score', '7-dimension quality filter')}
        <div class="flow-arrow">\u2192</div>
        ${this.flowStep('4', 'Amplify', 'NVIDIA NIM 5x expansion')}
        <div class="flow-arrow">\u2192</div>
        ${this.flowStep('5', 'Train', 'Unsloth QLoRA on HuggingFace')}
      </div>
    `
    this.container!.appendChild(section)
  }

  private flowStep(num: string, title: string, desc: string): string {
    return `
      <div class="flow-step">
        <div class="flow-icon">${num}</div>
        <div class="flow-content">
          <strong>${title}</strong>
          <span>${desc}</span>
        </div>
      </div>
    `
  }

  private renderRecentActivity(traces: Trace[]): void {
    if (traces.length === 0) return

    const section = document.createElement('div')
    section.className = 'stats-section'
    section.innerHTML = `<h3 class="stats-section-title">Recent</h3>`

    const recent = traces.slice(-8).reverse()
    const list = document.createElement('div')
    list.className = 'recent-list'

    for (const trace of recent) {
      const item = document.createElement('div')
      item.className = 'recent-item'
      const typeBadge = trace.type === 'success'
        ? '<span class="trace-badge trace-badge-success">SFT</span>'
        : '<span class="trace-badge trace-badge-correction">DPO</span>'
      const prompt = trace.prompt.length > 50 ? trace.prompt.slice(0, 50) + '...' : trace.prompt
      const time = new Date(trace.context.timestamp).toLocaleTimeString()
      item.innerHTML = `${typeBadge}<span class="recent-prompt">${prompt}</span><span class="recent-time">${time}</span>`
      list.appendChild(item)
    }

    section.appendChild(list)
    this.container!.appendChild(section)
  }

  private renderWeaveActions(): void {
    const section = document.createElement('div')
    section.className = 'stats-section'
    section.innerHTML = `<h3 class="stats-section-title">W&B Weave</h3>`

    const row = document.createElement('div')
    row.style.display = 'flex'
    row.style.gap = '12px'
    row.style.alignItems = 'center'

    const btn = document.createElement('button')
    btn.className = 'editor-btn editor-btn-secondary'
    btn.textContent = 'Run Evaluation'

    const status = document.createElement('span')
    status.className = 'trace-count'

    btn.addEventListener('click', async () => {
      btn.disabled = true
      btn.textContent = 'Evaluating...'
      try {
        const res = await fetch('http://localhost:3002/eval', { method: 'POST' })
        const data = await res.json()
        if (data.status === 'completed') {
          status.textContent = `\u2713 ${data.trace_count} traces evaluated`
        } else {
          status.textContent = data.message || 'No traces'
        }
        btn.textContent = 'Re-run'
      } catch {
        status.textContent = 'Sidecar offline'
        btn.textContent = 'Run Evaluation'
      }
      btn.disabled = false
    })

    row.appendChild(btn)
    row.appendChild(status)
    section.appendChild(row)
    this.container!.appendChild(section)
  }

  destroy(): void {
    this.container?.remove()
  }
}
