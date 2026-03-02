import { LootTableManager, LootEntry, ENEMY_ASSET_IDS } from '../data/loot-tables'
import type { Renderer } from '../engine/renderer'

const CONSUMABLE_ASSETS = [
  'item_potion_red', 'item_potion_blue', 'item_potion_green', 'item_potion_purple',
  'item_potion_yellow', 'item_potion_white', 'item_heart', 'item_gem_red',
  'item_gem_blue', 'item_gem_green', 'item_gem_purple', 'item_gem_white',
  'item_coin', 'item_coin_gold', 'item_coin_silver', 'item_coin_bronze',
  'item_bone', 'item_skull', 'item_fang', 'item_feather', 'item_cloth', 'item_circuit',
]

const PICKUP_ASSETS = [
  'item_sword', 'weapon_sword_fire', 'weapon_dagger', 'weapon_axe',
  'weapon_hammer', 'item_bow', 'weapon_crossbow', 'weapon_staff',
  'item_shield', 'weapon_shield_fire', 'weapon_shield_tech',
  'weapon_shield_wood', 'weapon_shield_iron', 'weapon_ring',
  'item_boots', 'item_amulet', 'item_cloak',
]

export class BestiaryPanel {
  private lootManager: LootTableManager
  private renderer: Renderer
  private backdrop: HTMLElement | null = null
  private selectedEnemy: string | null = null

  constructor(lootManager: LootTableManager, renderer: Renderer) {
    this.lootManager = lootManager
    this.renderer = renderer
  }

  get isOpen(): boolean {
    return this.backdrop !== null
  }

  toggle(): void {
    if (this.backdrop) this.close()
    else this.open()
  }

  open(): void {
    this.close()
    this.selectedEnemy = null

    // Backdrop
    this.backdrop = document.createElement('div')
    this.backdrop.className = 'bestiary-backdrop'
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) this.close()
    })

    // Modal container
    const modal = document.createElement('div')
    modal.className = 'bestiary-modal-container'

    // Header
    const header = document.createElement('div')
    header.className = 'bestiary-header'

    const title = document.createElement('h2')
    title.className = 'bestiary-title'
    title.textContent = 'Bestiary'

    const closeBtn = document.createElement('button')
    closeBtn.className = 'bestiary-close-btn'
    closeBtn.textContent = '\u00d7'
    closeBtn.addEventListener('click', () => this.close())

    header.appendChild(title)
    header.appendChild(closeBtn)
    modal.appendChild(header)

    // Content area (scrollable)
    const content = document.createElement('div')
    content.className = 'bestiary-content'
    content.id = 'bestiary-content'
    modal.appendChild(content)

    this.backdrop.appendChild(modal)
    document.body.appendChild(this.backdrop)

    this.renderContent()

    // Escape to close
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close()
        window.removeEventListener('keydown', escHandler)
      }
    }
    window.addEventListener('keydown', escHandler)
  }

  close(): void {
    if (this.backdrop) {
      this.backdrop.remove()
      this.backdrop = null
      this.selectedEnemy = null
    }
  }

  private renderContent(): void {
    const content = this.backdrop?.querySelector('#bestiary-content') as HTMLElement | null
    if (!content) return
    content.innerHTML = ''

    // Sprite grid
    const grid = document.createElement('div')
    grid.className = 'bestiary-grid'

    for (const enemyId of ENEMY_ASSET_IDS) {
      const cell = document.createElement('div')
      cell.className = 'bestiary-cell' + (this.selectedEnemy === enemyId ? ' bestiary-cell-selected' : '')

      // Sprite thumbnail
      const thumb = document.createElement('canvas')
      thumb.width = 32
      thumb.height = 32
      const spriteCanvas = this.renderer.getSpriteCanvas(enemyId)
      if (spriteCanvas) {
        const ctx = thumb.getContext('2d')!
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(spriteCanvas, 0, 0, 32, 32)
      }
      cell.appendChild(thumb)

      // Customized dot
      if (this.lootManager.hasCustomTable(enemyId)) {
        const dot = document.createElement('span')
        dot.className = 'bestiary-cell-dot'
        dot.title = 'Customized'
        cell.appendChild(dot)
      }

      cell.addEventListener('click', () => {
        this.selectedEnemy = this.selectedEnemy === enemyId ? null : enemyId
        this.renderContent()
      })

      grid.appendChild(cell)
    }

    content.appendChild(grid)

    // Detail panel below grid
    if (this.selectedEnemy) {
      const table = this.lootManager.getTable(this.selectedEnemy)
      if (table) {
        const detail = document.createElement('div')
        detail.className = 'bestiary-detail'

        const name = document.createElement('div')
        name.className = 'bestiary-detail-name'
        name.textContent = this.formatEnemyName(this.selectedEnemy)
        detail.appendChild(name)

        const editor = this.createDropTableEditor(this.selectedEnemy, table)
        detail.appendChild(editor)

        content.appendChild(detail)
      }
    } else {
      const hint = document.createElement('div')
      hint.className = 'bestiary-detail-hint'
      hint.textContent = 'Select a creature'
      content.appendChild(hint)
    }
  }

  private createDropTableEditor(
    enemyId: string,
    table: { dropChance: number; entries: LootEntry[] },
  ): HTMLElement {
    const editor = document.createElement('div')
    editor.className = 'bestiary-editor'

    let draftDropChance = table.dropChance
    let draftEntries = table.entries.map(e => ({ ...e }))

    // --- Drop Chance ---
    const chanceRow = document.createElement('div')
    chanceRow.className = 'bestiary-editor-section'

    const chanceLabel = document.createElement('label')
    chanceLabel.className = 'bestiary-editor-label'
    chanceLabel.textContent = `Drop Chance: ${Math.round(draftDropChance * 100)}%`
    chanceRow.appendChild(chanceLabel)

    const chanceSlider = document.createElement('input')
    chanceSlider.type = 'range'
    chanceSlider.min = '0'
    chanceSlider.max = '100'
    chanceSlider.value = String(Math.round(draftDropChance * 100))
    chanceSlider.className = 'bestiary-slider'
    chanceSlider.addEventListener('input', () => {
      draftDropChance = parseInt(chanceSlider.value) / 100
      chanceLabel.textContent = `Drop Chance: ${chanceSlider.value}%`
    })
    chanceRow.appendChild(chanceSlider)
    editor.appendChild(chanceRow)

    // --- Loot Table ---
    const lootSection = document.createElement('div')
    lootSection.className = 'bestiary-editor-section'

    const lootLabel = document.createElement('label')
    lootLabel.className = 'bestiary-editor-label'
    lootLabel.textContent = 'Loot Table'
    lootSection.appendChild(lootLabel)

    const lootList = document.createElement('div')
    lootList.className = 'bestiary-loot-list'

    const renderLootList = () => {
      lootList.innerHTML = ''
      if (draftEntries.length === 0) {
        const empty = document.createElement('div')
        empty.className = 'bestiary-loot-empty'
        empty.textContent = 'No loot entries'
        lootList.appendChild(empty)
      } else {
        const totalWeight = draftEntries.reduce((sum, e) => sum + e.weight, 0)
        for (let i = 0; i < draftEntries.length; i++) {
          const entry = draftEntries[i]
          const row = this.createLootRow(entry, totalWeight, () => {
            draftEntries.splice(i, 1)
            renderLootList()
          }, (updated) => {
            draftEntries[i] = updated
            renderLootList()
          })
          lootList.appendChild(row)
        }
      }
    }
    renderLootList()
    lootSection.appendChild(lootList)

    // Add Loot button
    const addBtn = document.createElement('button')
    addBtn.className = 'bestiary-add-btn'
    addBtn.textContent = '+ Add Loot'
    addBtn.addEventListener('click', () => {
      this.showAddLootForm(lootSection, (entry) => {
        draftEntries.push(entry)
        renderLootList()
      })
    })
    lootSection.appendChild(addBtn)

    editor.appendChild(lootSection)

    // --- Actions ---
    const actions = document.createElement('div')
    actions.className = 'bestiary-editor-actions'

    const resetBtn = document.createElement('button')
    resetBtn.className = 'bestiary-action-btn bestiary-action-reset'
    resetBtn.textContent = 'Reset'
    resetBtn.addEventListener('click', () => {
      this.lootManager.resetToDefault(enemyId)
      this.renderContent()
    })

    const saveBtn = document.createElement('button')
    saveBtn.className = 'bestiary-action-btn bestiary-action-save'
    saveBtn.textContent = 'Save'
    saveBtn.addEventListener('click', () => {
      this.lootManager.setCustomTable({
        enemyAssetId: enemyId,
        dropChance: draftDropChance,
        entries: draftEntries,
      })
      this.renderContent()
    })

    actions.appendChild(resetBtn)
    actions.appendChild(saveBtn)
    editor.appendChild(actions)

    return editor
  }

  private createLootRow(
    entry: LootEntry,
    totalWeight: number,
    onDelete: () => void,
    onUpdate: (e: LootEntry) => void,
  ): HTMLElement {
    const row = document.createElement('div')
    row.className = 'bestiary-loot-row'

    // Thumbnail
    const thumb = document.createElement('canvas')
    thumb.width = 24
    thumb.height = 24
    thumb.className = 'bestiary-loot-thumb'
    const spriteCanvas = this.renderer.getSpriteCanvas(entry.assetId)
    if (spriteCanvas) {
      const ctx = thumb.getContext('2d')!
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(spriteCanvas, 0, 0, 24, 24)
    }
    row.appendChild(thumb)

    // Name
    const name = document.createElement('span')
    name.className = 'bestiary-loot-name'
    name.textContent = entry.name
    row.appendChild(name)

    // Percentage display
    const pct = document.createElement('span')
    pct.className = 'bestiary-loot-pct'
    pct.textContent = totalWeight > 0 ? `${Math.round((entry.weight / totalWeight) * 100)}%` : '0%'
    row.appendChild(pct)

    // Weight input
    const weightInput = document.createElement('input')
    weightInput.type = 'number'
    weightInput.min = '1'
    weightInput.max = '100'
    weightInput.value = String(entry.weight)
    weightInput.className = 'bestiary-loot-weight'
    weightInput.title = 'Drop weight'
    weightInput.addEventListener('change', () => {
      const val = parseInt(weightInput.value)
      if (!isNaN(val) && val >= 1 && val <= 100) {
        onUpdate({ ...entry, weight: val })
      }
    })
    row.appendChild(weightInput)

    // Delete
    const deleteBtn = document.createElement('button')
    deleteBtn.className = 'bestiary-loot-delete'
    deleteBtn.textContent = '\u00d7'
    deleteBtn.addEventListener('click', onDelete)
    row.appendChild(deleteBtn)

    return row
  }

  private showAddLootForm(container: HTMLElement, onAdd: (entry: LootEntry) => void): void {
    const existing = container.querySelector('.bestiary-add-form')
    if (existing) { existing.remove(); return }

    const form = document.createElement('div')
    form.className = 'bestiary-add-form'

    let selectedType: 'consumable' | 'pickup' = 'consumable'
    let selectedAssetId = CONSUMABLE_ASSETS[0]
    let selectedEffect: 'heal' | 'speed' | 'ammo' | 'score' = 'heal'
    let selectedKind: 'melee' | 'ranged' | 'shield' | 'passive' = 'melee'
    let effectValue = 1
    let damage = 1
    let weight = 20
    let itemName = 'New Item'

    // Type toggle
    const typeRow = document.createElement('div')
    typeRow.className = 'bestiary-type-toggle'

    const consumableBtn = document.createElement('button')
    consumableBtn.className = 'bestiary-type-btn active'
    consumableBtn.textContent = 'Consumable'

    const pickupBtn = document.createElement('button')
    pickupBtn.className = 'bestiary-type-btn'
    pickupBtn.textContent = 'Pickup'

    const updateTypeFields = () => {
      effectGroup.style.display = selectedType === 'consumable' ? 'flex' : 'none'
      kindGroup.style.display = selectedType === 'pickup' ? 'flex' : 'none'
      assetSelect.innerHTML = ''
      const assets = selectedType === 'consumable' ? CONSUMABLE_ASSETS : PICKUP_ASSETS
      for (const id of assets) {
        const opt = document.createElement('option')
        opt.value = id
        opt.textContent = id.replace('item_', '').replace('weapon_', '').replace(/_/g, ' ')
        assetSelect.appendChild(opt)
      }
      selectedAssetId = assets[0]
    }

    consumableBtn.addEventListener('click', () => {
      selectedType = 'consumable'
      consumableBtn.classList.add('active')
      pickupBtn.classList.remove('active')
      updateTypeFields()
    })

    pickupBtn.addEventListener('click', () => {
      selectedType = 'pickup'
      pickupBtn.classList.add('active')
      consumableBtn.classList.remove('active')
      updateTypeFields()
    })

    typeRow.append(consumableBtn, pickupBtn)
    form.appendChild(typeRow)

    // Asset select
    const assetRow = document.createElement('div')
    assetRow.className = 'bestiary-form-row'
    const assetSelect = document.createElement('select')
    assetSelect.className = 'bestiary-form-input'
    for (const id of CONSUMABLE_ASSETS) {
      const opt = document.createElement('option')
      opt.value = id
      opt.textContent = id.replace('item_', '').replace(/_/g, ' ')
      assetSelect.appendChild(opt)
    }
    assetSelect.addEventListener('change', () => { selectedAssetId = assetSelect.value })
    assetRow.appendChild(assetSelect)
    form.appendChild(assetRow)

    // Name + Weight
    const nameRow = document.createElement('div')
    nameRow.className = 'bestiary-form-row'

    const nameInput = document.createElement('input')
    nameInput.type = 'text'
    nameInput.className = 'bestiary-form-input'
    nameInput.placeholder = 'Name'
    nameInput.value = itemName
    nameInput.addEventListener('input', () => { itemName = nameInput.value })

    const weightInput = document.createElement('input')
    weightInput.type = 'number'
    weightInput.min = '1'
    weightInput.max = '100'
    weightInput.className = 'bestiary-form-input bestiary-form-input-small'
    weightInput.placeholder = 'Wt'
    weightInput.value = String(weight)
    weightInput.addEventListener('change', () => { weight = parseInt(weightInput.value) || 20 })

    nameRow.append(nameInput, weightInput)
    form.appendChild(nameRow)

    // Effect row (consumable)
    const effectGroup = document.createElement('div')
    effectGroup.className = 'bestiary-form-row'

    const effectSelect = document.createElement('select')
    effectSelect.className = 'bestiary-form-input'
    for (const eff of ['heal', 'speed', 'ammo', 'score'] as const) {
      const opt = document.createElement('option')
      opt.value = eff
      opt.textContent = eff.charAt(0).toUpperCase() + eff.slice(1)
      effectSelect.appendChild(opt)
    }
    effectSelect.addEventListener('change', () => { selectedEffect = effectSelect.value as typeof selectedEffect })

    const effectValueInput = document.createElement('input')
    effectValueInput.type = 'number'
    effectValueInput.min = '1'
    effectValueInput.className = 'bestiary-form-input bestiary-form-input-small'
    effectValueInput.value = String(effectValue)
    effectValueInput.placeholder = 'Val'
    effectValueInput.addEventListener('change', () => { effectValue = parseInt(effectValueInput.value) || 1 })

    effectGroup.append(effectSelect, effectValueInput)
    form.appendChild(effectGroup)

    // Kind row (pickup)
    const kindGroup = document.createElement('div')
    kindGroup.className = 'bestiary-form-row'
    kindGroup.style.display = 'none'

    const kindSelect = document.createElement('select')
    kindSelect.className = 'bestiary-form-input'
    for (const k of ['melee', 'ranged', 'shield', 'passive'] as const) {
      const opt = document.createElement('option')
      opt.value = k
      opt.textContent = k.charAt(0).toUpperCase() + k.slice(1)
      kindSelect.appendChild(opt)
    }
    kindSelect.addEventListener('change', () => { selectedKind = kindSelect.value as typeof selectedKind })

    const damageInput = document.createElement('input')
    damageInput.type = 'number'
    damageInput.min = '0'
    damageInput.className = 'bestiary-form-input bestiary-form-input-small'
    damageInput.value = String(damage)
    damageInput.placeholder = 'Dmg'
    damageInput.addEventListener('change', () => { damage = parseInt(damageInput.value) || 0 })

    kindGroup.append(kindSelect, damageInput)
    form.appendChild(kindGroup)

    // Actions
    const actionRow = document.createElement('div')
    actionRow.className = 'bestiary-form-actions'

    const cancelBtn = document.createElement('button')
    cancelBtn.className = 'bestiary-form-btn'
    cancelBtn.textContent = 'Cancel'
    cancelBtn.addEventListener('click', () => form.remove())

    const addEntryFormBtn = document.createElement('button')
    addEntryFormBtn.className = 'bestiary-form-btn bestiary-form-btn-add'
    addEntryFormBtn.textContent = 'Add'
    addEntryFormBtn.addEventListener('click', () => {
      const entry: LootEntry = {
        id: `custom_${Date.now()}`,
        assetId: selectedAssetId,
        name: itemName || 'New Item',
        weight: Math.max(1, Math.min(100, weight)),
        itemType: selectedType,
      }
      if (selectedType === 'consumable') {
        entry.consumableEffect = selectedEffect
        entry.consumableValue = effectValue
      } else {
        entry.pickupKind = selectedKind
        entry.pickupDamage = damage
      }
      onAdd(entry)
      form.remove()
    })

    actionRow.append(cancelBtn, addEntryFormBtn)
    form.appendChild(actionRow)

    const addBtn = container.querySelector('.bestiary-add-btn')
    if (addBtn) {
      container.insertBefore(form, addBtn)
    } else {
      container.appendChild(form)
    }
  }

  private formatEnemyName(assetId: string): string {
    return assetId
      .replace('enemy_', '')
      .replace('boss_', '')
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }
}
