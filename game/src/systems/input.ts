import type { World } from '../ecs/world'
import type { PhysicsComponent } from '../ecs/types'
import { GAME_CONFIG } from '../config/game-config'
import { getEquipSpeedMultiplier } from './combat'

export class InputSystem {
  private keys = new Set<string>()
  private justPressedKeys = new Set<string>()
  private walkSpeed = GAME_CONFIG.player.walkSpeed
  private jumpVelocity = GAME_CONFIG.player.jumpVelocity
  private playerId: string | null = null
  private enabled = true
  private gameMode: 'platformer' | 'topdown' = 'platformer'

  private speedMultiplier = 1
  private jumpCount = 0
  private coyoteTimer = 0
  private wasGrounded = false
  private jumpPressed = false
  private prevJumpPressed = false

  constructor() {
    window.addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) this.justPressedKeys.add(e.code)
      this.keys.add(e.code)
    })
    window.addEventListener('keyup', (e) => this.keys.delete(e.code))
  }

  setPlayer(id: string): void { this.playerId = id }
  setWalkSpeed(v: number): void { this.walkSpeed = v }
  setJumpVelocity(v: number): void { this.jumpVelocity = v }
  setEnabled(enabled: boolean): void { this.enabled = enabled }
  isKeyDown(code: string): boolean { return this.keys.has(code) }
  justPressed(code: string): boolean { return this.justPressedKeys.has(code) }
  endFrame(): void { this.justPressedKeys.clear() }

  setGameMode(mode: 'platformer' | 'topdown'): void {
    if (this.gameMode !== mode) {
      this.gameMode = mode
      // Reset jump state on mode switch
      this.jumpCount = 0
      this.coyoteTimer = 0
      this.wasGrounded = false
      this.jumpPressed = false
      this.prevJumpPressed = false
    }
  }

  getGameMode(): 'platformer' | 'topdown' {
    return this.gameMode
  }

  update(world: World): void {
    if (!this.enabled || !this.playerId) return
    const phys = world.getComponent(this.playerId, 'physics') as PhysicsComponent | undefined
    if (!phys) return

    // If entity has a moveTo component, let MoveToSystem drive unless player presses a key
    const hasMoveTo = !!world.getComponent(this.playerId, 'moveTo')
    if (hasMoveTo) {
      const moving = this.keys.has('ArrowLeft') || this.keys.has('ArrowRight')
        || this.keys.has('ArrowUp') || this.keys.has('ArrowDown')
        || this.keys.has('KeyA') || this.keys.has('KeyD')
        || this.keys.has('KeyW') || this.keys.has('KeyS')
      if (moving) {
        world.removeComponent(this.playerId, 'moveTo')
      } else {
        return // let moveTo system handle movement
      }
    }

    // Apply speed boost from equipped items
    this.speedMultiplier = getEquipSpeedMultiplier(world, this.playerId)

    if (this.gameMode === 'topdown') {
      this.updateTopDown(phys)
    } else {
      this.updatePlatformer(phys)
    }
  }

  private updateTopDown(phys: PhysicsComponent): void {
    const speed = this.walkSpeed * this.speedMultiplier
    let vx = 0
    let vy = 0
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) vx -= speed
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) vx += speed
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) vy -= speed
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) vy += speed
    phys.velocityX = vx
    phys.velocityY = vy
  }

  private updatePlatformer(phys: PhysicsComponent): void {
    const speed = this.walkSpeed * this.speedMultiplier
    let vx = 0
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) vx -= speed
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) vx += speed
    phys.velocityX = vx

    const grounded = Math.abs(phys.velocityY) < 1

    // Reset jumps when landing
    if (grounded) {
      this.jumpCount = 0
      this.coyoteTimer = GAME_CONFIG.player.coyoteFrames
    } else if (this.wasGrounded && !grounded) {
      if (this.jumpCount === 0) {
        this.coyoteTimer = GAME_CONFIG.player.coyoteFrames
      }
    }

    // Tick coyote timer
    if (!grounded && this.coyoteTimer > 0) {
      this.coyoteTimer--
    }

    this.jumpPressed = this.keys.has('ArrowUp') || this.keys.has('KeyW') || this.keys.has('Space')
    const justPressed = this.jumpPressed && !this.prevJumpPressed

    if (justPressed) {
      const canCoyoteJump = this.coyoteTimer > 0 && this.jumpCount === 0
      const canMultiJump = this.jumpCount < GAME_CONFIG.player.maxJumps

      if (canCoyoteJump || canMultiJump) {
        phys.velocityY = this.jumpVelocity
        this.jumpCount++
        this.coyoteTimer = 0
      }
    }

    this.prevJumpPressed = this.jumpPressed
    this.wasGrounded = grounded
  }
}
