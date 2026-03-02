/* eslint-disable @typescript-eslint/no-explicit-any */
import { SettingsPanel } from '../ui/settings-panel'

export class VoiceService {
  private recognition: any = null
  private audioContext: AudioContext | null = null
  private audioCache = new Map<string, AudioBuffer>()
  private currentSource: AudioBufferSourceNode | null = null

  constructor() {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognitionCtor) {
      this.recognition = new SpeechRecognitionCtor()
      this.recognition.continuous = false
      this.recognition.interimResults = false
      this.recognition.lang = 'en-US'
    }
  }

  get isSupported(): boolean {
    return this.recognition !== null
  }

  get isSpeaking(): boolean {
    return this.currentSource !== null
  }

  async startListening(): Promise<string> {
    if (!this.recognition) throw new Error('SpeechRecognition not supported')

    return new Promise((resolve, reject) => {
      this.recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript
        resolve(text)
      }
      this.recognition.onerror = (event: any) => reject(event.error)
      this.recognition.start()
    })
  }

  stopListening(): void {
    this.recognition?.stop()
  }

  async speak(text: string, voiceId?: string): Promise<void> {
    try {
      if (!this.audioContext) this.audioContext = new AudioContext()

      // Check cache first
      const cacheKey = `${voiceId ?? 'default'}:${text}`
      let audioBuffer = this.audioCache.get(cacheKey)

      if (!audioBuffer) {
        const body: Record<string, string> = { text }
        if (voiceId) body.voiceId = voiceId

        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        const elevenlabsKey = SettingsPanel.getApiKeys().elevenlabs
        if (elevenlabsKey) headers['X-ElevenLabs-Key'] = elevenlabsKey

        const res = await fetch('/api/voice/tts', {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          console.warn('TTS failed, falling back to silent')
          return
        }

        const arrayBuffer = await res.arrayBuffer()
        audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
        this.audioCache.set(cacheKey, audioBuffer)
      }

      const source = this.audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(this.audioContext.destination)
      source.onended = () => {
        if (this.currentSource === source) this.currentSource = null
      }
      this.currentSource = source
      source.start()
    } catch {
      console.warn('TTS unavailable')
    }
  }
}
