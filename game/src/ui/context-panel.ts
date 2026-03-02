import type { World } from '../ecs/world'
import type {
  PositionComponent,
  SpriteComponent,
  PhysicsComponent,
  HealthComponent,
  BehaviorComponent,
  BehaviorRule,
  PatrolComponent,
  FacingComponent,
  EquipmentComponent,
  DoorComponent,
  ConsumableComponent,
  LayerComponent,
  ChestComponent,
  ChestLootEntry,
} from '../ecs/types'
import { getAssetIds } from '../assets/sprites'
import type { Renderer } from '../engine/renderer'
import { GAME_CONFIG } from '../config/game-config'


export class ContextPanel {
  private container: HTMLElement
  private content: HTMLElement
  private currentEntityId: string | null = null
  private renderer: Renderer | null = null

  /** Called when user deletes entity via context panel button */
  onEntityDeleted: ((id: string) => void) | null = null
  /** Called when user clicks "Open Backpack" on equipment section */
  onOpenBackpack: (() => void) | null = null
  /** Called when user clicks Edit Path to enter patrol edit mode */
  onEditPatrol: ((entityId: string) => void) | null = null
  /** Called when user clicks Done Editing to exit patrol edit mode */
  onExitPatrolEdit: (() => void) | null = null
  /** Called when user switches to a different layer */
  onLayerSwitch: ((layerId: string) => void) | null = null
  /** Called when user deletes a layer */
  onLayerDelete: ((layerId: string) => void) | null = null
  /** Called when user toggles game mode on a layer */
  onLayerGameModeToggle: ((layerId: string, mode: 'platformer' | 'topdown') => void) | null = null
  /** Called when user adds a new layer */
  onAddLayer: (() => void) | null = null
  /** Called when user changes a game rule */
  onGameRuleChange: (() => void) | null = null
  /** Called when user clicks "Link Door" to enter door link mode */
  onEnterDoorLinkMode: ((entityId: string) => void) | null = null
  /** Called when user clicks "Test Voice" on a say_voice behavior rule */
  onTestVoice: ((npcType: string) => void) | null = null
  /** Whether patrol edit mode is active (set externally) */
  patrolEditActive = false

  setRenderer(r: Renderer): void {
    this.renderer = r
  }

  constructor(parent: HTMLElement, private world: World) {
    this.container = document.createElement('div')
    this.container.className = 'context-panel'

    const header = document.createElement('h3')
    header.className = 'panel-header'
    header.textContent = 'Properties'
    this.container.appendChild(header)

    this.content = document.createElement('div')
    this.content.className = 'context-content'
    this.container.appendChild(this.content)

    parent.appendChild(this.container)
    this.showEntity(null)
  }

  showEntity(entityId: string | null): void {
    this.currentEntityId = entityId
    this.content.innerHTML = ''

    if (!entityId) {
      this.showGameHub()
      return
    }

    const entity = this.world.getEntity(entityId)
    if (!entity) {
      this.showEntity(null)
      return
    }

    // --- Name ---
    this.addSection('Identity')
    this.addTextInput('Name', entity.name, (val) => {
      entity.name = val
    })

    // --- Position ---
    const pos = entity.components.get('position') as PositionComponent | undefined
    if (pos) {
      this.addSection('Position')
      this.addNumberInput('X', pos.x, (val) => { pos.x = val })
      this.addNumberInput('Y', pos.y, (val) => { pos.y = val })
    }

    // --- Sprite ---
    const sprite = entity.components.get('sprite') as SpriteComponent | undefined
    if (sprite) {
      this.addSection('Sprite')
      this.addDropdown('Asset', getAssetIds(), sprite.assetId, (val) => {
        sprite.assetId = val
      })
      this.addNumberInput('Width', sprite.width, (val) => { sprite.width = val })
      this.addNumberInput('Height', sprite.height, (val) => { sprite.height = val })
      this.addRange('Hue Shift', sprite.hueShift ?? 0, 0, 360, 1, (val) => {
        sprite.hueShift = val
      })
      this.addCheckbox('Flip X', sprite.flipX ?? false, (val) => {
        sprite.flipX = val
      })
    }

    // --- Physics ---
    const phys = entity.components.get('physics') as PhysicsComponent | undefined
    if (phys) {
      this.addSection('Physics')
      this.addCheckbox('Gravity', phys.gravity, (val) => { phys.gravity = val })
      this.addCheckbox('Solid', phys.solid, (val) => { phys.solid = val })
    }

    // --- Health ---
    const health = entity.components.get('health') as HealthComponent | undefined
    if (health) {
      this.addSection('Health')
      this.addNumberInput('HP', health.hp, (val) => { health.hp = val })
      this.addNumberInput('Max HP', health.maxHp, (val) => { health.maxHp = val })
    } else {
      const addHealthBtn = document.createElement('button')
      addHealthBtn.className = 'editor-btn editor-btn-secondary'
      addHealthBtn.textContent = '+ Add Health'
      addHealthBtn.addEventListener('click', () => {
        const p = entity.components.get('position') as PositionComponent | undefined
        this.world.addComponent(entityId, {
          type: 'health',
          hp: 100,
          maxHp: 100,
          invulnerableTimer: 0,
          spawnX: p?.x ?? 0,
          spawnY: p?.y ?? 0,
          respawnDelay: 3000,
          deadTimer: 0,
        })
        this.showEntity(entityId)
      })
      this.content.appendChild(addHealthBtn)
    }

    // --- Behavior ---
    const behavior = entity.components.get('behavior') as BehaviorComponent | undefined
    if (behavior) {
      this.addSection('Behavior Rules')
      for (const rule of behavior.rules) {
        this.addBehaviorRule(rule, behavior, entityId)
      }
    }

    const addBehaviorBtn = document.createElement('button')
    addBehaviorBtn.className = 'editor-btn editor-btn-secondary'
    addBehaviorBtn.textContent = '+ Add Behavior Rule'
    addBehaviorBtn.addEventListener('click', () => {
      let bComp = entity.components.get('behavior') as BehaviorComponent | undefined
      if (!bComp) {
        bComp = { type: 'behavior', rules: [] }
        this.world.addComponent(entityId, bComp)
      }
      bComp.rules.push({
        id: `rule_${Date.now()}`,
        description: '',
        trigger: '',
        action: '',
        enabled: true,
      })
      this.showEntity(entityId)
    })
    this.content.appendChild(addBehaviorBtn)

    // --- Patrol ---
    const patrol = entity.components.get('patrol') as PatrolComponent | undefined
    if (patrol) {
      this.addSection('Patrol')
      this.addNumberInput('Speed', patrol.speed, (val) => { patrol.speed = val })
      this.addCheckbox('Loop', patrol.loop, (val) => { patrol.loop = val })

      // Waypoint list
      if (patrol.waypoints.length > 0) {
        const listEl = document.createElement('div')
        listEl.className = 'patrol-waypoint-list'
        for (let i = 0; i < patrol.waypoints.length; i++) {
          const wp = patrol.waypoints[i]
          const wpRow = document.createElement('div')
          wpRow.className = 'patrol-waypoint-row'

          const label = document.createElement('span')
          label.className = 'patrol-waypoint-label'
          label.textContent = `${i + 1}.`

          const coords = document.createElement('span')
          coords.className = 'patrol-waypoint-coords'
          coords.textContent = `(${Math.round(wp.x)}, ${Math.round(wp.y)})`

          const delBtn = document.createElement('button')
          delBtn.className = 'editor-btn-icon'
          delBtn.textContent = '\u00D7'
          delBtn.title = 'Remove waypoint'
          delBtn.addEventListener('click', () => {
            this.world.saveSnapshot()
            patrol.waypoints.splice(i, 1)
            if (patrol.currentIndex >= patrol.waypoints.length) {
              patrol.currentIndex = 0
            }
            this.showEntity(entityId)
          })

          wpRow.appendChild(label)
          wpRow.appendChild(coords)
          wpRow.appendChild(delBtn)
          listEl.appendChild(wpRow)
        }
        this.content.appendChild(listEl)
      } else {
        this.addHint('No waypoints \u2014 click Edit Path to add')
      }

      // Edit Path / Done Editing toggle button
      const editBtn = document.createElement('button')
      if (this.patrolEditActive) {
        editBtn.className = 'editor-btn editor-btn-primary patrol-edit-active'
        editBtn.textContent = 'Done Editing'
        editBtn.addEventListener('click', () => {
          this.patrolEditActive = false
          this.onExitPatrolEdit?.()
          this.showEntity(entityId)
        })
      } else {
        editBtn.className = 'editor-btn editor-btn-secondary'
        editBtn.textContent = 'Edit Path'
        editBtn.addEventListener('click', () => {
          this.patrolEditActive = true
          this.onEditPatrol?.(entityId)
          this.showEntity(entityId)
        })
      }
      this.content.appendChild(editBtn)

      // Clear Path button (only if waypoints exist)
      if (patrol.waypoints.length > 0) {
        const clearBtn = document.createElement('button')
        clearBtn.className = 'editor-btn editor-btn-danger'
        clearBtn.style.marginTop = '4px'
        clearBtn.textContent = 'Clear Path'
        clearBtn.addEventListener('click', () => {
          this.world.saveSnapshot()
          patrol.waypoints = []
          patrol.currentIndex = 0
          this.showEntity(entityId)
        })
        this.content.appendChild(clearBtn)
      }

      // Hint when editing
      if (this.patrolEditActive) {
        this.addHint('Click canvas to place waypoints. Drag to adjust. Right-click to remove.')
      }
    }

    // --- Facing ---
    const facing = entity.components.get('facing') as FacingComponent | undefined
    if (facing) {
      this.addSection('Facing')
      this.addDropdown('Direction', ['left', 'right', 'up', 'down'], facing.direction, (val) => {
        facing.direction = val as FacingComponent['direction']
      })
    }

    // --- Equipment ---
    const equipment = entity.components.get('equipment') as EquipmentComponent | undefined
    if (equipment) {
      this.addSection('Equipment')
      this.addReadOnlyText('Weapon', equipment.slots.weapon?.name ?? 'None')
      this.addReadOnlyText('Armor', equipment.slots.armor?.name ?? 'None')
      this.addReadOnlyText('Accessory', equipment.slots.accessory?.name ?? 'None')

      const openBackpackBtn = document.createElement('button')
      openBackpackBtn.className = 'editor-btn editor-btn-secondary'
      openBackpackBtn.textContent = 'Open Backpack'
      openBackpackBtn.addEventListener('click', () => this.onOpenBackpack?.())
      this.content.appendChild(openBackpackBtn)
    }

    // --- Door ---
    const door = entity.components.get('door') as DoorComponent | undefined
    if (door) {
      this.addSection('Door')

      // Dropdown of all other door entities for destination selection
      const allDoors = this.world.query('door', 'position').filter(e => e.id !== entityId)
      const row = this.createRow('Destination')
      const select = document.createElement('select')
      select.className = 'editor-input'
      const noneOpt = document.createElement('option')
      noneOpt.value = ''
      noneOpt.textContent = 'None'
      if (!door.destinationId) noneOpt.selected = true
      select.appendChild(noneOpt)
      for (const d of allDoors) {
        const opt = document.createElement('option')
        opt.value = d.id
        opt.textContent = d.name || d.id
        if (d.id === door.destinationId) opt.selected = true
        select.appendChild(opt)
      }
      select.addEventListener('change', () => {
        door.destinationId = select.value || null
      })
      row.appendChild(select)
      this.content.appendChild(row)

      this.addCheckbox('Bidirectional', door.bidirectional, (val) => { door.bidirectional = val })

      // Link Door button — enter visual link mode
      const linkBtn = document.createElement('button')
      linkBtn.className = 'editor-btn editor-btn-secondary'
      linkBtn.textContent = 'Link Door'
      linkBtn.title = 'Click another door on the canvas to link'
      linkBtn.addEventListener('click', () => {
        this.onEnterDoorLinkMode?.(entityId)
      })
      this.content.appendChild(linkBtn)

      // Unlink button (shown when linked)
      if (door.destinationId) {
        const unlinkBtn = document.createElement('button')
        unlinkBtn.className = 'editor-btn editor-btn-secondary'
        unlinkBtn.textContent = 'Unlink'
        unlinkBtn.style.marginLeft = '4px'
        unlinkBtn.addEventListener('click', () => {
          // Clear bidirectional partner if applicable
          if (door.bidirectional && door.destinationId) {
            const destDoor = this.world.getComponent(door.destinationId, 'door') as DoorComponent | undefined
            if (destDoor && destDoor.destinationId === entityId) {
              destDoor.destinationId = null
            }
          }
          door.destinationId = null
          this.showEntity(entityId) // refresh
        })
        this.content.appendChild(unlinkBtn)
      }
    }

    // --- Consumable ---
    const consumable = entity.components.get('consumable') as ConsumableComponent | undefined
    if (consumable) {
      this.addSection('Consumable')
      this.addDropdown('Effect', ['heal', 'speed', 'ammo', 'score'], consumable.effect, (val) => {
        consumable.effect = val as ConsumableComponent['effect']
      })
      this.addNumberInput('Value', consumable.value, (val) => { consumable.value = val })
    }

    // --- Chest ---
    const chest = entity.components.get('chest') as ChestComponent | undefined
    if (chest) {
      this.addSection('Chest')
      this.addCheckbox('Opened', chest.opened, (val) => { chest.opened = val })

      for (let li = 0; li < chest.loot.length; li++) {
        const lootEntry = chest.loot[li]
        const lootEl = document.createElement('div')
        lootEl.className = 'behavior-rule'

        // Type dropdown
        const typeLabel = document.createElement('div')
        typeLabel.className = 'behavior-rule-label'
        typeLabel.textContent = `LOOT ${li + 1}`
        lootEl.appendChild(typeLabel)

        const typeRow = document.createElement('div')
        typeRow.className = 'behavior-rule-row'
        const typeSelect = document.createElement('select')
        typeSelect.className = 'editor-input behavior-rule-select'
        for (const opt of ['consumable', 'pickup']) {
          const el = document.createElement('option')
          el.value = opt
          el.textContent = opt
          if (opt === lootEntry.itemType) el.selected = true
          typeSelect.appendChild(el)
        }
        typeSelect.addEventListener('change', () => {
          lootEntry.itemType = typeSelect.value as 'consumable' | 'pickup'
          this.showEntity(entityId)
        })
        typeRow.appendChild(typeSelect)

        // Remove button
        const removeBtn = document.createElement('button')
        removeBtn.className = 'editor-btn-icon'
        removeBtn.textContent = '\u00D7'
        removeBtn.title = 'Remove loot'
        removeBtn.addEventListener('click', () => {
          chest.loot.splice(li, 1)
          this.showEntity(entityId)
        })
        typeRow.appendChild(removeBtn)
        lootEl.appendChild(typeRow)

        if (lootEntry.itemType === 'consumable') {
          // Effect dropdown
          const effectRow = this.createRow('Effect')
          const effectSelect = document.createElement('select')
          effectSelect.className = 'editor-input'
          for (const opt of ['heal', 'speed', 'ammo', 'score']) {
            const el = document.createElement('option')
            el.value = opt
            el.textContent = opt
            if (opt === (lootEntry.consumableEffect ?? 'heal')) el.selected = true
            effectSelect.appendChild(el)
          }
          effectSelect.addEventListener('change', () => {
            lootEntry.consumableEffect = effectSelect.value as 'heal' | 'speed' | 'ammo' | 'score'
          })
          effectRow.appendChild(effectSelect)
          lootEl.appendChild(effectRow)

          // Value input
          const valRow = this.createRow('Value')
          const valInput = document.createElement('input')
          valInput.type = 'number'
          valInput.className = 'editor-input editor-input-number'
          valInput.value = String(lootEntry.consumableValue ?? 20)
          valInput.addEventListener('change', () => {
            const v = parseFloat(valInput.value)
            if (!isNaN(v)) lootEntry.consumableValue = v
          })
          valRow.appendChild(valInput)
          lootEl.appendChild(valRow)
        } else {
          // Pickup config
          if (!lootEntry.itemDef) {
            lootEntry.itemDef = { id: 'item', name: 'Item', assetId: 'weapon_sword_fire', kind: 'melee' }
          }
          const def = lootEntry.itemDef

          // Kind dropdown
          const kindRow = this.createRow('Kind')
          const kindSelect = document.createElement('select')
          kindSelect.className = 'editor-input'
          for (const opt of ['melee', 'ranged', 'shield', 'passive']) {
            const el = document.createElement('option')
            el.value = opt
            el.textContent = opt
            if (opt === def.kind) el.selected = true
            kindSelect.appendChild(el)
          }
          kindSelect.addEventListener('change', () => {
            def.kind = kindSelect.value as 'melee' | 'ranged' | 'shield' | 'passive'
            this.showEntity(entityId)
          })
          kindRow.appendChild(kindSelect)
          lootEl.appendChild(kindRow)

          // Name
          const nameRow = this.createRow('Name')
          const nameInput = document.createElement('input')
          nameInput.type = 'text'
          nameInput.className = 'editor-input'
          nameInput.value = def.name
          nameInput.addEventListener('change', () => { def.name = nameInput.value })
          nameRow.appendChild(nameInput)
          lootEl.appendChild(nameRow)

          // Asset dropdown
          const assetRow = this.createRow('Asset')
          const assetSelect = document.createElement('select')
          assetSelect.className = 'editor-input'
          for (const aid of getAssetIds()) {
            const el = document.createElement('option')
            el.value = aid
            el.textContent = aid
            if (aid === def.assetId) el.selected = true
            assetSelect.appendChild(el)
          }
          assetSelect.addEventListener('change', () => { def.assetId = assetSelect.value })
          assetRow.appendChild(assetSelect)
          lootEl.appendChild(assetRow)

          // Damage/Range/Cooldown for melee/ranged
          if (def.kind === 'melee' || def.kind === 'ranged') {
            const dmgRow = this.createRow('Damage')
            const dmgInput = document.createElement('input')
            dmgInput.type = 'number'
            dmgInput.className = 'editor-input editor-input-number'
            dmgInput.value = String(def.damage ?? 10)
            dmgInput.addEventListener('change', () => {
              const v = parseFloat(dmgInput.value)
              if (!isNaN(v)) def.damage = v
            })
            dmgRow.appendChild(dmgInput)
            lootEl.appendChild(dmgRow)

            const rangeRow = this.createRow('Range')
            const rangeInput = document.createElement('input')
            rangeInput.type = 'number'
            rangeInput.className = 'editor-input editor-input-number'
            rangeInput.value = String(def.range ?? 40)
            rangeInput.addEventListener('change', () => {
              const v = parseFloat(rangeInput.value)
              if (!isNaN(v)) def.range = v
            })
            rangeRow.appendChild(rangeInput)
            lootEl.appendChild(rangeRow)

            const cdRow = this.createRow('Cooldown')
            const cdInput = document.createElement('input')
            cdInput.type = 'number'
            cdInput.className = 'editor-input editor-input-number'
            cdInput.value = String(def.cooldown ?? 500)
            cdInput.addEventListener('change', () => {
              const v = parseFloat(cdInput.value)
              if (!isNaN(v)) def.cooldown = v
            })
            cdRow.appendChild(cdInput)
            lootEl.appendChild(cdRow)
          }
        }

        this.content.appendChild(lootEl)
      }

      // Add Loot button
      const addLootBtn = document.createElement('button')
      addLootBtn.className = 'editor-btn editor-btn-secondary'
      addLootBtn.textContent = '+ Add Loot'
      addLootBtn.addEventListener('click', () => {
        chest.loot.push({ itemType: 'consumable', consumableEffect: 'heal', consumableValue: 20 })
        this.showEntity(entityId)
      })
      this.content.appendChild(addLootBtn)
    }

    // --- Layer ---
    const layer = entity.components.get('layer') as LayerComponent | undefined
    if (layer) {
      this.addSection('Layer')
      this.addTextInput('Layer ID', layer.layerId, (val) => { layer.layerId = val })
      // Game mode for this layer
      const layerDef = this.world.layerManager.getLayer(layer.layerId)
      if (layerDef) {
        this.addDropdown('Game Mode', ['platformer', 'topdown'], layerDef.gameMode, (val) => {
          layerDef.gameMode = val as 'platformer' | 'topdown'
        })
      }
    }

    // --- Add component buttons ---
    if (!patrol) {
      const addPatrolBtn = document.createElement('button')
      addPatrolBtn.className = 'editor-btn editor-btn-secondary'
      addPatrolBtn.textContent = '+ Add Patrol'
      addPatrolBtn.addEventListener('click', () => {
        this.world.addComponent(entityId, {
          type: 'patrol',
          waypoints: [],
          currentIndex: 0,
          speed: 60,
          loop: false,
          direction: 1,
        })
        this.showEntity(entityId)
      })
      this.content.appendChild(addPatrolBtn)
    }

    if (!door) {
      const addDoorBtn = document.createElement('button')
      addDoorBtn.className = 'editor-btn editor-btn-secondary'
      addDoorBtn.textContent = '+ Add Door'
      addDoorBtn.addEventListener('click', () => {
        this.world.addComponent(entityId, {
          type: 'door',
          destinationId: null,
          bidirectional: false,
        })
        this.showEntity(entityId)
      })
      this.content.appendChild(addDoorBtn)
    }

    if (!consumable) {
      const addConsumableBtn = document.createElement('button')
      addConsumableBtn.className = 'editor-btn editor-btn-secondary'
      addConsumableBtn.textContent = '+ Add Consumable'
      addConsumableBtn.addEventListener('click', () => {
        this.world.addComponent(entityId, {
          type: 'consumable',
          effect: 'heal',
          value: 20,
        })
        this.showEntity(entityId)
      })
      this.content.appendChild(addConsumableBtn)
    }

    if (!chest) {
      const addChestBtn = document.createElement('button')
      addChestBtn.className = 'editor-btn editor-btn-secondary'
      addChestBtn.textContent = '+ Add Chest'
      addChestBtn.addEventListener('click', () => {
        this.world.addComponent(entityId, {
          type: 'chest',
          loot: [{ itemType: 'consumable', consumableEffect: 'heal', consumableValue: 20 }],
          opened: false,
        })
        this.showEntity(entityId)
      })
      this.content.appendChild(addChestBtn)
    }

    if (!layer) {
      const addLayerBtn = document.createElement('button')
      addLayerBtn.className = 'editor-btn editor-btn-secondary'
      addLayerBtn.textContent = '+ Add Layer'
      addLayerBtn.addEventListener('click', () => {
        this.world.addComponent(entityId, {
          type: 'layer',
          layerId: 'default',
        })
        this.showEntity(entityId)
      })
      this.content.appendChild(addLayerBtn)
    }

    // --- Delete button ---
    const spacer = document.createElement('div')
    spacer.style.height = '24px'
    this.content.appendChild(spacer)

    const deleteBtn = document.createElement('button')
    deleteBtn.className = 'editor-btn editor-btn-danger'
    deleteBtn.textContent = 'Delete Entity'
    deleteBtn.addEventListener('click', () => {
      this.world.saveSnapshot()
      this.world.removeEntity(entityId)
      this.onEntityDeleted?.(entityId)
      this.showEntity(null)
    })
    this.content.appendChild(deleteBtn)
  }

  private addSection(label: string): void {
    const section = document.createElement('div')
    section.className = 'context-section'
    section.textContent = label
    this.content.appendChild(section)
  }

  private addTextInput(label: string, value: string, onChange: (val: string) => void): void {
    const row = this.createRow(label)
    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'editor-input'
    input.value = value
    input.addEventListener('change', () => onChange(input.value))
    row.appendChild(input)
    this.content.appendChild(row)
  }

  private addNumberInput(label: string, value: number, onChange: (val: number) => void): void {
    const row = this.createRow(label)
    const input = document.createElement('input')
    input.type = 'number'
    input.className = 'editor-input editor-input-number'
    input.value = String(value)
    input.addEventListener('change', () => {
      const v = parseFloat(input.value)
      if (!isNaN(v)) onChange(v)
    })
    row.appendChild(input)
    this.content.appendChild(row)
  }

  private addCheckbox(label: string, checked: boolean, onChange: (val: boolean) => void): void {
    const row = this.createRow(label)
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.className = 'editor-checkbox'
    input.checked = checked
    input.addEventListener('change', () => onChange(input.checked))
    row.appendChild(input)
    this.content.appendChild(row)
  }

  private addDropdown(label: string, options: string[], value: string, onChange: (val: string) => void): void {
    const row = this.createRow(label)
    const select = document.createElement('select')
    select.className = 'editor-input'
    for (const opt of options) {
      const option = document.createElement('option')
      option.value = opt
      option.textContent = opt
      if (opt === value) option.selected = true
      select.appendChild(option)
    }
    select.addEventListener('change', () => onChange(select.value))
    row.appendChild(select)
    this.content.appendChild(row)
  }

  private addRange(label: string, value: number, min: number, max: number, step: number, onChange: (val: number) => void): void {
    const row = this.createRow(label)
    const input = document.createElement('input')
    input.type = 'range'
    input.className = 'editor-range'
    input.min = String(min)
    input.max = String(max)
    input.step = String(step)
    input.value = String(value)

    const display = document.createElement('span')
    display.className = 'editor-range-value'
    display.textContent = String(value)

    input.addEventListener('input', () => {
      const v = parseFloat(input.value)
      display.textContent = String(v)
      onChange(v)
    })

    row.appendChild(input)
    row.appendChild(display)
    this.content.appendChild(row)
  }

  private addReadOnlyText(label: string, value: string): void {
    const row = this.createRow(label)
    const span = document.createElement('span')
    span.className = 'editor-readonly'
    span.textContent = value
    row.appendChild(span)
    this.content.appendChild(row)
  }

  private addHint(text: string): void {
    const hint = document.createElement('div')
    hint.className = 'context-hint'
    hint.textContent = text
    this.content.appendChild(hint)
  }

  private addBehaviorRule(rule: BehaviorRule, behavior: BehaviorComponent, entityId: string): void {
    const ruleEl = document.createElement('div')
    ruleEl.className = 'behavior-rule'

    // Parse existing trigger
    const triggerParts = rule.trigger.split(' ')
    const triggerType = triggerParts[0] || ''
    const triggerParam = triggerParts.slice(1).join(' ')

    // Parse existing action
    const actionParts = rule.action.split(' ')
    const actionType = actionParts[0] || ''
    const actionParam = actionParts.slice(1).join(' ')

    // --- Trigger row ---
    const triggerLabel = document.createElement('div')
    triggerLabel.className = 'behavior-rule-label'
    triggerLabel.textContent = 'WHEN'
    ruleEl.appendChild(triggerLabel)

    const triggerRow = document.createElement('div')
    triggerRow.className = 'behavior-rule-row'

    const triggerSelect = document.createElement('select')
    triggerSelect.className = 'editor-input behavior-rule-select'
    const triggerOptions = [
      { value: '', label: 'Select trigger...' },
      { value: 'on_proximity', label: 'Near Player' },
      { value: 'on_collision', label: 'Collides With' },
      { value: 'on_interval', label: 'Every N ms' },
      { value: 'on_low_health', label: 'Low Health (<30%)' },
      { value: 'always', label: 'Always' },
    ]
    for (const opt of triggerOptions) {
      const el = document.createElement('option')
      el.value = opt.value
      el.textContent = opt.label
      if (opt.value === triggerType) el.selected = true
      triggerSelect.appendChild(el)
    }
    triggerRow.appendChild(triggerSelect)

    // Trigger param input (context-dependent)
    const triggerParamInput = document.createElement('input')
    triggerParamInput.type = 'text'
    triggerParamInput.className = 'editor-input behavior-rule-param'
    const needsTriggerParam = triggerType === 'on_proximity' || triggerType === 'on_collision' || triggerType === 'on_interval'
    triggerParamInput.style.display = needsTriggerParam ? '' : 'none'

    if (triggerType === 'on_proximity') {
      triggerParamInput.placeholder = 'Distance (e.g. 100)'
      triggerParamInput.value = triggerParam || '100'
    } else if (triggerType === 'on_collision') {
      triggerParamInput.placeholder = 'Target (player, any)'
      triggerParamInput.value = triggerParam || 'player'
    } else if (triggerType === 'on_interval') {
      triggerParamInput.placeholder = 'Interval ms (e.g. 2000)'
      triggerParamInput.value = triggerParam || '2000'
    }

    triggerRow.appendChild(triggerParamInput)
    ruleEl.appendChild(triggerRow)

    // Update trigger string on change
    const updateTrigger = () => {
      const type = triggerSelect.value
      const showParam = type === 'on_proximity' || type === 'on_collision' || type === 'on_interval'
      triggerParamInput.style.display = showParam ? '' : 'none'

      if (type === 'on_proximity') {
        triggerParamInput.placeholder = 'Distance (e.g. 100)'
        if (!triggerParamInput.value || triggerParamInput.value === 'player') triggerParamInput.value = '100'
      } else if (type === 'on_collision') {
        triggerParamInput.placeholder = 'Target (player, any)'
        if (!triggerParamInput.value || /^\d+$/.test(triggerParamInput.value)) triggerParamInput.value = 'player'
      } else if (type === 'on_interval') {
        triggerParamInput.placeholder = 'Interval ms (e.g. 2000)'
        if (!triggerParamInput.value || triggerParamInput.value === 'player') triggerParamInput.value = '2000'
      }

      if (showParam) {
        rule.trigger = `${type} ${triggerParamInput.value}`
      } else {
        rule.trigger = type
      }
    }
    triggerSelect.addEventListener('change', updateTrigger)
    triggerParamInput.addEventListener('change', updateTrigger)

    // --- Action row ---
    const actionLabel = document.createElement('div')
    actionLabel.className = 'behavior-rule-label'
    actionLabel.textContent = 'DO'
    ruleEl.appendChild(actionLabel)

    const actionRow = document.createElement('div')
    actionRow.className = 'behavior-rule-row'

    const actionSelect = document.createElement('select')
    actionSelect.className = 'editor-input behavior-rule-select'
    const actionOptions = [
      { value: '', label: 'Select action...' },
      { value: 'move_towards', label: 'Chase Target' },
      { value: 'flee_from', label: 'Flee From' },
      { value: 'hurt', label: 'Deal Damage' },
      { value: 'say', label: 'Say Text' },
      { value: 'say_voice', label: 'Say (Voice)' },
      { value: 'destroy', label: 'Destroy' },
      { value: 'teleport', label: 'Teleport To' },
      { value: 'set_physics', label: 'Set Physics' },
    ]
    for (const opt of actionOptions) {
      const el = document.createElement('option')
      el.value = opt.value
      el.textContent = opt.label
      if (opt.value === actionType) el.selected = true
      actionSelect.appendChild(el)
    }
    actionRow.appendChild(actionSelect)

    // Action param input
    const actionParamInput = document.createElement('input')
    actionParamInput.type = 'text'
    actionParamInput.className = 'editor-input behavior-rule-param'
    const needsActionParam = actionType !== '' && actionType !== 'always'
    actionParamInput.style.display = needsActionParam ? '' : 'none'

    if (actionType === 'move_towards') {
      actionParamInput.placeholder = 'target speed (e.g. player 80)'
      actionParamInput.value = actionParam || 'player 80'
    } else if (actionType === 'flee_from') {
      actionParamInput.placeholder = 'target speed (e.g. player 100)'
      actionParamInput.value = actionParam || 'player 100'
    } else if (actionType === 'hurt') {
      actionParamInput.placeholder = 'target amount (e.g. other 10)'
      actionParamInput.value = actionParam || 'other 10'
    } else if (actionType === 'say') {
      actionParamInput.placeholder = 'Text to say'
      actionParamInput.value = actionParam || 'Hello!'
    } else if (actionType === 'say_voice') {
      actionParamInput.placeholder = 'NPC type'
      actionParamInput.value = actionParam || 'villager'
    } else if (actionType === 'destroy') {
      actionParamInput.placeholder = 'self'
      actionParamInput.value = actionParam || 'self'
    } else if (actionType === 'teleport') {
      actionParamInput.placeholder = 'x y (e.g. 200 100)'
      actionParamInput.value = actionParam || '0 0'
    } else if (actionType === 'set_physics') {
      actionParamInput.placeholder = 'prop value (e.g. gravity true)'
      actionParamInput.value = actionParam || 'gravity false'
    }

    actionRow.appendChild(actionParamInput)

    // Test Voice button — shown only for say_voice actions
    const testVoiceBtn = document.createElement('button')
    testVoiceBtn.className = 'editor-btn-icon-only test-voice-btn'
    testVoiceBtn.textContent = '\u25B6'
    testVoiceBtn.title = 'Test voice line'
    testVoiceBtn.style.display = actionType === 'say_voice' ? '' : 'none'
    testVoiceBtn.addEventListener('click', () => {
      const npcType = actionParamInput.value.trim() || 'villager'
      if (this.onTestVoice) this.onTestVoice(npcType)
    })
    actionRow.appendChild(testVoiceBtn)

    ruleEl.appendChild(actionRow)

    // Update action string on change
    const updateAction = () => {
      const type = actionSelect.value
      const showParam = type !== ''
      actionParamInput.style.display = showParam ? '' : 'none'
      testVoiceBtn.style.display = type === 'say_voice' ? '' : 'none'

      // Set sensible defaults when switching action type
      if (type === 'move_towards' && !/player|hero/.test(actionParamInput.value)) actionParamInput.value = 'player 80'
      else if (type === 'flee_from' && !/player|hero/.test(actionParamInput.value)) actionParamInput.value = 'player 100'
      else if (type === 'hurt' && !/other|self/.test(actionParamInput.value)) actionParamInput.value = 'other 10'
      else if (type === 'say' && actionParamInput.value.includes(' ') === false) actionParamInput.value = 'Hello!'
      else if (type === 'say_voice') actionParamInput.value = actionParamInput.value || 'villager'
      else if (type === 'destroy') actionParamInput.value = 'self'
      else if (type === 'teleport' && !/\d/.test(actionParamInput.value)) actionParamInput.value = '0 0'
      else if (type === 'set_physics' && !actionParamInput.value.includes('gravity')) actionParamInput.value = 'gravity false'

      if (showParam) {
        rule.action = `${type} ${actionParamInput.value}`
      } else {
        rule.action = type
      }
    }
    actionSelect.addEventListener('change', updateAction)
    actionParamInput.addEventListener('change', updateAction)

    // --- Enable toggle + Delete ---
    const bottomRow = document.createElement('div')
    bottomRow.className = 'behavior-rule-row'

    const enableLabel = document.createElement('label')
    enableLabel.className = 'behavior-rule-enable'
    const enableCheck = document.createElement('input')
    enableCheck.type = 'checkbox'
    enableCheck.className = 'editor-checkbox'
    enableCheck.checked = rule.enabled
    enableCheck.addEventListener('change', () => { rule.enabled = enableCheck.checked })
    enableLabel.appendChild(enableCheck)
    const enableText = document.createElement('span')
    enableText.textContent = ' Enabled'
    enableText.style.fontSize = '11px'
    enableText.style.color = 'var(--text-secondary)'
    enableLabel.appendChild(enableText)
    bottomRow.appendChild(enableLabel)

    const removeBtn = document.createElement('button')
    removeBtn.className = 'editor-btn-icon'
    removeBtn.textContent = '\u00D7'
    removeBtn.title = 'Remove rule'
    removeBtn.style.position = 'static'
    removeBtn.addEventListener('click', () => {
      behavior.rules = behavior.rules.filter((r) => r.id !== rule.id)
      this.showEntity(entityId)
    })
    bottomRow.appendChild(removeBtn)
    ruleEl.appendChild(bottomRow)

    this.content.appendChild(ruleEl)
  }

  private createRow(label: string): HTMLElement {
    const row = document.createElement('div')
    row.className = 'context-row'
    const lbl = document.createElement('label')
    lbl.className = 'context-label'
    lbl.textContent = label
    row.appendChild(lbl)
    return row
  }

  private showGameHub(): void {
    // --- Layers Section ---
    this.addSection('Layers')

    const lm = this.world.layerManager
    const allEntities = this.world.query('position')

    for (const layer of lm.layers) {
      const isActive = layer.id === lm.currentLayerId
      const entityCount = allEntities.filter(e => {
        const lc = e.components.get('layer') as LayerComponent | undefined
        return (lc?.layerId ?? 'default') === layer.id
      }).length

      const card = document.createElement('div')
      card.className = 'layer-card' + (isActive ? ' layer-card-active' : '')

      // Top row: name + entity count
      const topRow = document.createElement('div')
      topRow.className = 'layer-card-top'

      const nameEl = document.createElement('span')
      nameEl.className = 'layer-card-name'
      nameEl.textContent = layer.name

      const countEl = document.createElement('span')
      countEl.className = 'layer-card-count'
      countEl.textContent = `${entityCount}`

      topRow.appendChild(nameEl)
      topRow.appendChild(countEl)

      // Bottom row: game mode toggle + delete
      const bottomRow = document.createElement('div')
      bottomRow.className = 'layer-card-bottom'

      const modeBtn = document.createElement('button')
      modeBtn.className = 'layer-mode-btn'
      modeBtn.textContent = layer.gameMode === 'platformer' ? 'Platformer' : 'Top-Down'
      modeBtn.title = 'Toggle game mode'
      modeBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        const newMode = layer.gameMode === 'platformer' ? 'topdown' : 'platformer'
        this.onLayerGameModeToggle?.(layer.id, newMode)
        this.showEntity(null)
      })

      bottomRow.appendChild(modeBtn)

      // Floor tile picker for topdown layers
      if (layer.gameMode === 'topdown') {
        const tileOptions = ['tile_grass', 'tile_stone', 'tile_dirt', 'tile_sand', 'tile_wood', 'tile_brick', 'tile_ice']
        const tileSelect = document.createElement('select')
        tileSelect.className = 'editor-input'
        tileSelect.title = 'Floor tile'
        tileSelect.style.flex = '1'
        tileSelect.style.minWidth = '0'
        for (const opt of tileOptions) {
          const option = document.createElement('option')
          option.value = opt
          option.textContent = opt.replace('tile_', '')
          if (opt === layer.backgroundTileId) option.selected = true
          tileSelect.appendChild(option)
        }
        tileSelect.addEventListener('click', (e) => e.stopPropagation())
        tileSelect.addEventListener('change', (e) => {
          e.stopPropagation()
          layer.backgroundTileId = tileSelect.value
        })
        bottomRow.appendChild(tileSelect)
      }

      if (layer.id !== 'default') {
        const deleteBtn = document.createElement('button')
        deleteBtn.className = 'editor-btn-icon layer-delete-btn'
        deleteBtn.textContent = '\u00D7'
        deleteBtn.title = 'Delete layer'
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation()
          this.onLayerDelete?.(layer.id)
          this.showEntity(null)
        })
        bottomRow.appendChild(deleteBtn)
      }

      card.appendChild(topRow)
      card.appendChild(bottomRow)

      // Click card to switch layer
      card.addEventListener('click', () => {
        this.onLayerSwitch?.(layer.id)
        this.showEntity(null)
      })

      this.content.appendChild(card)
    }

    // Add Layer button
    const addLayerBtn = document.createElement('button')
    addLayerBtn.className = 'editor-btn editor-btn-secondary'
    addLayerBtn.style.width = '100%'
    addLayerBtn.textContent = '+ Add Layer'
    addLayerBtn.addEventListener('click', () => {
      this.onAddLayer?.()
      this.showEntity(null)
    })
    this.content.appendChild(addLayerBtn)

    // --- Game Rules Section ---
    this.addSection('Game Rules')

    const rulesLabel = document.createElement('div')
    rulesLabel.className = 'game-rules-group-label'
    rulesLabel.textContent = 'PHYSICS'
    this.content.appendChild(rulesLabel)

    this.addNumberInput('Gravity', GAME_CONFIG.physics.gravity, (val) => {
      GAME_CONFIG.physics.gravity = val
      this.onGameRuleChange?.()
    })
    this.addNumberInput('Kill Zone Y', GAME_CONFIG.physics.killZoneY, (val) => {
      GAME_CONFIG.physics.killZoneY = val
      this.onGameRuleChange?.()
    })

    const playerLabel = document.createElement('div')
    playerLabel.className = 'game-rules-group-label'
    playerLabel.textContent = 'PLAYER'
    this.content.appendChild(playerLabel)

    this.addNumberInput('Walk Speed', GAME_CONFIG.player.walkSpeed, (val) => {
      GAME_CONFIG.player.walkSpeed = val
      this.onGameRuleChange?.()
    })
    this.addNumberInput('Jump Velocity', GAME_CONFIG.player.jumpVelocity, (val) => {
      GAME_CONFIG.player.jumpVelocity = val
      this.onGameRuleChange?.()
    })
    this.addNumberInput('Max Jumps', GAME_CONFIG.player.maxJumps, (val) => {
      GAME_CONFIG.player.maxJumps = val
      this.onGameRuleChange?.()
    })

    const editorLabel = document.createElement('div')
    editorLabel.className = 'game-rules-group-label'
    editorLabel.textContent = 'EDITOR'
    this.content.appendChild(editorLabel)

    this.addNumberInput('Grid Size', GAME_CONFIG.editor.gridSize, (val) => {
      GAME_CONFIG.editor.gridSize = val
      this.onGameRuleChange?.()
    })

    // --- World Stats Section ---
    this.addSection('World')

    const totalCount = allEntities.length
    this.addReadOnlyText('Total Entities', String(totalCount))

    for (const layer of lm.layers) {
      const count = allEntities.filter(e => {
        const lc = e.components.get('layer') as LayerComponent | undefined
        return (lc?.layerId ?? 'default') === layer.id
      }).length
      this.addReadOnlyText(layer.name, String(count))
    }
  }
}
