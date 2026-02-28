import { Router } from 'express'
import { DatasetBuilder } from '../pipeline/dataset-builder.js'
import { DataDesignerBridge } from '../pipeline/data-designer.js'
import { Trainer } from '../pipeline/trainer.js'
import { Workspace } from '../pipeline/workspace.js'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { scoreTrace, classifyTier } from '../pipeline/scorer.js'

const router = Router()
const workspace = new Workspace()
workspace.init()

const designer = new DataDesignerBridge(workspace.dataDir)
const trainer = new Trainer(workspace.dataDir)

router.post('/api/pipeline/build-seeds', (req, res) => {
  const builder = new DatasetBuilder(workspace.dataDir)
  const dir = builder.buildAndWrite(req.body)
  res.json({ success: true, outputDir: dir })
})

router.get('/api/pipeline/status', async (_req, res) => {
  const tracesFile = join(workspace.dataDir, 'traces.jsonl')
  const tiers = { gold: 0, silver: 0, bronze: 0, failed: 0 }
  let traceCount = 0

  if (existsSync(tracesFile)) {
    const lines = readFileSync(tracesFile, 'utf-8').trim().split('\n').filter(Boolean)
    const traces = lines.map(l => JSON.parse(l))
    traceCount = traces.length
    for (const trace of traces) {
      const score = scoreTrace(trace)
      const tier = classifyTier(score.overall, trace.attempts)
      tiers[tier]++
    }
  }

  let dataDesigner = { available: false, method: 'none' }
  try {
    dataDesigner = await designer.checkPrerequisites()
  } catch {
    // prerequisites check failed, keep defaults
  }

  res.json({ traces: traceCount, tiers, dataDesigner })
})

router.post('/api/pipeline/amplify', async (req, res) => {
  try {
    const { seedDir } = req.body
    const amplifiedDir = seedDir + '/amplified'
    const result = await designer.amplify({ seedDir, outputDir: amplifiedDir })
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/api/pipeline/train', async (req, res) => {
  const { seedDir, cloud = true, ...config } = req.body
  try {
    const result = cloud
      ? await trainer.trainCloud(seedDir, config)
      : await trainer.trainLocal(seedDir, config)
    res.json({ status: 'started', result })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
