import './landing.css'
import { SPRITE_REGISTRY, type SpriteData } from './assets/sprites'
import { CharacterCreator } from './ui/character-creator'

interface CharacterRecord {
  id: number
  name: string
  sprite_data: string
  skin_palette: number
  hair_palette: number
  hue_shift: number
  base_template: string | null
  created_at: string
  updated_at: string
}

let selectedCharacterId: number | null = null
const creator = new CharacterCreator(() => loadCharacters())

async function init() {
  renderSpriteShowcase()
  await loadCharacters()
  setupPlayButton()
}

function renderSpriteShowcase() {
  const showcase = document.getElementById('sprite-showcase')!
  const heroes = ['hero_knight', 'hero_mage', 'hero_thief', 'hero_cleric', 'hero_berserker', 'hero_witch', 'hero_ranger']
  for (const id of heroes) {
    const sprite = SPRITE_REGISTRY[id]
    if (!sprite) continue
    const canvas = renderSpriteToCanvas(sprite, 48, 48)
    canvas.className = 'showcase-sprite'
    showcase.appendChild(canvas)
  }
}

function renderSpriteToCanvas(sprite: SpriteData, displayW: number, displayH: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = displayW
  canvas.height = displayH
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  const tiny = document.createElement('canvas')
  tiny.width = sprite.width
  tiny.height = sprite.height
  const tCtx = tiny.getContext('2d')!
  const imageData = tCtx.createImageData(sprite.width, sprite.height)
  for (let y = 0; y < sprite.height; y++) {
    for (let x = 0; x < sprite.width; x++) {
      const hex = sprite.pixels[y]?.[x]
      if (hex) {
        const i = (y * sprite.width + x) * 4
        imageData.data[i] = parseInt(hex.slice(1, 3), 16)
        imageData.data[i + 1] = parseInt(hex.slice(3, 5), 16)
        imageData.data[i + 2] = parseInt(hex.slice(5, 7), 16)
        imageData.data[i + 3] = 255
      }
    }
  }
  tCtx.putImageData(imageData, 0, 0)
  ctx.drawImage(tiny, 0, 0, displayW, displayH)
  return canvas
}

async function loadCharacters() {
  const grid = document.getElementById('character-grid')!
  grid.innerHTML = ''

  try {
    const res = await fetch('/api/characters')
    const characters: CharacterRecord[] = await res.json()

    for (const char of characters) {
      grid.appendChild(createCharacterCard(char))
    }
  } catch {
    // API may not be running yet
  }

  // "+ New Character" card
  const newCard = document.createElement('button')
  newCard.className = 'character-card character-card-new'
  newCard.innerHTML = '<span class="new-char-plus">+</span><span class="new-char-label">New Character</span>'
  newCard.addEventListener('click', () => openCharacterCreator())
  grid.appendChild(newCard)
}

function createCharacterCard(char: CharacterRecord): HTMLElement {
  const card = document.createElement('button')
  card.className = 'character-card'
  card.dataset.id = String(char.id)

  const spriteData: SpriteData = JSON.parse(char.sprite_data)
  const canvas = renderSpriteToCanvas(spriteData, 64, 64)
  canvas.className = 'character-card-thumb'
  card.appendChild(canvas)

  const name = document.createElement('span')
  name.className = 'character-card-name'
  name.textContent = char.name
  card.appendChild(name)

  const date = document.createElement('span')
  date.className = 'character-card-date'
  date.textContent = new Date(char.created_at).toLocaleDateString()
  card.appendChild(date)

  const editBtn = document.createElement('button')
  editBtn.className = 'character-card-edit'
  editBtn.textContent = 'Edit'
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    openCharacterCreator(char)
  })
  card.appendChild(editBtn)

  card.addEventListener('click', () => {
    document.querySelectorAll('.character-card').forEach(c => c.classList.remove('selected'))
    card.classList.add('selected')
    selectedCharacterId = char.id
    const playBtn = document.getElementById('play-btn') as HTMLButtonElement
    playBtn.disabled = false
    playBtn.textContent = `Play as ${char.name}`
  })

  return card
}

function setupPlayButton() {
  const playBtn = document.getElementById('play-btn')!
  playBtn.addEventListener('click', () => {
    if (selectedCharacterId) {
      window.location.href = `/editor?character=${selectedCharacterId}`
    }
  })
}

function openCharacterCreator(existingChar?: CharacterRecord) {
  creator.open(existingChar)
}

init()
