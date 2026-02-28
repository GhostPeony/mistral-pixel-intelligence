import type { EntityId, Entity, AnyComponent } from './types'

type EntityData = { id: string; name: string; components: Record<string, AnyComponent> }

export class World {
  private entities = new Map<EntityId, Entity>()
  private nextId = 1
  private undoStack: string[] = []

  saveSnapshot(): void {
    this.undoStack.push(this.serialize())
    if (this.undoStack.length > 50) this.undoStack.shift()
  }

  undo(): boolean {
    const snapshot = this.undoStack.pop()
    if (!snapshot) return false
    this.restoreFromJson(snapshot)
    return true
  }

  createEntity(name: string): EntityId {
    const id = `entity_${this.nextId++}`
    this.entities.set(id, { id, name, components: new Map() })
    return id
  }

  getEntity(id: EntityId): Entity | undefined {
    return this.entities.get(id)
  }

  removeEntity(id: EntityId): void {
    this.entities.delete(id)
  }

  addComponent(entityId: EntityId, component: AnyComponent): void {
    const entity = this.entities.get(entityId)
    if (!entity) return
    entity.components.set(component.type, component)
  }

  getComponent(entityId: EntityId, type: string): AnyComponent | undefined {
    return this.entities.get(entityId)?.components.get(type)
  }

  removeComponent(entityId: EntityId, type: string): void {
    this.entities.get(entityId)?.components.delete(type)
  }

  query(...componentTypes: string[]): Entity[] {
    const results: Entity[] = []
    for (const entity of this.entities.values()) {
      if (componentTypes.every(t => entity.components.has(t))) {
        results.push(entity)
      }
    }
    return results
  }

  getAllEntities(): Entity[] {
    return Array.from(this.entities.values())
  }

  serialize(): string {
    const entityData: EntityData[] = []
    for (const entity of this.entities.values()) {
      const components: Record<string, AnyComponent> = {}
      for (const [key, comp] of entity.components) {
        components[key] = comp
      }
      entityData.push({ id: entity.id, name: entity.name, components })
    }
    return JSON.stringify({ entities: entityData })
  }

  replaceFromSnapshot(json: string): void {
    const parsed = JSON.parse(json)
    const entityData: EntityData[] = Array.isArray(parsed) ? parsed : parsed.entities
    this.entities.clear()
    for (const item of entityData) {
      this.entities.set(item.id, {
        id: item.id,
        name: item.name,
        components: new Map(Object.entries(item.components)),
      })
      const idNum = parseInt(item.id.split('_')[1])
      if (idNum >= this.nextId) this.nextId = idNum + 1
    }
  }

  private restoreFromJson(json: string): void {
    this.replaceFromSnapshot(json)
  }

  static deserialize(json: string): World {
    const world = new World()
    world.replaceFromSnapshot(json)
    return world
  }
}
