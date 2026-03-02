export type EntityId = string

export interface Component {
  type: string
}

export interface PositionComponent extends Component {
  type: 'position'
  x: number
  y: number
}

export interface SpriteComponent extends Component {
  type: 'sprite'
  assetId: string
  width: number
  height: number
  flipX?: boolean
  hueShift?: number
}

export interface PhysicsComponent extends Component {
  type: 'physics'
  velocityX: number
  velocityY: number
  gravity: boolean
  solid: boolean
}

export interface Waypoint { x: number; y: number }

export interface HealthComponent extends Component {
  type: 'health'
  hp: number
  maxHp: number
  invulnerableTimer: number
  spawnX: number
  spawnY: number
  respawnDelay: number
  deadTimer: number
}

export interface PatrolComponent extends Component {
  type: 'patrol'
  waypoints: Waypoint[]
  currentIndex: number
  speed: number
  loop: boolean
  direction: 1 | -1
}

export interface BehaviorRule {
  id: string
  description: string
  trigger: string
  action: string
  enabled: boolean
}

export interface BehaviorComponent extends Component {
  type: 'behavior'
  rules: BehaviorRule[]
}

export interface LayerComponent extends Component {
  type: 'layer'
  layerId: string
}

export interface DoorComponent extends Component {
  type: 'door'
  destinationId: string | null
  bidirectional: boolean
}

export interface ItemEffect {
  type: 'lifesteal' | 'thorns' | 'speed_boost' | 'max_hp_bonus'
      | 'crit_boost' | 'poison' | 'fire_damage' | 'dodge'
  value: number
}

export interface ItemDef {
  id: string
  name: string
  assetId: string
  kind: 'melee' | 'ranged' | 'shield' | 'passive'
  damage?: number
  range?: number
  cooldown?: number
  projectileAssetId?: string
  critChance?: number
  damageBonus?: number
  defense?: number
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  effect?: ItemEffect
}

export interface FacingComponent extends Component {
  type: 'facing'
  direction: 'left' | 'right' | 'up' | 'down'
}

export interface EquipmentComponent extends Component {
  type: 'equipment'
  slots: {
    weapon: ItemDef | null
    armor: ItemDef | null
    accessory: ItemDef | null
  }
}

export interface InventoryComponent extends Component {
  type: 'inventory'
  items: (ItemDef | null)[]
  capacity: number
}

export interface PickupComponent extends Component {
  type: 'pickup'
  itemDef: ItemDef
}

export interface ConsumableComponent extends Component {
  type: 'consumable'
  effect: 'heal' | 'speed' | 'ammo' | 'score'
  value: number
}

export interface VoiceLineComponent extends Component {
  type: 'voiceLine'
  text: string
}

export interface MoveToComponent extends Component {
  type: 'moveTo'
  targetX: number
  targetY: number
  speed: number
}

export interface ChestLootEntry {
  itemType: 'consumable' | 'pickup'
  consumableEffect?: 'heal' | 'speed' | 'ammo' | 'score'
  consumableValue?: number
  itemDef?: ItemDef
}

export interface ChestComponent extends Component {
  type: 'chest'
  loot: ChestLootEntry[]
  opened: boolean
}

export type AnyComponent =
  | PositionComponent
  | SpriteComponent
  | PhysicsComponent
  | BehaviorComponent
  | HealthComponent
  | PatrolComponent
  | LayerComponent
  | DoorComponent
  | FacingComponent
  | EquipmentComponent
  | InventoryComponent
  | PickupComponent
  | ConsumableComponent
  | VoiceLineComponent
  | MoveToComponent
  | ChestComponent

export interface Entity {
  id: EntityId
  name: string
  components: Map<string, AnyComponent>
  locked?: boolean
}
