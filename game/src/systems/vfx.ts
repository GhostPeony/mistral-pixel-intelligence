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

export interface ChestPrompt {
  entityId: string
  x: number
  y: number
  width: number
}

export interface Burst {
  x: number
  y: number
  age: number
  lifetime: number
}

export interface ItemGlow {
  entityId: string
  color: string
  age: number
}

export interface DeathPixel {
  x: number; y: number
  vx: number; vy: number
  color: string
  grounded: boolean
  groundY: number
}

export interface PixelExplosion {
  pixels: DeathPixel[]
  age: number
  lifetime: number // ms — pixels linger as pile then fade
}

export class VFXSystem {
  floatingTexts: FloatingText[] = []
  slashArcs: SlashArc[] = []
  pickupPrompts: PickupPrompt[] = []
  itemToasts: ItemToast[] = []
  speechBubbles: SpeechBubble[] = []
  itemGlows: ItemGlow[] = []
  chestPrompts: ChestPrompt[] = []
  bursts: Burst[] = []
  pixelExplosions: PixelExplosion[] = []
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

  addCritNumber(x: number, y: number, damage: number): void {
    this.floatingTexts.push({
      x: x + (Math.random() - 0.5) * 12,
      y: y - 8,
      text: `CRIT! -${damage}`,
      color: '#FFD700',
      age: 0,
      lifetime: 1000,
      velocityY: -50,
      fontSize: 14,
    })
  }

  addMissText(x: number, y: number): void {
    this.floatingTexts.push({
      x: x + (Math.random() - 0.5) * 12,
      y: y - 4,
      text: 'MISS',
      color: '#AAAAAA',
      age: 0,
      lifetime: 600,
      velocityY: -30,
      fontSize: 11,
    })
  }

  addItemGlow(entityId: string, color: string): void {
    this.itemGlows.push({ entityId, color, age: 0 })
  }

  addPixelExplosion(worldX: number, worldY: number, spriteWidth: number, spriteHeight: number, pixels: string[][]): void {
    const deathPixels: DeathPixel[] = []
    const groundY = worldY + spriteHeight // ground level = bottom of entity
    // Scale factor: sprite pixels → world pixels
    const scaleX = spriteWidth / (pixels[0]?.length || 1)
    const scaleY = spriteHeight / pixels.length
    for (let row = 0; row < pixels.length; row++) {
      for (let col = 0; col < (pixels[row]?.length || 0); col++) {
        const color = pixels[row][col]
        if (!color) continue // transparent
        deathPixels.push({
          x: worldX + col * scaleX,
          y: worldY + row * scaleY,
          vx: (Math.random() - 0.5) * 120,
          vy: -(Math.random() * 80 + 40),
          color,
          grounded: false,
          groundY: groundY + Math.random() * 4 - 2, // slight variation
        })
      }
    }
    this.pixelExplosions.push({ pixels: deathPixels, age: 0, lifetime: 3000 })
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

  addToast(text: string, lifetime = 2000): void {
    this.itemToasts.push({ text, age: 0, lifetime })
  }

  addItemToast(itemName: string): void {
    this.addToast(`Picked up ${itemName}`)
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

  setChestPrompts(prompts: ChestPrompt[]): void {
    this.chestPrompts = prompts
  }

  addBurst(x: number, y: number): void {
    this.bursts.push({ x, y, age: 0, lifetime: 400 })
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

    // Age item glows (persist until entity is removed)
    for (const glow of this.itemGlows) {
      glow.age += dt
    }

    // Age bursts
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      this.bursts[i].age += dt
      if (this.bursts[i].age >= this.bursts[i].lifetime) this.bursts.splice(i, 1)
    }

    // Update pixel explosions
    const dtSec = dt / 1000
    for (let i = this.pixelExplosions.length - 1; i >= 0; i--) {
      const explosion = this.pixelExplosions[i]
      explosion.age += dt
      if (explosion.age >= explosion.lifetime) {
        this.pixelExplosions.splice(i, 1)
        continue
      }
      for (const p of explosion.pixels) {
        if (p.grounded) continue
        p.vy += 300 * dtSec // gravity
        p.x += p.vx * dtSec
        p.y += p.vy * dtSec
        if (p.y >= p.groundY) {
          p.y = p.groundY
          p.grounded = true
        }
      }
    }
  }

  /** Remove glow for a specific entity (called when entity is collected/removed). */
  removeItemGlow(entityId: string): void {
    this.itemGlows = this.itemGlows.filter(g => g.entityId !== entityId)
  }
}
