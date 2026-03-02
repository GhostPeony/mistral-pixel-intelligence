import { Router } from 'express'
import { BenchmarkRunner } from '../eval/runner.js'
import { compareResults } from '../eval/comparator.js'
import type { EvalConfig, BenchmarkResult } from '../eval/types.js'
import { DEFAULT_EVAL_CONFIG } from '../eval/types.js'

const router = Router()
const runner = new BenchmarkRunner()

// In-memory store of benchmark results
const results = new Map<string, BenchmarkResult>()

router.post('/api/eval/run', async (req, res) => {
  const { modelId, config } = req.body as {
    modelId?: string
    config?: Partial<EvalConfig>
  }

  if (!modelId) {
    return res.status(400).json({ error: 'modelId is required' })
  }

  const evalConfig: EvalConfig = {
    ...DEFAULT_EVAL_CONFIG,
    ...config,
  }

  try {
    const result = await runner.run(modelId, evalConfig)
    results.set(result.id, result)
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/api/eval/status/:id', (req, res) => {
  const result = results.get(req.params.id)
  if (result) {
    return res.json({ status: 'completed', result })
  }

  const progress = runner.getProgress()
  if (progress.status === 'running') {
    return res.json({ status: 'running', progress })
  }

  res.json({ status: 'idle', progress })
})

router.get('/api/eval/results', (_req, res) => {
  const all = Array.from(results.values())
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  res.json(all)
})

router.get('/api/eval/compare', (req, res) => {
  const { a, b } = req.query as { a?: string; b?: string }

  if (!a || !b) {
    return res.status(400).json({ error: 'Query params a and b (result IDs) are required' })
  }

  const resultA = results.get(a)
  const resultB = results.get(b)

  if (!resultA) return res.status(404).json({ error: `Result ${a} not found` })
  if (!resultB) return res.status(404).json({ error: `Result ${b} not found` })

  const comparison = compareResults(resultA, resultB)
  res.json(comparison)
})

export default router
