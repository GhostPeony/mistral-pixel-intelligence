/**
 * SfxService — generates and caches sound effects via ElevenLabs Sound Generation API.
 *
 * Each sound is described by a text prompt (e.g. "sword swing whoosh").
 * Audio is fetched once, cached as an AudioBuffer, and replayed instantly from cache.
 */

export type SfxId = 'sword_swing' | 'hit' | 'crit_hit' | 'dodge' | 'death'

interface SfxDef {
  prompt: string
  duration: number
  influence: number
  volume: number
}

const SFX_DEFS: Record<SfxId, SfxDef> = {
  sword_swing: {
    prompt: 'fast sword swing whoosh, short, fantasy game',
    duration: 0.6,
    influence: 0.5,
    volume: 0.5,
  },
  hit: {
    prompt: 'melee hit impact, flesh thud, short, fantasy rpg',
    duration: 0.5,
    influence: 0.5,
    volume: 0.6,
  },
  crit_hit: {
    prompt: 'powerful critical hit impact, sharp metal crunch, short, fantasy rpg',
    duration: 0.7,
    influence: 0.5,
    volume: 0.8,
  },
  dodge: {
    prompt: 'quick dodge whoosh, miss, short swipe of air, fantasy rpg',
    duration: 0.5,
    influence: 0.4,
    volume: 0.4,
  },
  death: {
    prompt: 'enemy defeated, small creature death sound, short grunt, fantasy rpg',
    duration: 0.8,
    influence: 0.4,
    volume: 0.6,
  },
}

export class SfxService {
  private audioContext: AudioContext | null = null
  private cache = new Map<SfxId, AudioBuffer>()
  private pending = new Map<SfxId, Promise<AudioBuffer | null>>()
  private enabled = true

  setEnabled(on: boolean): void {
    this.enabled = on
  }

  /**
   * Play a sound effect. First call fetches from ElevenLabs and caches;
   * subsequent calls replay from cache instantly.
   */
  play(id: SfxId): void {
    if (!this.enabled) return

    const cached = this.cache.get(id)
    if (cached) {
      this.playBuffer(cached, SFX_DEFS[id].volume)
      return
    }

    // Fetch in background — won't play the first time but will be ready for next
    if (!this.pending.has(id)) {
      const promise = this.fetchSfx(id)
      this.pending.set(id, promise)
      promise.then((buf) => {
        this.pending.delete(id)
        if (buf) {
          this.cache.set(id, buf)
          // Play it now that it's ready (first trigger gets sound too, just slightly delayed)
          this.playBuffer(buf, SFX_DEFS[id].volume)
        }
      })
    }
  }

  /** Pre-fetch all SFX so they're cached before first use. */
  async warmup(): Promise<void> {
    const ids = Object.keys(SFX_DEFS) as SfxId[]
    await Promise.allSettled(ids.map(async (id) => {
      if (this.cache.has(id)) return
      const buf = await this.fetchSfx(id)
      if (buf) this.cache.set(id, buf)
    }))
  }

  private async fetchSfx(id: SfxId): Promise<AudioBuffer | null> {
    try {
      if (!this.audioContext) this.audioContext = new AudioContext()
      const def = SFX_DEFS[id]

      const res = await fetch('/api/voice/sfx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: def.prompt,
          duration_seconds: def.duration,
          prompt_influence: def.influence,
        }),
      })

      if (!res.ok) {
        console.warn(`SFX fetch failed for "${id}": ${res.status}`)
        return null
      }

      const arrayBuffer = await res.arrayBuffer()
      return await this.audioContext.decodeAudioData(arrayBuffer)
    } catch {
      console.warn(`SFX unavailable for "${id}"`)
      return null
    }
  }

  private playBuffer(buffer: AudioBuffer, volume: number): void {
    if (!this.audioContext) this.audioContext = new AudioContext()
    const source = this.audioContext.createBufferSource()
    source.buffer = buffer

    const gain = this.audioContext.createGain()
    gain.gain.value = volume
    source.connect(gain)
    gain.connect(this.audioContext.destination)

    source.start()
  }
}
