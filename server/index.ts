import { config } from 'dotenv'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// Load .env from project root (one level up from server/)
const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '..', '.env') })

import express from 'express'
import cors from 'cors'
import aiRouter from './routes/ai.js'
import tracesRouter from './routes/traces.js'
import pipelineRouter from './routes/pipeline.js'
import voiceRouter from './routes/voice.js'
import levelsRouter from './routes/levels.js'
import evalRouter from './routes/eval.js'
import charactersRouter from './routes/characters.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.use(aiRouter)
app.use(tracesRouter)
app.use(pipelineRouter)
app.use(voiceRouter)
app.use(levelsRouter)
app.use(evalRouter)
app.use(charactersRouter)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Q-Bit and Build server running on :${PORT}`)
})
