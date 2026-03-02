import type { World } from '../ecs/world'
import type {
  EquipmentComponent,
  InventoryComponent,
  ItemDef,
  ItemEffect,
} from '../ecs/types'
import { SPRITE_REGISTRY } from '../assets/sprites'

type EquipSlot = 'weapon' | 'armor' | 'accessory'

const KIND_LABELS: Record<ItemDef['kind'], string> = {
  melee: 'Melee Weapon',
  ranged: 'Ranged Weapon',
  shield: 'Shield',
  passive: 'Passive',
}

function formatItemStats(item: ItemDef): string {
  const parts: string[] = []
  if (item.damage) parts.push(`DMG ${item.damage}`)
  if (item.defense) parts.push(`DEF ${item.defense}`)
  if (item.critChance) parts.push(`Crit ${Math.round(item.critChance * 100)}%`)
  if (item.effect) {
    const e = item.effect
    switch (e.type) {
      case 'fire_damage': parts.push(`Fire +${e.value}`); break
      case 'thorns': parts.push(`Thorns ${e.value}`); break
      case 'lifesteal': parts.push(`Steal ${Math.round(e.value * 100)}%`); break
      case 'dodge': parts.push(`Dodge ${Math.round(e.value * 100)}%`); break
      case 'speed_boost': parts.push(`Spd +${Math.round(e.value * 100)}%`); break
      case 'poison': parts.push(`Psn ${e.value}`); break
      case 'crit_boost': parts.push(`Crit +${Math.round(e.value * 100)}%`); break
      case 'max_hp_bonus': parts.push(`+${e.value} HP`); break
    }
  }
  return parts.join(' | ')
}

function formatEffectDescription(effect: ItemEffect): string {
  switch (effect.type) {
    case 'lifesteal': return `Heals ${Math.round(effect.value * 100)}% of damage dealt`
    case 'thorns': return `Reflects ${effect.value} damage to attackers`
    case 'speed_boost': return `+${Math.round(effect.value * 100)}% movement speed`
    case 'poison': return `Poisons for ${effect.value} dmg/sec`
    case 'fire_damage': return `+${effect.value} fire damage per hit`
    case 'dodge': return `${Math.round(effect.value * 100)}% chance to dodge attacks`
    case 'crit_boost': return `+${Math.round(effect.value * 100)}% critical hit chance`
    case 'max_hp_bonus': return `+${effect.value} max HP`
  }
}

const RARITY_COLORS: Record<string, string> = {
  common: '#CCCCCC',
  uncommon: '#4CAF50',
  rare: '#2196F3',
  epic: '#9C27B0',
  legendary: '#FFD700',
}

const EQUIP_SLOT_KINDS: Record<EquipSlot, ItemDef['kind'][]> = {
  weapon: ['melee', 'ranged'],
  armor: ['shield'],
  accessory: ['passive'],
}

interface DragSource {
  type: 'inventory' | 'equipment'
  index?: number
  slot?: EquipSlot
}

export class BackpackPanel {
  private overlay: HTMLElement | null = null
  private entityId: string | null = null
  private thumbCache: Map<string, HTMLCanvasElement> = new Map()
  private dragItem: ItemDef | null = null
  private dragSource: DragSource | null = null
  private slotContextMenu: HTMLElement | null = null
  private fabImg: HTMLImageElement | null = null
  private tooltip: HTMLElement | null = null

  onConfigChange: (() => void) | null = null
  onDropItem: ((itemDef: ItemDef, entityId: string) => void) | null = null
  onUseItem: ((itemDef: ItemDef, entityId: string, slotIndex: number) => void) | null = null

  constructor(private world: World) {}

  setEntity(entityId: string | null): void {
    this.entityId = entityId
    if (this.overlay) this.renderContent()
  }

  get isOpen(): boolean {
    return this.overlay !== null
  }

  toggle(): void {
    if (this.overlay) this.close()
    else this.open()
  }

  // ==================== Floating FAB ====================

  createFloatingButton(): HTMLElement {
    const fab = document.createElement('div')
    fab.className = 'backpack-fab'
    fab.title = 'Backpack (I)'

    const img = document.createElement('img')
    img.src = '/rucksack-closed.png'
    img.alt = 'Backpack'
    img.className = 'backpack-fab-img'
    img.draggable = false
    fab.appendChild(img)
    this.fabImg = img

    fab.addEventListener('click', () => this.toggle())
    return fab
  }

  private updateFabIcon(): void {
    if (!this.fabImg) return
    this.fabImg.src = this.overlay ? '/rucksack-open.png' : '/rucksack-closed.png'
  }

  // ==================== Modal ====================

  open(): void {
    if (this.overlay) return

    this.overlay = document.createElement('div')
    this.overlay.className = 'backpack-overlay'
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close()
    })

    const modal = document.createElement('div')
    modal.className = 'backpack-modal'

    // Header
    const header = document.createElement('div')
    header.className = 'backpack-header'
    const title = document.createElement('h2')
    title.className = 'backpack-title'
    title.textContent = 'Backpack'
    const closeBtn = document.createElement('button')
    closeBtn.className = 'settings-close'
    closeBtn.textContent = '\u00D7'
    closeBtn.addEventListener('click', () => this.close())
    header.appendChild(title)
    header.appendChild(closeBtn)
    modal.appendChild(header)

    // Equip bar area
    const equipBar = document.createElement('div')
    equipBar.className = 'backpack-equip-bar'
    equipBar.id = 'backpack-equip-bar'
    modal.appendChild(equipBar)

    // Content area (inventory grid)
    const content = document.createElement('div')
    content.className = 'backpack-content'
    content.id = 'backpack-content'
    modal.appendChild(content)

    this.overlay.appendChild(modal)
    document.body.appendChild(this.overlay)
    this.renderContent()
    this.updateFabIcon()

    // Escape to close
    this.overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        this.close()
      }
    })
  }

  close(): void {
    this.hideTooltip()
    this.closeSlotContextMenu()
    if (this.overlay) {
      this.overlay.remove()
      this.overlay = null
    }
    this.updateFabIcon()
  }

  private renderContent(): void {
    const equipBarEl = this.overlay?.querySelector('#backpack-equip-bar')
    const content = this.overlay?.querySelector('#backpack-content')
    if (!equipBarEl || !content) return
    equipBarEl.innerHTML = ''
    content.innerHTML = ''

    const entity = this.entityId ? this.world.getEntity(this.entityId) : null
    const inv = entity?.components.get('inventory') as InventoryComponent | undefined
    const equip = entity?.components.get('equipment') as EquipmentComponent | undefined

    // Equip bar: 3 large cells
    this.renderEquipBar(equipBarEl, equip, inv)

    // Entity badge
    if (entity) {
      const badge = document.createElement('div')
      badge.className = 'backpack-entity-badge'
      badge.textContent = entity.name
      content.appendChild(badge)
    }

    // Inventory grid
    if (!inv) {
      const empty = document.createElement('div')
      empty.className = 'backpack-empty'
      empty.textContent = 'No inventory'
      content.appendChild(empty)

      if (this.entityId) {
        const addBtn = document.createElement('button')
        addBtn.className = 'backpack-add-btn'
        addBtn.textContent = '+ Add Inventory'
        addBtn.addEventListener('click', () => {
          if (!this.entityId) return
          this.world.addComponent(this.entityId, {
            type: 'inventory',
            capacity: 16,
            items: new Array(16).fill(null),
          })
          this.renderContent()
        })
        content.appendChild(addBtn)
      }
      return
    }

    const gridLabel = document.createElement('div')
    gridLabel.className = 'backpack-section-label'
    gridLabel.textContent = 'Items'
    content.appendChild(gridLabel)

    const grid = document.createElement('div')
    grid.className = 'backpack-grid'
    for (let i = 0; i < inv.capacity; i++) {
      const item = inv.items[i] ?? null
      const slot = this.createInventorySlot(item, i, inv)
      grid.appendChild(slot)
    }
    content.appendChild(grid)
  }

  // ==================== Equip Bar ====================

  private renderEquipBar(container: Element, equip: EquipmentComponent | undefined, inv: InventoryComponent | undefined): void {
    for (const slotName of ['weapon', 'armor', 'accessory'] as EquipSlot[]) {
      const item = equip?.slots[slotName] ?? null
      const cell = this.createEquipCell(slotName, item, equip, inv)
      container.appendChild(cell)
    }
  }

  private createEquipCell(slotName: EquipSlot, item: ItemDef | null, equip: EquipmentComponent | undefined, inv: InventoryComponent | undefined): HTMLElement {
    const cell = document.createElement('div')
    cell.className = `backpack-equip-cell${item ? '' : ' backpack-equip-cell-empty'}`

    if (item) {
      // Rarity glow for equip cells
      const rarity = item.rarity
      if (rarity === 'epic' || rarity === 'legendary') {
        const glowColor = RARITY_COLORS[rarity]
        cell.style.boxShadow = `inset 0 0 6px ${glowColor}, 0 0 4px ${glowColor}`
        cell.style.borderColor = glowColor
      }

      const thumb = this.getThumbnail(item.assetId, 40)
      if (thumb) cell.appendChild(thumb)

      const itemName = document.createElement('div')
      itemName.className = 'backpack-equip-cell-name'
      itemName.textContent = item.name
      if (item.rarity && RARITY_COLORS[item.rarity]) {
        itemName.style.color = RARITY_COLORS[item.rarity]
      }
      cell.appendChild(itemName)

      cell.draggable = true
      cell.addEventListener('dragstart', (e) => {
        this.dragItem = item
        this.dragSource = { type: 'equipment', slot: slotName }
        e.dataTransfer!.effectAllowed = 'move'
      })
      cell.addEventListener('dragend', () => {
        this.dragItem = null
        this.dragSource = null
      })

      this.attachTooltipEvents(cell, item)
    }

    // Slot label
    const label = document.createElement('div')
    label.className = 'backpack-equip-cell-label'
    label.textContent = slotName
    cell.appendChild(label)

    // Drop target
    cell.addEventListener('dragover', (e) => {
      e.preventDefault()
      e.dataTransfer!.dropEffect = 'move'
      cell.classList.add('backpack-slot-dragover')
    })
    cell.addEventListener('dragleave', () => {
      cell.classList.remove('backpack-slot-dragover')
    })
    cell.addEventListener('drop', (e) => {
      e.preventDefault()
      cell.classList.remove('backpack-slot-dragover')
      if (equip && inv) {
        this.handleDropOnEquip(slotName, equip, inv)
      }
    })

    return cell
  }

  // ==================== Inventory Slots ====================

  private createInventorySlot(item: ItemDef | null, index: number, inv: InventoryComponent): HTMLElement {
    const slot = document.createElement('div')
    slot.className = `backpack-slot${item ? '' : ' backpack-slot-empty'}`

    if (item) {
      // Rarity border glow for epic/legendary
      const rarity = item.rarity
      if (rarity === 'epic' || rarity === 'legendary') {
        const glowColor = RARITY_COLORS[rarity]
        slot.style.boxShadow = `inset 0 0 6px ${glowColor}, 0 0 4px ${glowColor}`
        slot.style.borderColor = glowColor
      }

      const thumb = this.getThumbnail(item.assetId, 40)
      if (thumb) slot.appendChild(thumb)

      const name = document.createElement('div')
      name.className = 'backpack-slot-name'
      name.textContent = item.name
      if (rarity && RARITY_COLORS[rarity]) {
        name.style.color = RARITY_COLORS[rarity]
      }
      slot.appendChild(name)

      const stats = formatItemStats(item)
      if (stats) {
        const statsEl = document.createElement('div')
        statsEl.className = 'backpack-slot-stats'
        statsEl.textContent = stats
        slot.appendChild(statsEl)
      }

      if (rarity && rarity !== 'common') {
        const rarityEl = document.createElement('div')
        rarityEl.className = 'backpack-slot-rarity'
        rarityEl.textContent = rarity
        rarityEl.style.color = RARITY_COLORS[rarity] ?? ''
        slot.appendChild(rarityEl)
      }

      slot.draggable = true
      slot.addEventListener('dragstart', (e) => {
        this.dragItem = item
        this.dragSource = { type: 'inventory', index }
        e.dataTransfer!.effectAllowed = 'move'
      })
      slot.addEventListener('dragend', () => {
        this.dragItem = null
        this.dragSource = null
      })

      slot.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        this.showSlotContextMenu(e.clientX, e.clientY, item, index, inv)
      })

      this.attachTooltipEvents(slot, item)
    }

    // Drop target
    slot.addEventListener('dragover', (e) => {
      e.preventDefault()
      e.dataTransfer!.dropEffect = 'move'
      slot.classList.add('backpack-slot-dragover')
    })
    slot.addEventListener('dragleave', () => {
      slot.classList.remove('backpack-slot-dragover')
    })
    slot.addEventListener('drop', (e) => {
      e.preventDefault()
      slot.classList.remove('backpack-slot-dragover')
      this.handleDropOnInventory(index, inv)
    })

    return slot
  }

  // ==================== Drag & Drop ====================

  private handleDropOnInventory(targetIndex: number, inv: InventoryComponent): void {
    if (!this.dragItem || !this.dragSource) return

    if (this.dragSource.type === 'inventory' && this.dragSource.index !== undefined) {
      const srcIndex = this.dragSource.index
      if (srcIndex === targetIndex) return
      const temp = inv.items[targetIndex]
      inv.items[targetIndex] = inv.items[srcIndex]
      inv.items[srcIndex] = temp
    } else if (this.dragSource.type === 'equipment' && this.dragSource.slot) {
      const entity = this.entityId ? this.world.getEntity(this.entityId) : null
      const equip = entity?.components.get('equipment') as EquipmentComponent | undefined
      if (!equip) return
      const slot = this.dragSource.slot
      const equipItem = equip.slots[slot]
      if (!equipItem) return

      const targetItem = inv.items[targetIndex]
      if (targetItem && !EQUIP_SLOT_KINDS[slot].includes(targetItem.kind)) {
        const emptyIdx = inv.items.indexOf(null)
        if (emptyIdx === -1) return
        inv.items[emptyIdx] = equipItem
        equip.slots[slot] = null
      } else {
        inv.items[targetIndex] = equipItem
        equip.slots[slot] = targetItem
      }
    }

    this.dragItem = null
    this.dragSource = null
    this.renderContent()
  }

  private handleDropOnEquip(targetSlot: EquipSlot, equip: EquipmentComponent, inv: InventoryComponent): void {
    if (!this.dragItem || !this.dragSource) return

    if (this.dragSource.type === 'inventory' && this.dragSource.index !== undefined) {
      const srcIndex = this.dragSource.index
      const item = inv.items[srcIndex]
      if (!item) return
      if (!EQUIP_SLOT_KINDS[targetSlot].includes(item.kind)) return

      const currentEquip = equip.slots[targetSlot]
      equip.slots[targetSlot] = item
      inv.items[srcIndex] = currentEquip
    } else if (this.dragSource.type === 'equipment' && this.dragSource.slot) {
      const srcSlot = this.dragSource.slot
      if (srcSlot === targetSlot) return

      const srcItem = equip.slots[srcSlot]
      const targetItem = equip.slots[targetSlot]

      if (srcItem && !EQUIP_SLOT_KINDS[targetSlot].includes(srcItem.kind)) return
      if (targetItem && !EQUIP_SLOT_KINDS[srcSlot].includes(targetItem.kind)) return

      equip.slots[targetSlot] = srcItem
      equip.slots[srcSlot] = targetItem
    }

    this.dragItem = null
    this.dragSource = null
    this.renderContent()
  }

  // ==================== Slot Context Menu ====================

  private showSlotContextMenu(x: number, y: number, item: ItemDef, index: number, inv: InventoryComponent): void {
    this.closeSlotContextMenu()

    const menu = document.createElement('div')
    menu.className = 'backpack-context-menu'
    menu.style.left = `${x}px`
    menu.style.top = `${y}px`

    // "Use" button for items with consumable-like effects
    if (item.effect && this.onUseItem) {
      const useBtn = document.createElement('button')
      useBtn.className = 'backpack-context-menu-btn'
      useBtn.textContent = 'Use'
      useBtn.addEventListener('click', () => {
        if (this.entityId && this.onUseItem) {
          this.onUseItem(item, this.entityId, index)
        }
        inv.items[index] = null
        this.closeSlotContextMenu()
        this.renderContent()
      })
      menu.appendChild(useBtn)
    }

    const dropBtn = document.createElement('button')
    dropBtn.className = 'backpack-context-menu-btn'
    dropBtn.textContent = 'Drop'
    dropBtn.addEventListener('click', () => {
      if (this.entityId && this.onDropItem) {
        this.onDropItem(item, this.entityId)
      }
      inv.items[index] = null
      this.closeSlotContextMenu()
      this.renderContent()
    })
    menu.appendChild(dropBtn)

    this.slotContextMenu = menu
    document.body.appendChild(menu)

    const closeHandler = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        this.closeSlotContextMenu()
        document.removeEventListener('click', closeHandler, true)
      }
    }
    requestAnimationFrame(() => {
      document.addEventListener('click', closeHandler, true)
    })
  }

  private closeSlotContextMenu(): void {
    if (this.slotContextMenu) {
      this.slotContextMenu.remove()
      this.slotContextMenu = null
    }
  }

  // ==================== Item Tooltip ====================

  private showTooltip(item: ItemDef, x: number, y: number): void {
    this.hideTooltip()

    const tip = document.createElement('div')
    tip.className = 'backpack-tooltip'

    // Header: name
    const nameEl = document.createElement('div')
    nameEl.className = 'backpack-tooltip-name'
    nameEl.textContent = item.name
    if (item.rarity && RARITY_COLORS[item.rarity]) {
      nameEl.style.color = RARITY_COLORS[item.rarity]
    }
    tip.appendChild(nameEl)

    // Rarity + kind row
    const subEl = document.createElement('div')
    subEl.className = 'backpack-tooltip-sub'
    const parts: string[] = []
    if (item.rarity) parts.push(item.rarity.toUpperCase())
    parts.push(KIND_LABELS[item.kind])
    subEl.textContent = parts.join(' \u00B7 ')
    tip.appendChild(subEl)

    // Stat rows
    const statRows: [string, string][] = []
    if (item.damage) statRows.push(['Damage', `${item.damage}`])
    if (item.defense) statRows.push(['Defense', `${item.defense}`])
    if (item.range) statRows.push(['Range', `${item.range}`])
    if (item.cooldown) statRows.push(['Cooldown', `${item.cooldown}ms`])
    if (item.critChance) statRows.push(['Crit Chance', `${Math.round(item.critChance * 100)}%`])

    if (statRows.length > 0) {
      const statsEl = document.createElement('div')
      statsEl.className = 'backpack-tooltip-stats'
      for (const [label, val] of statRows) {
        const row = document.createElement('div')
        row.className = 'backpack-tooltip-stat-row'
        row.innerHTML = `<span>${label}</span><span>${val}</span>`
        statsEl.appendChild(row)
      }
      tip.appendChild(statsEl)
    }

    // Effect
    if (item.effect) {
      const effectEl = document.createElement('div')
      effectEl.className = 'backpack-tooltip-effect'
      effectEl.textContent = formatEffectDescription(item.effect)
      tip.appendChild(effectEl)
    }

    // Position: offset from cursor, keep on screen
    tip.style.left = `${x + 12}px`
    tip.style.top = `${y + 12}px`
    document.body.appendChild(tip)

    // Clamp to viewport
    const rect = tip.getBoundingClientRect()
    if (rect.right > window.innerWidth) {
      tip.style.left = `${x - rect.width - 4}px`
    }
    if (rect.bottom > window.innerHeight) {
      tip.style.top = `${y - rect.height - 4}px`
    }

    this.tooltip = tip
  }

  private hideTooltip(): void {
    if (this.tooltip) {
      this.tooltip.remove()
      this.tooltip = null
    }
  }

  private attachTooltipEvents(el: HTMLElement, item: ItemDef): void {
    el.addEventListener('mouseenter', (e) => {
      this.showTooltip(item, e.clientX, e.clientY)
    })
    el.addEventListener('mousemove', (e) => {
      if (this.tooltip) {
        this.tooltip.style.left = `${e.clientX + 12}px`
        this.tooltip.style.top = `${e.clientY + 12}px`
      }
    })
    el.addEventListener('mouseleave', () => this.hideTooltip())
    el.addEventListener('dragstart', () => this.hideTooltip())
  }

  // ==================== Thumbnails ====================

  private getThumbnail(assetId: string, size: number): HTMLCanvasElement | null {
    const cacheKey = `${assetId}_${size}`
    let cached = this.thumbCache.get(cacheKey)
    if (cached) {
      const clone = document.createElement('canvas')
      clone.width = size
      clone.height = size
      clone.getContext('2d')!.drawImage(cached, 0, 0)
      return clone
    }

    const sprite = SPRITE_REGISTRY[assetId]
    if (!sprite) return null

    cached = document.createElement('canvas')
    cached.width = size
    cached.height = size
    const ctx = cached.getContext('2d')!

    const imageData = ctx.createImageData(sprite.width, sprite.height)
    for (let y = 0; y < sprite.height; y++) {
      for (let x = 0; x < sprite.width; x++) {
        const hex = sprite.pixels[y]?.[x]
        if (hex) {
          const i = (y * sprite.width + x) * 4
          imageData.data[i] = parseInt(hex.slice(1, 3), 16)
          imageData.data[i + 1] = parseInt(hex.slice(3, 5), 16)
          imageData.data[i + 2] = parseInt(hex.slice(5, 7), 16)
          imageData.data[i + 3] = 255
        }
      }
    }

    const offscreen = document.createElement('canvas')
    offscreen.width = sprite.width
    offscreen.height = sprite.height
    offscreen.getContext('2d')!.putImageData(imageData, 0, 0)

    ctx.imageSmoothingEnabled = false
    const scale = Math.min(size / sprite.width, size / sprite.height)
    const dw = sprite.width * scale
    const dh = sprite.height * scale
    ctx.drawImage(offscreen, (size - dw) / 2, (size - dh) / 2, dw, dh)

    this.thumbCache.set(cacheKey, cached)

    const clone = document.createElement('canvas')
    clone.width = size
    clone.height = size
    clone.getContext('2d')!.drawImage(cached, 0, 0)
    return clone
  }
}
