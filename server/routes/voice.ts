import { Router } from 'express'

const router = Router()
const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY

router.post('/api/voice/tts', async (req, res) => {
  if (!ELEVENLABS_KEY) {
    return res.status(503).json({ error: 'ELEVENLABS_API_KEY not configured' })
  }

  const { text, voiceId = 'EXAVITQu4vr4xnSDxMaL' } = req.body // Default: "Sarah"

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    })

    if (!response.ok) {
      return res.status(response.status).json({ error: 'TTS failed' })
    }

    res.set('Content-Type', 'audio/mpeg')
    const buffer = await response.arrayBuffer()
    res.send(Buffer.from(buffer))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ error: message })
  }
})

export default router
