import { Router } from 'express'
import { DatasetBuilder } from '../pipeline/dataset-builder.js'
import { Workspace } from '../pipeline/workspace.js'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { scoreTrace, classifyTier } from '../pipeline/scorer.js'

const router = Router()
const workspace = new Workspace()
workspace.init()

router.post('/api/pipeline/build-seeds', (req, res) => {
  const builder = new DatasetBuilder(workspace.dataDir)
  const dir = builder.buildAndWrite(req.body)
  res.json({ success: true, outputDir: dir })
})

router.get('/api/pipeline/status', (_req, res) => {
  const tracesFile = join(workspace.dataDir, 'traces.jsonl')
  if (!existsSync(tracesFile)) {
    return res.json({ traces: 0, tiers: { gold: 0, silver: 0, bronze: 0, failed: 0 } })
  }
  const lines = readFileSync(tracesFile, 'utf-8').trim().split('\n').filter(Boolean)
  const traces = lines.map(l => JSON.parse(l))
  const tiers = { gold: 0, silver: 0, bronze: 0, failed: 0 }
  for (const trace of traces) {
    const score = scoreTrace(trace)
    const tier = classifyTier(score.overall, trace.attempts)
    tiers[tier]++
  }
  res.json({ traces: traces.length, tiers })
})

export default router
