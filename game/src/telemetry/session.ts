export class TelemetrySession {
  private traces: any[] = []
  readonly id: string

  constructor() {
    this.id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }

  async submitTrace(trace: any): Promise<void> {
    this.traces.push(trace)
    await fetch('/api/traces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trace),
    })
  }

  getTraceCount(): number { return this.traces.length }
}
