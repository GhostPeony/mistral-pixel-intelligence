/* eslint-disable @typescript-eslint/no-explicit-any */

export class VoiceService {
  private recognition: any = null
  private audioContext: AudioContext | null = null

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

  async speak(text: string): Promise<void> {
    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!res.ok) {
        console.warn('TTS failed, falling back to silent')
        return
      }

      const arrayBuffer = await res.arrayBuffer()
      if (!this.audioContext) this.audioContext = new AudioContext()
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
      const source = this.audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(this.audioContext.destination)
      source.start()
    } catch {
      console.warn('TTS unavailable')
    }
  }
}
