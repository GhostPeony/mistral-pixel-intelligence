export class ChatPanel {
  onSend: ((text: string) => void) | null = null
  onMicPress: (() => void) | null = null
  onMicStop: (() => void) | null = null

  private el: HTMLElement
  private body: HTMLElement
  private messageList: HTMLElement
  private inputArea: HTMLTextAreaElement
  private micBtn: HTMLButtonElement
  private tab: HTMLElement
  private _isOpen = true
  private _isRecording = false

  constructor(parent: HTMLElement) {
    // Wrapper positioned inside canvas-container
    this.el = document.createElement('div')
    this.el.className = 'chat-overlay'

    // Collapsible body
    this.body = document.createElement('div')
    this.body.className = 'chat-overlay-body'

    // Message list with upward fade
    this.messageList = document.createElement('div')
    this.messageList.className = 'chat-overlay-messages'
    this.body.appendChild(this.messageList)

    // Input row
    const inputRow = document.createElement('div')
    inputRow.className = 'chat-overlay-input-row'

    this.inputArea = document.createElement('textarea')
    this.inputArea.className = 'chat-overlay-input'
    this.inputArea.placeholder = 'Tell Mistral what to build...'
    this.inputArea.rows = 1
    this.inputArea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        this.send()
      }
      // Stop propagation so game shortcuts don't fire while typing
      e.stopPropagation()
    })

    this.micBtn = document.createElement('button')
    this.micBtn.className = 'chat-overlay-btn chat-overlay-mic'
    this.micBtn.innerHTML = this.micIdleHTML()
    this.micBtn.title = 'Voice input'
    this.micBtn.addEventListener('click', () => {
      if (this._isRecording) {
        this.onMicStop?.()
      } else {
        this.onMicPress?.()
      }
    })

    const sendBtn = document.createElement('button')
    sendBtn.className = 'chat-overlay-btn chat-overlay-send'
    sendBtn.textContent = 'Send'
    sendBtn.addEventListener('click', () => this.send())

    inputRow.appendChild(this.inputArea)
    inputRow.appendChild(this.micBtn)
    inputRow.appendChild(sendBtn)
    this.body.appendChild(inputRow)

    this.el.appendChild(this.body)

    // Toggle tab (always visible)
    this.tab = document.createElement('button')
    this.tab.className = 'chat-overlay-tab'
    this.tab.innerHTML = '<span class="chat-overlay-tab-icon">&#9662;</span> Chat'
    this.tab.title = 'Toggle chat (T)'
    this.tab.addEventListener('click', () => this.toggle())
    this.el.appendChild(this.tab)

    parent.appendChild(this.el)
  }

  // --- Public API ---

  get isOpen(): boolean {
    return this._isOpen
  }

  toggle(): void {
    if (this._isOpen) this.hide()
    else this.show()
  }

  show(): void {
    this._isOpen = true
    this.body.classList.remove('collapsed')
    this.tab.innerHTML = '<span class="chat-overlay-tab-icon">&#9662;</span> Chat'
  }

  hide(): void {
    this._isOpen = false
    this.body.classList.add('collapsed')
    this.tab.innerHTML = '<span class="chat-overlay-tab-icon">&#9652;</span> Chat'
  }

  addMessage(role: 'user' | 'assistant', content: string, modelInfo?: { modelId: string; modelType?: 'teacher' | 'student' }): void {
    const msg = document.createElement('div')
    msg.className = `chat-overlay-msg chat-overlay-msg-${role}`

    if (role === 'assistant') {
      if (modelInfo) {
        const badge = document.createElement('span')
        badge.className = `chat-model-badge chat-model-badge-${modelInfo.modelType ?? 'teacher'}`
        badge.textContent = modelInfo.modelType === 'student' ? 'Student' : 'Teacher'
        badge.title = modelInfo.modelId
        msg.appendChild(badge)
      }

      const rendered = document.createElement('div')
      rendered.className = 'chat-md'
      rendered.innerHTML = this.renderMarkdown(content)
      msg.appendChild(rendered)
    } else {
      msg.textContent = content
    }

    this.messageList.appendChild(msg)
    this.messageList.scrollTop = this.messageList.scrollHeight
  }

  setMicRecording(active: boolean): void {
    this._isRecording = active
    if (active) {
      this.micBtn.classList.add('recording')
      this.micBtn.innerHTML = this.micRecordingHTML()
      this.micBtn.title = 'Stop recording'
    } else {
      this.micBtn.classList.remove('recording')
      this.micBtn.innerHTML = this.micIdleHTML()
      this.micBtn.title = 'Voice input'
    }
  }

  // --- Private ---

  private micIdleHTML(): string {
    return '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1a2 2 0 0 0-2 2v4a2 2 0 1 0 4 0V3a2 2 0 0 0-2-2z" fill="currentColor"/><path d="M4 6.5a.5.5 0 0 0-1 0V7a5 5 0 0 0 4.5 4.975V14H6a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1H8.5v-2.025A5 5 0 0 0 13 7v-.5a.5.5 0 0 0-1 0V7a4 4 0 1 1-8 0v-.5z" fill="currentColor"/></svg>'
  }

  private micRecordingHTML(): string {
    return '<span class="mic-rec-dot"></span><svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" fill="currentColor"/></svg> Stop'
  }

  private send(): void {
    const text = this.inputArea.value.trim()
    if (!text) return
    this.addMessage('user', text)
    this.inputArea.value = ''
    this.onSend?.(text)
  }

  /** Lightweight markdown-to-HTML for agent responses. */
  private renderMarkdown(src: string): string {
    // Guard: ensure src is a string (API may return null, array, or object)
    const text = typeof src === 'string' ? src : String(src ?? '')
    // Escape HTML
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    // Fenced code blocks (```lang\n...\n```)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang, code) =>
      `<pre class="chat-md-code-block"><code>${code.trimEnd()}</code></pre>`)

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="chat-md-code">$1</code>')

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

    // Italic
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')

    // Split into blocks for paragraph-level formatting
    const blocks = html.split(/\n\n+/)
    const out: string[] = []

    for (const block of blocks) {
      const trimmed = block.trim()
      if (!trimmed) continue

      // Already a pre block — pass through
      if (trimmed.startsWith('<pre')) {
        out.push(trimmed)
        continue
      }

      // Heading (### / ## / #)
      const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)/)
      if (headingMatch) {
        const level = headingMatch[1].length
        out.push(`<div class="chat-md-h${level}">${headingMatch[2]}</div>`)
        continue
      }

      // List block (lines starting with - or * or 1.)
      const lines = trimmed.split('\n')
      if (lines.every(l => /^\s*[-*]\s/.test(l) || l.trim() === '')) {
        const items = lines
          .filter(l => l.trim())
          .map(l => `<li>${l.replace(/^\s*[-*]\s+/, '')}</li>`)
          .join('')
        out.push(`<ul class="chat-md-list">${items}</ul>`)
        continue
      }
      if (lines.every(l => /^\s*\d+[.)]\s/.test(l) || l.trim() === '')) {
        const items = lines
          .filter(l => l.trim())
          .map(l => `<li>${l.replace(/^\s*\d+[.)]\s+/, '')}</li>`)
          .join('')
        out.push(`<ol class="chat-md-list">${items}</ol>`)
        continue
      }

      // Regular paragraph — convert single newlines to <br>
      out.push(`<p>${trimmed.replace(/\n/g, '<br>')}</p>`)
    }

    return out.join('')
  }
}
