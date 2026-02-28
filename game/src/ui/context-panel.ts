import type { World } from '../ecs/world'
import type {
  PositionComponent,
  SpriteComponent,
  PhysicsComponent,
  HealthComponent,
  BehaviorComponent,
  BehaviorRule,
} from '../ecs/types'
import { ASSET_IDS } from '../assets/sprites'

export class ContextPanel {
  private container: HTMLElement
  private content: HTMLElement
  private currentEntityId: string | null = null

  /** Called when user deletes entity via context panel button */
  onEntityDeleted: ((id: string) => void) | null = null

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
      const msg = document.createElement('div')
      msg.className = 'context-empty'
      msg.textContent = 'Select an entity'
      this.content.appendChild(msg)
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
      this.addDropdown('Asset', ASSET_IDS, sprite.assetId, (val) => {
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

  private addBehaviorRule(rule: BehaviorRule, behavior: BehaviorComponent, entityId: string): void {
    const ruleEl = document.createElement('div')
    ruleEl.className = 'behavior-rule'

    const triggerInput = document.createElement('input')
    triggerInput.type = 'text'
    triggerInput.className = 'editor-input'
    triggerInput.placeholder = 'Trigger (e.g. on_proximity 100)'
    triggerInput.value = rule.trigger
    triggerInput.addEventListener('change', () => { rule.trigger = triggerInput.value })

    const actionInput = document.createElement('input')
    actionInput.type = 'text'
    actionInput.className = 'editor-input'
    actionInput.placeholder = 'Action (e.g. move_towards player 80)'
    actionInput.value = rule.action
    actionInput.addEventListener('change', () => { rule.action = actionInput.value })

    const removeBtn = document.createElement('button')
    removeBtn.className = 'editor-btn-icon'
    removeBtn.textContent = '\u00D7'
    removeBtn.title = 'Remove rule'
    removeBtn.addEventListener('click', () => {
      behavior.rules = behavior.rules.filter((r) => r.id !== rule.id)
      this.showEntity(entityId)
    })

    ruleEl.appendChild(triggerInput)
    ruleEl.appendChild(actionInput)
    ruleEl.appendChild(removeBtn)
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
}
