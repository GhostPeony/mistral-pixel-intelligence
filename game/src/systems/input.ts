import type { World } from '../ecs/world'
import type { PhysicsComponent } from '../ecs/types'

export class InputSystem {
  private keys = new Set<string>()
  private walkSpeed = 200
  private jumpVelocity = -400
  private playerId: string | null = null
  private enabled = true

  constructor() {
    window.addEventListener('keydown', (e) => this.keys.add(e.code))
    window.addEventListener('keyup', (e) => this.keys.delete(e.code))
  }

  setPlayer(id: string): void { this.playerId = id }
  setWalkSpeed(v: number): void { this.walkSpeed = v }
  setJumpVelocity(v: number): void { this.jumpVelocity = v }
  setEnabled(enabled: boolean): void { this.enabled = enabled }
  isKeyDown(code: string): boolean { return this.keys.has(code) }

  update(world: World): void {
    if (!this.enabled || !this.playerId) return
    const phys = world.getComponent(this.playerId, 'physics') as PhysicsComponent | undefined
    if (!phys) return

    let vx = 0
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) vx -= this.walkSpeed
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) vx += this.walkSpeed
    phys.velocityX = vx

    if ((this.keys.has('ArrowUp') || this.keys.has('KeyW') || this.keys.has('Space')) && Math.abs(phys.velocityY) < 1) {
      phys.velocityY = this.jumpVelocity
    }
  }
}
