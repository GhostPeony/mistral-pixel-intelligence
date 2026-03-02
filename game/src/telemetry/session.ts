export class TelemetrySession {
  private traces: any[] = []
  readonly id: string

  constructor() {
    this.id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }

  async submitTrace(trace: any): Promise<void> {
    this.traces.push(trace)
    try {
      const res = await fetch('/api/traces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trace),
      })
      if (!res.ok) {
        console.error(`Trace submission failed: ${res.status}`)
      }
    } catch (err) {
      console.error('Trace submission error:', err)
    }
  }

  getTraceCount(): number { return this.traces.length }
}
