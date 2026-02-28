export class ModeToggle {
  private container: HTMLElement
  private modeLabel: HTMLElement
  private looksGoodBtn: HTMLElement
  private traceCount: HTMLElement

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div')
    this.container.style.cssText = `
      position:absolute; top:12px; left:50%; transform:translateX(-50%);
      display:flex; gap:12px; align-items:center; z-index:100;
    `

    this.modeLabel = document.createElement('div')
    this.modeLabel.style.cssText = `
      font-family:var(--font-mono); font-size:11px; font-weight:600;
      letter-spacing:0.1em; text-transform:uppercase;
      background:rgba(255,255,255,0.9); backdrop-filter:blur(8px);
      border:1px solid var(--border); border-radius:var(--radius);
      padding:6px 16px; color:var(--text-primary);
    `

    this.looksGoodBtn = document.createElement('button')
    this.looksGoodBtn.textContent = '\u2713 Looks Good'
    this.looksGoodBtn.style.cssText = `
      font-family:var(--font-mono); font-size:11px; font-weight:600;
      letter-spacing:0.05em; text-transform:uppercase;
      background:var(--accent); color:white; border:1px solid var(--accent-dark);
      border-radius:var(--radius); padding:6px 16px; cursor:pointer;
      box-shadow:var(--shadow); transition:all 0.2s ease;
    `
    this.looksGoodBtn.addEventListener('mouseenter', () => {
      this.looksGoodBtn.style.transform = 'translate(1px,1px)'
      this.looksGoodBtn.style.boxShadow = 'none'
    })
    this.looksGoodBtn.addEventListener('mouseleave', () => {
      this.looksGoodBtn.style.transform = ''
      this.looksGoodBtn.style.boxShadow = 'var(--shadow)'
    })

    this.traceCount = document.createElement('div')
    this.traceCount.style.cssText = `
      font-family:var(--font-mono); font-size:10px;
      background:var(--accent-light); border:1px solid var(--border);
      border-radius:12px; padding:4px 10px; color:var(--accent-dark);
    `
    this.traceCount.textContent = '0 traces'

    this.container.appendChild(this.modeLabel)
    this.container.appendChild(this.looksGoodBtn)
    this.container.appendChild(this.traceCount)
    parent.appendChild(this.container)

    this.setMode('build')
  }

  setMode(mode: 'play' | 'build'): void {
    this.modeLabel.textContent = mode === 'build' ? '\u2692 BUILD' : '\u25B6 PLAY'
    this.looksGoodBtn.style.display = mode === 'build' ? '' : 'none'
  }

  setTraceCount(count: number): void {
    this.traceCount.textContent = `${count} trace${count !== 1 ? 's' : ''}`
  }

  onLooksGood(callback: () => void): void {
    this.looksGoodBtn.addEventListener('click', callback)
  }
}
