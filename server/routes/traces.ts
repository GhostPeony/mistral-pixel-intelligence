import { Router } from 'express'
import { appendFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { scoreTrace, classifyTier } from '../pipeline/scorer.js'

const router = Router()
const DATA_DIR = join(process.cwd(), '.mistral-maker')
const TRACES_FILE = join(DATA_DIR, 'traces.jsonl')

// Ensure directory exists
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

router.post('/api/traces', (req, res) => {
  const trace = req.body
  trace.id = `trace_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  // Score at ingestion — single source of truth for JSONL and Weave
  try {
    const scores = scoreTrace(trace)
    const tier = classifyTier(scores.overall, trace.attempts)
    trace.score = scores.overall
    trace.tier = tier
    trace.scores = scores
  } catch {
    // Scoring failed — store trace anyway with no score
  }

  appendFileSync(TRACES_FILE, JSON.stringify(trace) + '\n')

  // Forward to Weave sidecar (fire-and-forget)
  const sidecarUrl = process.env.WEAVE_SIDECAR_URL || 'http://localhost:3002'
  fetch(`${sidecarUrl}/trace`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(trace),
  }).catch(() => {
    // Sidecar offline — traces still saved to JSONL
  })

  res.json({ id: trace.id, tier: trace.tier, score: trace.score, count: countTraces() })
})

router.get('/api/traces', (_req, res) => {
  if (!existsSync(TRACES_FILE)) return res.json({ traces: [], count: 0 })
  const lines = readFileSync(TRACES_FILE, 'utf-8').trim().split('\n').filter(Boolean)
  const traces = lines.map(l => JSON.parse(l))
  res.json({ traces, count: traces.length })
})

function countTraces(): number {
  if (!existsSync(TRACES_FILE)) return 0
  return readFileSync(TRACES_FILE, 'utf-8').trim().split('\n').filter(Boolean).length
}

export default router
