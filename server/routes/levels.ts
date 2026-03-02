import { Router } from 'express'
import fs from 'fs/promises'
import path from 'path'

const router = Router()

const LEVELS_DIR = path.join(process.cwd(), '.mistral-maker', 'levels')
const NAME_REGEX = /^[a-zA-Z0-9_-]+$/

async function ensureLevelsDir() {
  await fs.mkdir(LEVELS_DIR, { recursive: true })
}

router.post('/api/levels/save', async (req, res) => {
  const { name, data } = req.body

  if (!name || typeof name !== 'string' || !NAME_REGEX.test(name)) {
    return res.status(400).json({ error: 'Invalid level name. Only alphanumeric, dash, and underscore allowed.' })
  }

  if (data === undefined || data === null) {
    return res.status(400).json({ error: 'Level data is required.' })
  }

  try {
    await ensureLevelsDir()
    const filePath = path.join(LEVELS_DIR, `${name}.json`)
    await fs.writeFile(filePath, typeof data === 'string' ? data : JSON.stringify(data), 'utf-8')
    res.json({ success: true, name })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ error: message })
  }
})

router.get('/api/levels', async (_req, res) => {
  try {
    await ensureLevelsDir()
    const files = await fs.readdir(LEVELS_DIR)
    const levels = files
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''))
    res.json(levels)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ error: message })
  }
})

router.get('/api/levels/:name', async (req, res) => {
  const { name } = req.params

  if (!NAME_REGEX.test(name)) {
    return res.status(400).json({ error: 'Invalid level name. Only alphanumeric, dash, and underscore allowed.' })
  }

  try {
    await ensureLevelsDir()
    const filePath = path.join(LEVELS_DIR, `${name}.json`)
    const content = await fs.readFile(filePath, 'utf-8')
    res.json(JSON.parse(content))
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      return res.status(404).json({ error: `Level "${name}" not found.` })
    }
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ error: message })
  }
})

export default router
