export interface SavedEntityState {
  x: number; y: number; width: number; height: number
  waypoints?: Array<{ x: number; y: number }>
}

export interface LayerDefinition {
  id: string
  name: string
  gameMode: 'platformer' | 'topdown'
  backgroundTileId: string | null
  bounds: {
    minX: number
    maxX: number
    minY: number
    maxY: number
    topSolid: boolean
  }
  savedPlatformerState?: Record<string, SavedEntityState>
  savedTopdownState?: Record<string, SavedEntityState>
}

const ENVIRONMENT_PREFIXES = ['tile_', 'structure_', 'tree_', 'deco_', 'door_']
const CHARACTER_PREFIXES = ['hero_', 'enemy_', 'npc_', 'boss_']

export function categorizeEntity(assetId: string): 'environment' | 'character' | 'item' {
  for (const prefix of ENVIRONMENT_PREFIXES) {
    if (assetId.startsWith(prefix)) return 'environment'
  }
  for (const prefix of CHARACTER_PREFIXES) {
    if (assetId.startsWith(prefix)) return 'character'
  }
  return 'item'
}

export interface LayerTransition {
  active: boolean
  fromLayer: string
  toLayer: string
  progress: number
  duration: number
}

export class LayerManager {
  layers: LayerDefinition[] = []
  currentLayerId = 'default'
  transition: LayerTransition = {
    active: false,
    fromLayer: '',
    toLayer: '',
    progress: 0,
    duration: 600,
  }

  constructor() {
    // Default layer
    this.layers.push({
      id: 'default',
      name: 'Main',
      gameMode: 'platformer',
      backgroundTileId: null,
      bounds: { minX: -10000, maxX: 10000, minY: -10000, maxY: 2000, topSolid: false },
    })
  }

  getLayer(id: string): LayerDefinition | undefined {
    return this.layers.find(l => l.id === id)
  }

  getCurrentLayer(): LayerDefinition {
    return this.getLayer(this.currentLayerId) ?? this.layers[0]
  }

  addLayer(id: string, name: string, gameMode: 'platformer' | 'topdown' = 'platformer'): LayerDefinition {
    const layer: LayerDefinition = {
      id,
      name,
      gameMode,
      backgroundTileId: null,
      bounds: { minX: -10000, maxX: 10000, minY: -10000, maxY: 2000, topSolid: false },
    }
    this.layers.push(layer)
    return layer
  }

  removeLayer(id: string): void {
    if (id === 'default') return // Can't remove default
    this.layers = this.layers.filter(l => l.id !== id)
    if (this.currentLayerId === id) {
      this.currentLayerId = 'default'
    }
  }

  transitionToLayer(targetLayerId: string): void {
    if (this.transition.active) return
    if (targetLayerId === this.currentLayerId) return
    this.transition = {
      active: true,
      fromLayer: this.currentLayerId,
      toLayer: targetLayerId,
      progress: 0,
      duration: 600,
    }
  }

  updateTransition(dt: number): void {
    if (!this.transition.active) return
    this.transition.progress += dt
    if (this.transition.progress >= this.transition.duration) {
      this.currentLayerId = this.transition.toLayer
      this.transition.active = false
      this.transition.progress = 0
    }
  }

  getGameModeForLayer(layerId: string): 'platformer' | 'topdown' {
    return this.getLayer(layerId)?.gameMode ?? 'platformer'
  }

  serialize(): object {
    return {
      layers: this.layers,
      currentLayerId: this.currentLayerId,
    }
  }

  restore(data: { layers?: LayerDefinition[]; currentLayerId?: string }): void {
    if (data.layers) this.layers = data.layers
    if (data.currentLayerId) this.currentLayerId = data.currentLayerId
  }
}
