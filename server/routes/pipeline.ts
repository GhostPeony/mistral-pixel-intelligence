import { Router } from 'express'
import { DatasetBuilder } from '../pipeline/dataset-builder.js'
import { DataDesignerBridge } from '../pipeline/data-designer.js'
import { Trainer } from '../pipeline/trainer.js'
import { Workspace } from '../pipeline/workspace.js'
import { Orchestrator } from '../pipeline/orchestrator.js'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'
import { scoreTrace, classifyTier } from '../pipeline/scorer.js'
import type { PipelineMode, ThresholdConfig, PipelineType } from '../pipeline/types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const router = Router()
const workspace = new Workspace()
workspace.init()

const designer = new DataDesignerBridge(workspace.dataDir)
const trainer = new Trainer(workspace.dataDir)
const orchestrator = new Orchestrator()

// --- Existing routes ---

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
      // Use stored tier from ingestion scoring, fall back to re-scoring if missing
      let tier = trace.tier
      if (!tier) {
        try {
          tier = classifyTier(scoreTrace(trace).overall, trace.attempts)
        } catch {
          tier = 'failed'
        }
      }
      if (tier in tiers) tiers[tier as keyof typeof tiers]++
    }
  }

  let dataDesigner = { available: false, method: 'none' }
  try {
    dataDesigner = await designer.checkPrerequisites()
  } catch {
    // prerequisites check failed, keep defaults
  }

  const orchestratorStatus = orchestrator.getStatus()

  res.json({ traces: traceCount, tiers, dataDesigner, orchestrator: orchestratorStatus })
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

router.get('/api/pipeline/models', (_req, res) => {
  const modelsDir = join(workspace.dataDir, 'models')
  if (!existsSync(modelsDir)) {
    return res.json([])
  }

  try {
    const entries = readdirSync(modelsDir, { withFileTypes: true })
    const models = entries
      .filter(e => e.isDirectory() && e.name.startsWith('run_'))
      .map(e => {
        const adapterPath = join(modelsDir, e.name, 'adapter')
        const timestamp = e.name.replace('run_', '')
        return {
          name: e.name,
          timestamp,
          hasAdapter: existsSync(adapterPath),
        }
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    res.json(models)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// --- Orchestrator routes ---

router.post('/api/pipeline/config', (req, res) => {
  const config = req.body as Partial<ThresholdConfig>
  orchestrator.updateThresholdConfig(config)
  res.json({ success: true, config: orchestrator.getThresholdConfig() })
})

router.get('/api/pipeline/config', (_req, res) => {
  res.json(orchestrator.getThresholdConfig())
})

router.post('/api/pipeline/start', (req, res) => {
  const { mode = 'semi_auto' } = req.body as { mode?: PipelineMode }
  orchestrator.start(mode)
  res.json({ success: true, status: orchestrator.getStatus() })
})

router.post('/api/pipeline/stop', (_req, res) => {
  orchestrator.stop()
  res.json({ success: true, status: orchestrator.getStatus() })
})

router.post('/api/pipeline/step/:name', async (req, res) => {
  const step = req.params.name as 'score' | 'amplify' | 'train' | 'eval'
  try {
    const result = await orchestrator.runStep(step)
    res.json({ success: true, result })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// --- Data pipeline generation routes ---

router.post('/api/pipeline/generate', async (req, res) => {
  const { pipelineType, seedDir } = req.body as { pipelineType: PipelineType; seedDir?: string }

  if (!pipelineType) {
    return res.status(400).json({ error: 'pipelineType is required' })
  }

  try {
    const outputDir = join(workspace.dataDir, 'datasets', `${pipelineType}_${Date.now()}`)
    const result = await designer.generateForPipeline(
      pipelineType,
      seedDir ?? join(workspace.dataDir, 'datasets'),
      outputDir,
    )
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// --- HuggingFace Cloud Operations ---

const hfCloudScript = join(__dirname, '..', 'weave-sidecar', 'hf_cloud.py')

function runHfCloud(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('python', [hfCloudScript, ...args])
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
    proc.on('close', (code: number | null) => {
      if (code !== 0) reject(new Error(stderr || `Exit code ${code}`))
      else resolve(stdout)
    })
  })
}

router.post('/api/pipeline/amplify-nvidia', async (req, res) => {
  const { seedDir, outputDir, factor = 5 } = req.body
  const seeds = seedDir ?? join(workspace.dataDir, 'datasets')
  const output = outputDir ?? join(workspace.dataDir, 'datasets', 'amplified')
  const amplifyScript = join(__dirname, '..', 'weave-sidecar', 'amplify.py')
  try {
    const result = JSON.parse(await runHfCloud([amplifyScript, seeds, output, String(factor)]))
    res.json(result)
  } catch (err: any) {
    // The amplify script is standalone, not hf_cloud — call it directly
    try {
      const proc = spawn('python', [amplifyScript, seeds, output, String(factor)])
      let stdout = ''
      let stderr = ''
      proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
      proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
      await new Promise<void>((resolve, reject) => {
        proc.on('close', (code: number | null) => {
          if (code !== 0) reject(new Error(stderr))
          else resolve()
        })
      })
      // Parse last JSON block from stdout
      const lines = stdout.trim().split('\n')
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].startsWith('{')) {
          return res.json(JSON.parse(lines.slice(i).join('\n')))
        }
      }
      res.json({ status: 'completed', output: stdout })
    } catch (err2: any) {
      res.status(500).json({ error: err2.message })
    }
  }
})

router.post('/api/pipeline/upload-seeds', async (req, res) => {
  const { seedFile, repoId } = req.body
  const file = seedFile ?? join(workspace.dataDir, 'traces.jsonl')
  try {
    const result = JSON.parse(await runHfCloud(['upload-seeds', file, ...(repoId ? [repoId] : [])]))
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/api/pipeline/job-status/:jobId', async (req, res) => {
  try {
    const result = JSON.parse(await runHfCloud(['job-status', req.params.jobId]))
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/api/pipeline/deploy', async (req, res) => {
  const { modelRepo, endpointName } = req.body
  if (!modelRepo) {
    return res.status(400).json({ error: 'modelRepo is required' })
  }
  try {
    const result = JSON.parse(await runHfCloud([
      'deploy', modelRepo, ...(endpointName ? [endpointName] : []),
    ]))
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/api/pipeline/teardown', async (req, res) => {
  const { endpointName } = req.body
  if (!endpointName) {
    return res.status(400).json({ error: 'endpointName is required' })
  }
  try {
    const result = JSON.parse(await runHfCloud(['teardown', endpointName]))
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
