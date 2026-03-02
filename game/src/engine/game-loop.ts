export class GameLoop {
  isRunning = false
  private animFrameId = 0
  private lastTime = 0

  constructor(
    private onUpdate: (dt: number) => void,
    private onRender: (dt: number) => void,
  ) {}

  start(): void {
    if (this.isRunning) return
    this.isRunning = true
    this.lastTime = performance.now()
    this.animFrameId = requestAnimationFrame((t) => this.frame(t))
  }

  stop(): void {
    this.isRunning = false
    cancelAnimationFrame(this.animFrameId)
  }

  private frame(time: number): void {
    if (!this.isRunning) return
    const dt = Math.min(time - this.lastTime, 50) // Cap dt to avoid spiral
    this.lastTime = time
    this.onUpdate(dt)
    this.onRender(dt)
    this.animFrameId = requestAnimationFrame((t) => this.frame(t))
  }
}
