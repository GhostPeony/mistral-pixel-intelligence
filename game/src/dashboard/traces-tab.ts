interface Trace {
  id?: string
  type: 'success' | 'correction'
  prompt: string
  output?: { entities: any[]; toolCalls: any[]; cognitive?: { thinking?: string; plan?: string; reflection?: string } }
  rejected?: { entities: any[]; toolCalls: any[]; cognitive?: { thinking?: string; plan?: string; reflection?: string } }
  chosen?: { entities: any[]; toolCalls: any[]; cognitive?: { thinking?: string; plan?: string; reflection?: string } }
  feedback?: string
  critiques?: string[]
  attempts?: number
  score?: number
  tier?: string
  scores?: { overall: number; successRate: number; verification: number; cognitiveQuality: number; complexity: number; toolDiversity: number; efficiency: number; length: number }
  cognitive?: { thinking?: string; plan?: string; reflection?: string }
  context: { model: string; sessionId: string; timestamp: string; canvasSize: { width: number; height: number } }
}

export class TracesTab {
  private container: HTMLElement | null = null
  private traces: Trace[] = []
  private filteredTraces: Trace[] = []
  private filterType = 'all'
  private searchQuery = ''

  async render(parent: HTMLElement): Promise<void> {
    this.container = document.createElement('div')
    this.container.className = 'traces-tab'
    parent.appendChild(this.container)

    this.container.innerHTML = '<div class="dash-loading">Loading traces...</div>'

    try {
      const res = await fetch('/api/traces')
      const data = await res.json()
      this.traces = data.traces ?? []
      this.filteredTraces = [...this.traces]
      this.container.innerHTML = ''
      this.renderSummary()
      this.renderFilters()
      this.renderList()
    } catch {
      this.container.innerHTML = '<div class="dash-error">Failed to load traces. Is the server running?</div>'
    }
  }

  private renderSummary(): void {
    const successes = this.traces.filter(t => t.type === 'success').length
    const corrections = this.traces.filter(t => t.type === 'correction').length

    const row = document.createElement('div')
    row.className = 'trace-summary'
    row.innerHTML = `
      <div class="trace-summary-stat">
        <span class="trace-badge trace-badge-success">SFT</span>
        <span class="trace-summary-value">${successes}</span>
        <span class="trace-summary-label">success traces</span>
      </div>
      <div class="trace-summary-stat">
        <span class="trace-badge trace-badge-correction">DPO</span>
        <span class="trace-summary-value">${corrections}</span>
        <span class="trace-summary-label">correction pairs</span>
      </div>
    `
    this.container!.appendChild(row)
  }

  private renderFilters(): void {
    const bar = document.createElement('div')
    bar.className = 'trace-filters'

    const typeSelect = document.createElement('select')
    typeSelect.className = 'editor-input'
    typeSelect.style.width = '140px'
    for (const opt of ['all', 'success', 'correction']) {
      const o = document.createElement('option')
      o.value = opt
      o.textContent = opt.charAt(0).toUpperCase() + opt.slice(1)
      typeSelect.appendChild(o)
    }
    typeSelect.addEventListener('change', () => {
      this.filterType = typeSelect.value
      this.applyFilters()
    })

    const search = document.createElement('input')
    search.type = 'text'
    search.className = 'editor-input'
    search.placeholder = 'Search prompts...'
    search.style.flex = '1'
    search.addEventListener('input', () => {
      this.searchQuery = search.value.toLowerCase()
      this.applyFilters()
    })

    const count = document.createElement('span')
    count.className = 'trace-count'
    count.id = 'trace-count'
    count.textContent = `${this.traces.length} traces`

    bar.appendChild(typeSelect)
    bar.appendChild(search)
    bar.appendChild(count)
    this.container!.appendChild(bar)
  }

  private applyFilters(): void {
    this.filteredTraces = this.traces.filter(t => {
      if (this.filterType !== 'all' && t.type !== this.filterType) return false
      if (this.searchQuery && !t.prompt.toLowerCase().includes(this.searchQuery)) return false
      return true
    })
    const countEl = document.getElementById('trace-count')
    if (countEl) countEl.textContent = `${this.filteredTraces.length} traces`
    this.renderList()
  }

  private renderList(): void {
    const existing = this.container!.querySelector('.trace-list')
    if (existing) existing.remove()

    const list = document.createElement('div')
    list.className = 'trace-list'

    if (this.filteredTraces.length === 0) {
      list.innerHTML = `<div class="dash-empty">${this.traces.length === 0 ? 'No traces yet — start building in the editor.' : 'No matches.'}</div>`
      this.container!.appendChild(list)
      return
    }

    for (const trace of [...this.filteredTraces].reverse()) {
      const item = document.createElement('div')
      item.className = 'trace-item'

      const header = document.createElement('div')
      header.className = 'trace-item-header'

      const typeBadge = trace.type === 'success'
        ? '<span class="trace-badge trace-badge-success">SFT</span>'
        : '<span class="trace-badge trace-badge-correction">DPO</span>'

      const prompt = trace.prompt.length > 80 ? trace.prompt.slice(0, 80) + '...' : trace.prompt
      const time = new Date(trace.context.timestamp).toLocaleString()
      const attempts = trace.type === 'correction' ? ` &middot; ${trace.attempts ?? 1} att` : ''
      const tierBadge = trace.tier ? `<span class="trace-badge trace-badge-${trace.tier}">${trace.tier}</span>` : ''
      const scoreText = trace.score != null ? `${(trace.score * 100).toFixed(0)}%` : ''

      header.innerHTML = `
        <div class="trace-item-left">
          ${typeBadge}
          ${tierBadge}
          <span class="trace-prompt">${this.escapeHtml(prompt)}</span>
        </div>
        <div class="trace-item-right">
          ${scoreText ? `<span class="trace-score">${scoreText}</span>` : ''}
          <span class="trace-time">${time}${attempts}</span>
          <span class="trace-expand">&#9660;</span>
        </div>
      `

      const detail = document.createElement('div')
      detail.className = 'trace-detail'
      detail.style.display = 'none'
      detail.innerHTML = this.renderDetail(trace)

      header.addEventListener('click', () => {
        const isOpen = detail.style.display !== 'none'
        detail.style.display = isOpen ? 'none' : 'block'
        header.querySelector('.trace-expand')!.textContent = isOpen ? '\u25BC' : '\u25B2'
      })

      item.appendChild(header)
      item.appendChild(detail)
      list.appendChild(item)
    }

    this.container!.appendChild(list)
  }

  private renderDetail(trace: Trace): string {
    const sections: string[] = []

    sections.push(`
      <div class="trace-detail-section">
        <div class="trace-detail-label">Prompt</div>
        <div class="trace-detail-text">${this.escapeHtml(trace.prompt)}</div>
      </div>
    `)

    sections.push(`
      <div class="trace-detail-section">
        <div class="trace-detail-label">Context</div>
        <div class="trace-detail-meta">${trace.context.model} &middot; ${trace.context.sessionId.slice(0, 8)}...</div>
      </div>
    `)

    if (trace.type === 'success') {
      const entities = trace.output?.entities ?? []
      const toolCalls = trace.output?.toolCalls ?? []
      sections.push(`
        <div class="trace-detail-section">
          <div class="trace-detail-label">Output</div>
          <div class="trace-detail-meta">${entities.length} entities &middot; ${toolCalls.length} tool calls</div>
          <pre class="trace-code">${this.escapeHtml(JSON.stringify(toolCalls.map(tc => tc.function?.name ?? tc.name ?? 'unknown'), null, 2))}</pre>
        </div>
      `)
    } else {
      const rejected = trace.rejected?.entities ?? []
      const chosen = trace.chosen?.entities ?? []
      sections.push(`
        <div class="trace-detail-section">
          <div class="trace-detail-label">Rejected</div>
          <div class="trace-detail-meta">${rejected.length} entities &middot; ${trace.rejected?.toolCalls?.length ?? 0} calls</div>
        </div>
        <div class="trace-detail-section">
          <div class="trace-detail-label">Chosen</div>
          <div class="trace-detail-meta">${chosen.length} entities &middot; ${trace.chosen?.toolCalls?.length ?? 0} calls</div>
        </div>
      `)

      if (trace.feedback) {
        sections.push(`
          <div class="trace-detail-section">
            <div class="trace-detail-label">Feedback</div>
            <div class="trace-detail-text">${this.escapeHtml(trace.feedback)}</div>
          </div>
        `)
      }

      if (trace.critiques && trace.critiques.length > 0) {
        sections.push(`
          <div class="trace-detail-section">
            <div class="trace-detail-label">Critiques (${trace.critiques.length})</div>
            ${trace.critiques.map(c => `<div class="trace-critique">\u201C${this.escapeHtml(c)}\u201D</div>`).join('')}
          </div>
        `)
      }
    }

    // Cognitive data
    const cog = (trace as any).cognitive ?? trace.output?.cognitive ?? trace.chosen?.cognitive
    if (cog) {
      const parts: string[] = []
      if (cog.thinking) parts.push(`<div class="trace-detail-meta"><strong>Thinking:</strong> ${this.escapeHtml(cog.thinking.slice(0, 200))}</div>`)
      if (cog.plan) parts.push(`<div class="trace-detail-meta"><strong>Plan:</strong> ${this.escapeHtml(cog.plan.slice(0, 200))}</div>`)
      if (cog.reflection) parts.push(`<div class="trace-detail-meta"><strong>Reflection:</strong> ${this.escapeHtml(cog.reflection.slice(0, 200))}</div>`)
      if (parts.length > 0) {
        sections.push(`
          <div class="trace-detail-section">
            <div class="trace-detail-label">Cognitive</div>
            ${parts.join('')}
          </div>
        `)
      }
    }

    return sections.join('')
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  destroy(): void {
    this.container?.remove()
  }
}
