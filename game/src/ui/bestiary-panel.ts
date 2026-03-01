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
  private container: HTMLElement
  private lootManager: LootTableManager
  private renderer: Renderer
  private modalBackdrop: HTMLElement | null = null

  constructor(container: HTMLElement, lootManager: LootTableManager, renderer: Renderer) {
    this.lootManager = lootManager
    this.renderer = renderer

    this.container = document.createElement('div')
    this.container.className = 'bestiary-panel'
    container.appendChild(this.container)
  }

  toggle(): void {
    this.container.classList.toggle('visible')
    if (this.container.classList.contains('visible')) {
      this.render()
    }
  }

  render(): HTMLElement {
    this.container.innerHTML = ''

    const header = document.createElement('h2')
    header.className = 'panel-header'
    header.textContent = 'Bestiary'
    this.container.appendChild(header)

    const grid = document.createElement('div')
    grid.className = 'bestiary-grid'

    for (const enemyId of ENEMY_ASSET_IDS) {
      const card = this.createEnemyCard(enemyId)
      grid.appendChild(card)
    }

    this.container.appendChild(grid)
    return this.container
  }

  private createEnemyCard(enemyId: string): HTMLElement {
    const card = document.createElement('button')
    card.className = 'bestiary-card'

    // Thumbnail
    const thumb = document.createElement('canvas')
    thumb.width = 32
    thumb.height = 32
    thumb.className = 'bestiary-card-thumb'
    const spriteCanvas = this.renderer.getSpriteCanvas(enemyId)
    if (spriteCanvas) {
      const ctx = thumb.getContext('2d')!
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(spriteCanvas, 0, 0, 32, 32)
    }
    card.appendChild(thumb)

    // Name
    const name = document.createElement('span')
    name.className = 'bestiary-card-name'
    name.textContent = this.formatEnemyName(enemyId)
    card.appendChild(name)

    // Customized indicator
    if (this.lootManager.hasCustomTable(enemyId)) {
      const badge = document.createElement('span')
      badge.className = 'bestiary-card-badge'
      badge.textContent = '\u2022'
      card.appendChild(badge)
    }

    card.addEventListener('click', () => this.openModal(enemyId))
    return card
  }

  private formatEnemyName(assetId: string): string {
    return assetId
      .replace('enemy_', '')
      .replace('boss_', '')
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

  private openModal(enemyId: string): void {
    this.closeModal()

    const table = this.lootManager.getTable(enemyId)
    if (!table) return

    let draftDropChance = table.dropChance
    let draftEntries = table.entries.map(e => ({ ...e }))

    // Backdrop
    this.modalBackdrop = document.createElement('div')
    this.modalBackdrop.className = 'bestiary-modal-backdrop'
    this.modalBackdrop.addEventListener('click', (e) => {
      if (e.target === this.modalBackdrop) this.closeModal()
    })

    // Modal
    const modal = document.createElement('div')
    modal.className = 'bestiary-modal'

    // Header
    const header = document.createElement('div')
    header.className = 'bestiary-modal-header'

    const thumb = document.createElement('canvas')
    thumb.width = 48
    thumb.height = 48
    thumb.className = 'bestiary-modal-thumb'
    const spriteCanvas = this.renderer.getSpriteCanvas(enemyId)
    if (spriteCanvas) {
      const ctx = thumb.getContext('2d')!
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(spriteCanvas, 0, 0, 48, 48)
    }
    header.appendChild(thumb)

    const headerText = document.createElement('div')
    headerText.className = 'bestiary-modal-header-text'

    const title = document.createElement('h3')
    title.className = 'bestiary-modal-title'
    title.textContent = this.formatEnemyName(enemyId)
    headerText.appendChild(title)

    if (this.lootManager.hasCustomTable(enemyId)) {
      const badge = document.createElement('span')
      badge.className = 'bestiary-custom-badge'
      badge.textContent = 'Customized'
      headerText.appendChild(badge)
    }

    header.appendChild(headerText)

    const closeBtn = document.createElement('button')
    closeBtn.className = 'bestiary-modal-close'
    closeBtn.textContent = '\u00d7'
    closeBtn.addEventListener('click', () => this.closeModal())
    header.appendChild(closeBtn)

    modal.appendChild(header)

    // Drop chance slider
    const chanceGroup = document.createElement('div')
    chanceGroup.className = 'bestiary-setting-group'

    const chanceLabel = document.createElement('label')
    chanceLabel.textContent = `Drop Chance: ${Math.round(draftDropChance * 100)}%`
    chanceGroup.appendChild(chanceLabel)

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
    chanceGroup.appendChild(chanceSlider)
    modal.appendChild(chanceGroup)

    // Loot entries
    const lootSection = document.createElement('div')
    lootSection.className = 'bestiary-loot-section'

    const lootLabel = document.createElement('label')
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
        for (let i = 0; i < draftEntries.length; i++) {
          const entry = draftEntries[i]
          const row = this.createLootRow(entry, () => {
            draftEntries.splice(i, 1)
            renderLootList()
          }, (updated) => {
            draftEntries[i] = updated
          })
          lootList.appendChild(row)
        }
      }
    }
    renderLootList()
    lootSection.appendChild(lootList)

    // Add loot button
    const addBtn = document.createElement('button')
    addBtn.className = 'bestiary-add-entry-btn'
    addBtn.textContent = '+ Add Loot'
    addBtn.addEventListener('click', () => {
      this.showAddLootForm(lootSection, (entry) => {
        draftEntries.push(entry)
        renderLootList()
      })
    })
    lootSection.appendChild(addBtn)

    modal.appendChild(lootSection)

    // Actions
    const actions = document.createElement('div')
    actions.className = 'bestiary-modal-actions'

    const resetBtn = document.createElement('button')
    resetBtn.className = 'bestiary-modal-btn bestiary-modal-btn-reset'
    resetBtn.textContent = 'Reset to Default'
    resetBtn.addEventListener('click', () => {
      this.lootManager.resetToDefault(enemyId)
      this.closeModal()
      this.render()
    })

    const saveBtn = document.createElement('button')
    saveBtn.className = 'bestiary-modal-btn bestiary-modal-btn-save'
    saveBtn.textContent = 'Save'
    saveBtn.addEventListener('click', () => {
      this.lootManager.setCustomTable({
        enemyAssetId: enemyId,
        dropChance: draftDropChance,
        entries: draftEntries,
      })
      this.closeModal()
      this.render()
    })

    actions.appendChild(resetBtn)
    actions.appendChild(saveBtn)
    modal.appendChild(actions)

    this.modalBackdrop.appendChild(modal)
    document.body.appendChild(this.modalBackdrop)

    // Escape to close
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.closeModal()
        window.removeEventListener('keydown', escHandler)
      }
    }
    window.addEventListener('keydown', escHandler)
  }

  private closeModal(): void {
    if (this.modalBackdrop) {
      this.modalBackdrop.remove()
      this.modalBackdrop = null
    }
  }

  private createLootRow(
    entry: LootEntry,
    onDelete: () => void,
    onUpdate: (e: LootEntry) => void
  ): HTMLElement {
    const row = document.createElement('div')
    row.className = 'bestiary-loot-row'

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

    const name = document.createElement('span')
    name.className = 'bestiary-loot-name'
    name.textContent = entry.name
    row.appendChild(name)

    const weightInput = document.createElement('input')
    weightInput.type = 'number'
    weightInput.min = '1'
    weightInput.max = '100'
    weightInput.value = String(entry.weight)
    weightInput.className = 'bestiary-loot-weight-input'
    weightInput.title = 'Drop weight'
    weightInput.addEventListener('change', () => {
      const val = parseInt(weightInput.value)
      if (!isNaN(val) && val >= 1 && val <= 100) {
        onUpdate({ ...entry, weight: val })
      }
    })
    row.appendChild(weightInput)

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

    const addEntryBtn = container.querySelector('.bestiary-add-entry-btn')
    if (addEntryBtn) {
      container.insertBefore(form, addEntryBtn)
    } else {
      container.appendChild(form)
    }
  }
}
