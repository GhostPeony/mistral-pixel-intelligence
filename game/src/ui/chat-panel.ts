export class ChatPanel {
  onSend: ((text: string) => void) | null = null

  private container: HTMLElement
  private messageList: HTMLElement
  private inputArea: HTMLTextAreaElement
  private sendBtn: HTMLElement

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div')
    this.container.className = 'chat-panel'

    // Header
    const header = document.createElement('h3')
    header.className = 'panel-header'
    header.textContent = 'Chat'
    this.container.appendChild(header)

    // Message list
    this.messageList = document.createElement('div')
    this.messageList.className = 'chat-messages'
    this.container.appendChild(this.messageList)

    // Input row
    const inputRow = document.createElement('div')
    inputRow.className = 'chat-input-row'

    this.inputArea = document.createElement('textarea')
    this.inputArea.className = 'chat-input'
    this.inputArea.placeholder = 'Tell Mistral what to build...'
    this.inputArea.rows = 2
    this.inputArea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        this.send()
      }
    })

    const btnRow = document.createElement('div')
    btnRow.className = 'chat-btn-row'

    // Mic button placeholder
    const micBtn = document.createElement('button')
    micBtn.className = 'editor-btn editor-btn-icon-only'
    micBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1a2 2 0 0 0-2 2v4a2 2 0 1 0 4 0V3a2 2 0 0 0-2-2z" fill="currentColor"/><path d="M4 6.5a.5.5 0 0 0-1 0V7a5 5 0 0 0 4.5 4.975V14H6a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1H8.5v-2.025A5 5 0 0 0 13 7v-.5a.5.5 0 0 0-1 0V7a4 4 0 1 1-8 0v-.5z" fill="currentColor"/></svg>'
    micBtn.title = 'Voice input (coming soon)'

    this.sendBtn = document.createElement('button')
    this.sendBtn.className = 'editor-btn editor-btn-primary'
    this.sendBtn.textContent = 'Send'
    this.sendBtn.addEventListener('click', () => this.send())

    btnRow.appendChild(micBtn)
    btnRow.appendChild(this.sendBtn)

    inputRow.appendChild(this.inputArea)
    inputRow.appendChild(btnRow)
    this.container.appendChild(inputRow)

    parent.appendChild(this.container)
  }

  addMessage(role: 'user' | 'assistant', content: string): void {
    const msg = document.createElement('div')
    msg.className = `chat-msg chat-msg-${role}`

    const bubble = document.createElement('div')
    bubble.className = `chat-bubble chat-bubble-${role}`
    bubble.textContent = content

    msg.appendChild(bubble)
    this.messageList.appendChild(msg)
    this.messageList.scrollTop = this.messageList.scrollHeight
  }

  private send(): void {
    const text = this.inputArea.value.trim()
    if (!text) return
    this.addMessage('user', text)
    this.inputArea.value = ''
    this.onSend?.(text)
  }
}
