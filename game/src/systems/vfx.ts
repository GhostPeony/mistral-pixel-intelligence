/**
 * Visual Effects System
 * Manages transient visual effects: damage numbers, slash arcs, pickup prompts, toasts.
 * The renderer reads from this each frame and draws the active effects.
 */

export interface FloatingText {
  x: number
  y: number
  text: string
  color: string
  age: number      // ms elapsed
  lifetime: number // ms total
  velocityY: number
  fontSize: number
}

export interface SlashArc {
  x: number
  y: number
  radius: number
  startAngle: number
  endAngle: number
  age: number
  lifetime: number
  color: string
  direction: 'left' | 'right'
}

export interface PickupPrompt {
  entityId: string
  x: number
  y: number
  width: number
}

export interface ItemToast {
  text: string
  age: number
  lifetime: number
}

export interface SpeechBubble {
  entityId: string
  text: string
  age: number
  lifetime: number
}

export class VFXSystem {
  floatingTexts: FloatingText[] = []
  slashArcs: SlashArc[] = []
  pickupPrompts: PickupPrompt[] = []
  itemToasts: ItemToast[] = []
  speechBubbles: SpeechBubble[] = []
  /** Entity IDs currently flashing (invulnerable) */
  flashingEntities = new Set<string>()

  addDamageNumber(x: number, y: number, damage: number): void {
    this.floatingTexts.push({
      x: x + (Math.random() - 0.5) * 12,
      y: y - 4,
      text: `-${damage}`,
      color: '#F44336',
      age: 0,
      lifetime: 800,
      velocityY: -40,
      fontSize: 12,
    })
  }

  addHealNumber(x: number, y: number, amount: number): void {
    this.floatingTexts.push({
      x: x + (Math.random() - 0.5) * 8,
      y: y - 4,
      text: `+${amount}`,
      color: '#4CAF50',
      age: 0,
      lifetime: 800,
      velocityY: -35,
      fontSize: 11,
    })
  }

  addSlashArc(x: number, y: number, direction: 'left' | 'right', range: number): void {
    this.slashArcs.push({
      x,
      y,
      radius: range,
      startAngle: direction === 'right' ? -Math.PI / 3 : Math.PI - Math.PI / 3,
      endAngle: direction === 'right' ? Math.PI / 3 : Math.PI + Math.PI / 3,
      age: 0,
      lifetime: 200,
      color: '#FDF6F0',
      direction,
    })
  }

  addItemToast(itemName: string): void {
    this.itemToasts.push({
      text: `Picked up ${itemName}`,
      age: 0,
      lifetime: 2000,
    })
  }

  addSpeechBubble(entityId: string, text: string, lifetime: number = 3500): void {
    // Replace any existing bubble for this entity
    const idx = this.speechBubbles.findIndex(b => b.entityId === entityId)
    if (idx !== -1) this.speechBubbles.splice(idx, 1)
    this.speechBubbles.push({ entityId, text, age: 0, lifetime })
  }

  setPickupPrompts(prompts: PickupPrompt[]): void {
    this.pickupPrompts = prompts
  }

  setFlashing(entityId: string, flashing: boolean): void {
    if (flashing) this.flashingEntities.add(entityId)
    else this.flashingEntities.delete(entityId)
  }

  isFlashing(entityId: string): boolean {
    return this.flashingEntities.has(entityId)
  }

  update(dt: number): void {
    // Age floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i]
      ft.age += dt
      ft.y += ft.velocityY * (dt / 1000)
      if (ft.age >= ft.lifetime) this.floatingTexts.splice(i, 1)
    }

    // Age slash arcs
    for (let i = this.slashArcs.length - 1; i >= 0; i--) {
      const sa = this.slashArcs[i]
      sa.age += dt
      if (sa.age >= sa.lifetime) this.slashArcs.splice(i, 1)
    }

    // Age item toasts
    for (let i = this.itemToasts.length - 1; i >= 0; i--) {
      const toast = this.itemToasts[i]
      toast.age += dt
      if (toast.age >= toast.lifetime) this.itemToasts.splice(i, 1)
    }

    // Age speech bubbles
    for (let i = this.speechBubbles.length - 1; i >= 0; i--) {
      const bubble = this.speechBubbles[i]
      bubble.age += dt
      if (bubble.age >= bubble.lifetime) this.speechBubbles.splice(i, 1)
    }
  }
}
