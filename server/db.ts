import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_DIR = path.join(process.cwd(), '.mistral-maker')
const DB_PATH = path.join(DB_DIR, 'game.db')

// Ensure directory exists
fs.mkdirSync(DB_DIR, { recursive: true })

// Create or open database
const db = new Database(DB_PATH)

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL')

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sprite_data TEXT NOT NULL,
    skin_palette INTEGER DEFAULT 2,
    hair_palette INTEGER DEFAULT 1,
    hue_shift REAL DEFAULT 0,
    base_template TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )
`)

export default db
