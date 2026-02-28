import express from 'express'
import cors from 'cors'
import aiRouter from './routes/ai.js'
import tracesRouter from './routes/traces.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.use(aiRouter)
app.use(tracesRouter)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Mistral Maker server running on :${PORT}`)
})
