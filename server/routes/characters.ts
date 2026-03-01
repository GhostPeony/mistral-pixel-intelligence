import { Router } from 'express'
import db from '../db.js'

const router = Router()

// List all characters
router.get('/api/characters', (_req, res) => {
  const rows = db.prepare('SELECT id, name, sprite_data, skin_palette, hair_palette, hue_shift, base_template, created_at, updated_at FROM characters ORDER BY updated_at DESC').all()
  res.json(rows)
})

// Get single character
router.get('/api/characters/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM characters WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Character not found' })
  res.json(row)
})

// Create character
router.post('/api/characters', (req, res) => {
  const { name, sprite_data, skin_palette, hair_palette, hue_shift, base_template } = req.body
  if (!name || !sprite_data) {
    return res.status(400).json({ error: 'name and sprite_data are required' })
  }
  const result = db.prepare(
    'INSERT INTO characters (name, sprite_data, skin_palette, hair_palette, hue_shift, base_template) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    name,
    typeof sprite_data === 'string' ? sprite_data : JSON.stringify(sprite_data),
    skin_palette ?? 2,
    hair_palette ?? 1,
    hue_shift ?? 0,
    base_template ?? null
  )
  const created = db.prepare('SELECT * FROM characters WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(created)
})

// Update character
router.put('/api/characters/:id', (req, res) => {
  const { name, sprite_data, skin_palette, hair_palette, hue_shift, base_template } = req.body
  const existing = db.prepare('SELECT * FROM characters WHERE id = ?').get(req.params.id) as any
  if (!existing) return res.status(404).json({ error: 'Character not found' })

  db.prepare(
    `UPDATE characters SET name = ?, sprite_data = ?, skin_palette = ?, hair_palette = ?, hue_shift = ?, base_template = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(
    name ?? existing.name,
    sprite_data ? (typeof sprite_data === 'string' ? sprite_data : JSON.stringify(sprite_data)) : existing.sprite_data,
    skin_palette ?? existing.skin_palette,
    hair_palette ?? existing.hair_palette,
    hue_shift ?? existing.hue_shift,
    base_template ?? existing.base_template,
    req.params.id
  )
  const updated = db.prepare('SELECT * FROM characters WHERE id = ?').get(req.params.id)
  res.json(updated)
})

// Delete character
router.delete('/api/characters/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM characters WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Character not found' })
  db.prepare('DELETE FROM characters WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

export default router
