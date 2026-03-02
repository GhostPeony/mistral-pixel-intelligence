import type { LayerDefinition } from '../systems/layer-manager'

export class ModeToggle {
  private container: HTMLElement
  private modeBtn: HTMLButtonElement
  private looksGoodBtn: HTMLElement
  private traceCount: HTMLElement
  private actionBar: HTMLElement
  private layerBar: HTMLElement
  private layerSelect: HTMLSelectElement
  private gameModeBtn: HTMLButtonElement
  private mode: 'play' | 'build' = 'build'

  onModeToggle: (() => void) | null = null
  onAddConsumable: (() => void) | null = null
  onAddDoor: (() => void) | null = null
  onAddLayer: (() => void) | null = null
  onLayerSwitch: ((layerId: string) => void) | null = null
  onGameModeToggle: ((layerId: string, mode: 'platformer' | 'topdown') => void) | null = null

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div')
    this.container.style.cssText = `
      position:absolute; top:12px; left:50%; transform:translateX(-50%);
      display:flex; flex-direction:column; align-items:center; gap:8px; z-index:100;
    `

    const topRow = document.createElement('div')
    topRow.style.cssText = `display:flex; gap:12px; align-items:center;`

    // Clickable Build/Play toggle button
    this.modeBtn = document.createElement('button')
    this.modeBtn.style.cssText = `
      font-family:var(--font-mono); font-size:11px; font-weight:600;
      letter-spacing:0.1em; text-transform:uppercase;
      background:rgba(255,255,255,0.9); backdrop-filter:blur(8px);
      border:2px solid var(--text-primary); border-radius:var(--radius);
      padding:6px 20px; color:var(--text-primary); cursor:pointer;
      box-shadow:2px 2px 0 var(--text-primary); transition:all 0.15s ease;
      min-width:100px;
    `
    this.modeBtn.addEventListener('mouseenter', () => {
      this.modeBtn.style.transform = 'translate(2px,2px)'
      this.modeBtn.style.boxShadow = 'none'
    })
    this.modeBtn.addEventListener('mouseleave', () => {
      this.modeBtn.style.transform = ''
      this.modeBtn.style.boxShadow = '2px 2px 0 var(--text-primary)'
    })
    this.modeBtn.addEventListener('click', () => {
      this.modeBtn.blur()
      this.onModeToggle?.()
    })

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

    topRow.appendChild(this.modeBtn)
    topRow.appendChild(this.looksGoodBtn)
    topRow.appendChild(this.traceCount)

    // Build-mode action bar
    this.actionBar = document.createElement('div')
    this.actionBar.style.cssText = `
      display:flex; gap:8px; align-items:center;
    `

    const btnStyle = `
      font-family:var(--font-mono); font-size:10px; font-weight:600;
      letter-spacing:0.05em; text-transform:uppercase;
      background:rgba(255,255,255,0.9); backdrop-filter:blur(8px);
      border:1px solid var(--border); border-radius:var(--radius);
      padding:5px 12px; cursor:pointer; color:var(--text-primary);
      transition:all 0.15s ease;
    `

    const makeBtn = (label: string, onClick: () => void): HTMLButtonElement => {
      const btn = document.createElement('button')
      btn.textContent = label
      btn.style.cssText = btnStyle
      btn.tabIndex = -1 // Prevent focus stealing from gameplay
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'var(--accent-light)'
        btn.style.borderColor = 'var(--accent)'
      })
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'rgba(255,255,255,0.9)'
        btn.style.borderColor = 'var(--border)'
      })
      btn.addEventListener('click', onClick)
      return btn
    }

    this.actionBar.appendChild(makeBtn('+ Consumable', () => this.onAddConsumable?.()))
    this.actionBar.appendChild(makeBtn('+ Door', () => this.onAddDoor?.()))
    this.actionBar.appendChild(makeBtn('+ Layer', () => {
      this.onAddLayer?.()
      // Refresh dropdown after adding
      setTimeout(() => this.refreshLayers(), 0)
    }))

    // Layer switcher row
    this.layerBar = document.createElement('div')
    this.layerBar.style.cssText = `
      display:flex; gap:8px; align-items:center;
    `

    const layerLabel = document.createElement('span')
    layerLabel.textContent = 'LAYER'
    layerLabel.style.cssText = `
      font-family:var(--font-mono); font-size:9px; font-weight:600;
      letter-spacing:0.1em; text-transform:uppercase;
      color:var(--text-secondary);
    `

    this.layerSelect = document.createElement('select')
    this.layerSelect.tabIndex = -1
    this.layerSelect.style.cssText = `
      font-family:var(--font-mono); font-size:10px; font-weight:600;
      background:rgba(255,255,255,0.9); backdrop-filter:blur(8px);
      border:1px solid var(--border); border-radius:var(--radius);
      padding:4px 8px; color:var(--text-primary); cursor:pointer;
    `
    this.layerSelect.addEventListener('change', () => {
      this.onLayerSwitch?.(this.layerSelect.value)
      this.updateGameModeBtn()
    })

    this.gameModeBtn = document.createElement('button')
    this.gameModeBtn.tabIndex = -1
    this.gameModeBtn.style.cssText = btnStyle
    this.gameModeBtn.addEventListener('click', () => {
      const current = this.gameModeBtn.dataset.mode === 'topdown' ? 'platformer' : 'topdown'
      this.gameModeBtn.dataset.mode = current
      this.onGameModeToggle?.(this.layerSelect.value, current as 'platformer' | 'topdown')
      this.updateGameModeBtn()
    })

    this.layerBar.appendChild(layerLabel)
    this.layerBar.appendChild(this.layerSelect)
    this.layerBar.appendChild(this.gameModeBtn)

    this.container.appendChild(topRow)
    this.container.appendChild(this.actionBar)
    this.container.appendChild(this.layerBar)
    parent.appendChild(this.container)

    this.setMode('build')
  }

  setMode(mode: 'play' | 'build'): void {
    this.mode = mode
    if (mode === 'play') {
      this.modeBtn.textContent = '\u25A0 STOP'
      this.modeBtn.style.background = '#F44336'
      this.modeBtn.style.color = 'white'
      this.modeBtn.style.borderColor = '#C62828'
      this.modeBtn.style.boxShadow = '2px 2px 0 #C62828'
      // Restore correct hover/leave for play mode
      this.modeBtn.onmouseenter = () => {
        this.modeBtn.style.transform = 'translate(2px,2px)'
        this.modeBtn.style.boxShadow = 'none'
      }
      this.modeBtn.onmouseleave = () => {
        this.modeBtn.style.transform = ''
        this.modeBtn.style.boxShadow = '2px 2px 0 #C62828'
      }
    } else {
      this.modeBtn.textContent = '\u25B6 PLAY'
      this.modeBtn.style.background = '#4CAF50'
      this.modeBtn.style.color = 'white'
      this.modeBtn.style.borderColor = '#2E7D32'
      this.modeBtn.style.boxShadow = '2px 2px 0 #2E7D32'
      this.modeBtn.onmouseenter = () => {
        this.modeBtn.style.transform = 'translate(2px,2px)'
        this.modeBtn.style.boxShadow = 'none'
      }
      this.modeBtn.onmouseleave = () => {
        this.modeBtn.style.transform = ''
        this.modeBtn.style.boxShadow = '2px 2px 0 #2E7D32'
      }
    }
    this.looksGoodBtn.style.display = mode === 'build' ? '' : 'none'
    this.traceCount.style.display = mode === 'build' ? '' : 'none'
    this.actionBar.style.display = mode === 'build' ? '' : 'none'
    this.layerBar.style.display = mode === 'build' ? '' : 'none'
  }

  /** Refresh the layer dropdown from the layer manager's current state */
  refreshLayers(layers?: LayerDefinition[], currentLayerId?: string): void {
    if (layers) {
      this.layerSelect.innerHTML = ''
      for (const layer of layers) {
        const opt = document.createElement('option')
        opt.value = layer.id
        opt.textContent = `${layer.name} (${layer.id})`
        if (layer.id === currentLayerId) opt.selected = true
        this.layerSelect.appendChild(opt)
      }
    }
    this.updateGameModeBtn()
  }

  private updateGameModeBtn(): void {
    const mode = this.gameModeBtn.dataset.mode || 'platformer'
    if (mode === 'topdown') {
      this.gameModeBtn.textContent = '\u2195 TOP-DOWN'
      this.gameModeBtn.style.background = '#E1F5FE'
      this.gameModeBtn.style.borderColor = '#0288D1'
      this.gameModeBtn.style.color = '#01579B'
    } else {
      this.gameModeBtn.textContent = '\u2194 SIDE-SCROLL'
      this.gameModeBtn.style.background = 'rgba(255,255,255,0.9)'
      this.gameModeBtn.style.borderColor = 'var(--border)'
      this.gameModeBtn.style.color = 'var(--text-primary)'
    }
  }

  /** Update the game mode button to reflect a layer's current mode */
  setCurrentGameMode(mode: 'platformer' | 'topdown'): void {
    this.gameModeBtn.dataset.mode = mode
    this.updateGameModeBtn()
  }

  setTraceCount(count: number): void {
    this.traceCount.textContent = `${count} trace${count !== 1 ? 's' : ''}`
  }

  onLooksGood(callback: () => void): void {
    this.looksGoodBtn.addEventListener('click', callback)
  }
}
