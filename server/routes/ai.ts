import { Router } from 'express'

const router = Router()

router.post('/api/ai/chat', async (req, res) => {
  const apiKey = process.env.MISTRAL_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'MISTRAL_API_KEY not set' })
  }

  const { messages, tools, systemPrompt } = req.body

  const fullMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: fullMessages,
        tools,
        tool_choice: 'auto',
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      return res.status(response.status).json({ error: body })
    }

    const data = await response.json()
    res.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ error: message })
  }
})

export default router
