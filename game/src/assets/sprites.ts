export interface SpriteData {
  width: number
  height: number
  pixels: string[][] // rows of hex colors, '' = transparent
}

// --- Palette constants ---
const _ = '' // transparent
const SK = '#EDBC84' // skin
const SD = '#D4A06A' // skin dark
const HR = '#553322' // hair brown
const HD = '#3D2216' // hair dark
const AR = '#AAAAAA' // armor light
const AM = '#888888' // armor mid
const AD = '#666666' // armor dark
const WH = '#FFFFFF' // white
const BK = '#222222' // near-black
const BN = '#8B5A2B' // brown wood
const BD = '#6B3A1F' // brown dark
const BL = '#A67B4E' // brown light
const GR = '#4A7C2E' // grass green
const GD = '#3A6420' // grass dark
const GL = '#5A9C3E' // grass light
const LG = '#4CAF50' // leaf green
const LK = '#2E7D32' // leaf dark
const ST = '#999999' // stone light
const SM = '#777777' // stone mid
const SN = '#555555' // stone dark
const DT = '#8B6914' // dirt
const DD = '#6B5010' // dirt dark
const SA = '#D4B483' // sand
const SL = '#E8CFA0' // sand light
const IC = '#B3E5FC' // ice
const IL = '#E1F5FE' // ice light
const LV = '#E53935' // lava red
const LO = '#FF8C00' // lava orange
const LY = '#FFC107' // lava yellow
const GD2 = '#FFD700' // gold
const SB = '#9AABBF' // steel blue
const RP = '#E53935' // red potion
const BP = '#1E88E5' // blue potion
const BW = '#DDDDDD' // bone white
const BG = '#BBBBBB' // bone gray
const SG = '#44BB44' // slime green
const SGD = '#2E8B2E' // slime dark
const DR = '#AA3333' // dark red
const PL = '#7B2D8B' // plum/purple
const PD = '#5A1A6B' // plum dark
const OR = '#F4845F' // accent orange (Mistral peach)
const CR = '#FDF6F0' // cream
const CY = '#A0CED9' // cyan tint
const RS = '#E8868B' // rose

// --- Skin Tone & Hair Palettes for character diversity ---
export interface PaletteEntry { base: string; shadow: string }

export const SKIN_PALETTES: PaletteEntry[] = [
  { base: '#FFE0D0', shadow: '#E8C4B0' }, // Porcelain
  { base: '#F5D0B0', shadow: '#DDB896' }, // Fair
  { base: '#EDBC84', shadow: '#D4A06A' }, // Peach (default)
  { base: '#D4A574', shadow: '#B8895C' }, // Tan
  { base: '#C09060', shadow: '#A07848' }, // Olive
  { base: '#8B6240', shadow: '#704E30' }, // Brown
  { base: '#6B4423', shadow: '#553618' }, // Dark Brown
  { base: '#4A2E14', shadow: '#3A220E' }, // Deep
]

export const HAIR_PALETTES: PaletteEntry[] = [
  { base: '#222222', shadow: '#111111' }, // Black
  { base: '#553322', shadow: '#3D2216' }, // Brown (default)
  { base: '#8B3A2A', shadow: '#6B2A1A' }, // Auburn
  { base: '#D4A84B', shadow: '#B8903A' }, // Blonde
  { base: '#CC4433', shadow: '#AA3322' }, // Red
  { base: '#C0C0C0', shadow: '#999999' }, // Silver
  { base: '#EEEEEE', shadow: '#CCCCCC' }, // White
  { base: '#1A1A3E', shadow: '#0E0E2A' }, // Blue-Black
]

// Helper: repeat a value n times in an array
function r(color: string, n: number): string[] {
  return Array(n).fill(color)
}

// Helper: build a row from segments [color, count]
function row(width: number, ...segments: [string, number][]): string[] {
  const result: string[] = []
  for (const [c, n] of segments) {
    for (let i = 0; i < n; i++) result.push(c)
  }
  // Pad to width if needed
  while (result.length < width) result.push(_)
  return result.slice(0, width)
}

// ============================================================
// HEROES (32x32)
// ============================================================

const hero_knight: SpriteData = {
  width: 32, height: 32,
  pixels: [
    // Row 0-5: helmet
    row(32, [_, 12], [AD, 8], [_, 12]),
    row(32, [_, 10], [AD, 1], [AM, 10], [AD, 1], [_, 10]),
    row(32, [_, 9], [AD, 1], [AM, 12], [AD, 1], [_, 9]),
    row(32, [_, 9], [AM, 1], [AR, 4], [BK, 4], [AR, 4], [AM, 1], [_, 9]),
    row(32, [_, 9], [AM, 1], [AR, 4], [BK, 4], [AR, 4], [AM, 1], [_, 9]),
    row(32, [_, 9], [AD, 1], [AM, 12], [AD, 1], [_, 9]),
    // Row 6-9: face area
    row(32, [_, 10], [AM, 2], [SK, 8], [AM, 2], [_, 10]),
    row(32, [_, 10], [AM, 1], [SK, 2], [BK, 2], [SK, 2], [BK, 2], [SK, 2], [AM, 1], [_, 10]),
    row(32, [_, 10], [AM, 1], [SK, 10], [AM, 1], [_, 10]),
    row(32, [_, 10], [AM, 1], [SK, 3], [DR, 4], [SK, 3], [AM, 1], [_, 10]),
    // Row 10-11: chin/neck
    row(32, [_, 11], [SK, 10], [_, 11]),
    row(32, [_, 12], [SK, 8], [_, 12]),
    // Row 12-17: torso armor
    row(32, [_, 10], [AD, 1], [AM, 10], [AD, 1], [_, 10]),
    row(32, [_, 9], [AD, 1], [AM, 12], [AD, 1], [_, 9]),
    row(32, [_, 8], [AD, 1], [AM, 14], [AD, 1], [_, 8]),
    row(32, [_, 8], [AM, 1], [AR, 14], [AM, 1], [_, 8]),
    row(32, [_, 8], [AM, 1], [AR, 6], [GD2, 2], [AR, 6], [AM, 1], [_, 8]),
    row(32, [_, 8], [AM, 1], [AR, 14], [AM, 1], [_, 8]),
    // Row 18-21: arms and torso
    row(32, [_, 6], [AM, 3], [AR, 14], [AM, 3], [_, 6]),
    row(32, [_, 5], [AM, 2], [SK, 1], [AM, 1], [AR, 14], [AM, 1], [SK, 1], [AM, 2], [_, 5]),
    row(32, [_, 5], [SK, 2], [_, 1], [AM, 1], [AR, 14], [AM, 1], [_, 1], [SK, 2], [_, 5]),
    row(32, [_, 5], [SK, 2], [_, 1], [AD, 1], [AM, 12], [AD, 1], [_, 1], [SK, 2], [_, 5]),
    // Row 22-24: belt area
    row(32, [_, 9], [BD, 14], [_, 9]),
    row(32, [_, 9], [BN, 2], [BD, 2], [GD2, 2], [BD, 4], [BN, 2], [BD, 2], [_, 9]),
    row(32, [_, 9], [BD, 14], [_, 9]),
    // Row 25-29: legs
    row(32, [_, 10], [AM, 5], [_, 2], [AM, 5], [_, 10]),
    row(32, [_, 10], [AM, 5], [_, 2], [AM, 5], [_, 10]),
    row(32, [_, 10], [AM, 5], [_, 2], [AM, 5], [_, 10]),
    row(32, [_, 10], [AM, 5], [_, 2], [AM, 5], [_, 10]),
    row(32, [_, 10], [AD, 5], [_, 2], [AD, 5], [_, 10]),
    // Row 30-31: boots
    row(32, [_, 9], [BD, 6], [_, 2], [BD, 6], [_, 9]),
    row(32, [_, 9], [BD, 6], [_, 2], [BD, 6], [_, 9]),
  ],
}

const hero_mage: SpriteData = {
  width: 32, height: 32,
  pixels: [
    // Row 0-3: pointy hat
    row(32, [_, 14], [PL, 4], [_, 14]),
    row(32, [_, 13], [PL, 6], [_, 13]),
    row(32, [_, 12], [PL, 8], [_, 12]),
    row(32, [_, 11], [PL, 10], [_, 11]),
    // Row 4-5: hat brim
    row(32, [_, 9], [PD, 14], [_, 9]),
    row(32, [_, 8], [PD, 16], [_, 8]),
    // Row 6-9: face
    row(32, [_, 10], [PD, 1], [SK, 10], [PD, 1], [_, 10]),
    row(32, [_, 10], [_, 1], [SK, 2], [BK, 2], [SK, 2], [BK, 2], [SK, 2], [_, 1], [_, 10]),
    row(32, [_, 11], [SK, 10], [_, 11]),
    row(32, [_, 11], [SK, 3], [DR, 4], [SK, 3], [_, 11]),
    // Row 10-11: neck/beard
    row(32, [_, 12], [WH, 8], [_, 12]),
    row(32, [_, 12], [WH, 8], [_, 12]),
    // Row 12-17: robe torso
    row(32, [_, 9], [PL, 14], [_, 9]),
    row(32, [_, 8], [PL, 16], [_, 8]),
    row(32, [_, 8], [PL, 16], [_, 8]),
    row(32, [_, 8], [PL, 7], [GD2, 2], [PL, 7], [_, 8]),
    row(32, [_, 8], [PL, 16], [_, 8]),
    row(32, [_, 8], [PL, 16], [_, 8]),
    // Row 18-21: sleeves and staff
    row(32, [_, 5], [PL, 4], [PD, 14], [PL, 4], [_, 5]),
    row(32, [_, 5], [SK, 2], [PL, 1], [PD, 16], [PL, 1], [SK, 2], [_, 5]),
    row(32, [_, 5], [SK, 2], [_, 1], [PD, 14], [_, 1], [SK, 2], [BN, 1], [_, 4]),
    row(32, [_, 8], [PD, 16], [BN, 1], [_, 7]),
    // Row 22-27: robe lower
    row(32, [_, 8], [PL, 16], [BN, 1], [_, 7]),
    row(32, [_, 8], [PL, 16], [BN, 1], [_, 7]),
    row(32, [_, 7], [PL, 18], [BN, 1], [_, 6]),
    row(32, [_, 7], [PL, 18], [BN, 1], [_, 6]),
    row(32, [_, 7], [PL, 18], [CY, 1], [_, 6]),
    row(32, [_, 7], [PL, 18], [CY, 2], [_, 5]),
    // Row 28-31: robe hem and feet
    row(32, [_, 7], [PD, 18], [_, 7]),
    row(32, [_, 8], [PD, 16], [_, 8]),
    row(32, [_, 10], [BD, 5], [_, 2], [BD, 5], [_, 10]),
    row(32, [_, 10], [BD, 5], [_, 2], [BD, 5], [_, 10]),
  ],
}

const hero_ranger: SpriteData = {
  width: 32, height: 32,
  pixels: [
    // Row 0-4: hood
    row(32, [_, 12], [GD, 8], [_, 12]),
    row(32, [_, 10], [GD, 12], [_, 10]),
    row(32, [_, 9], [GD, 14], [_, 9]),
    row(32, [_, 9], [GD, 14], [_, 9]),
    row(32, [_, 9], [GR, 14], [_, 9]),
    // Row 5-9: face
    row(32, [_, 10], [GR, 1], [SK, 10], [GR, 1], [_, 10]),
    row(32, [_, 10], [_, 1], [SK, 2], [BK, 2], [SK, 2], [BK, 2], [SK, 2], [_, 1], [_, 10]),
    row(32, [_, 11], [SK, 10], [_, 11]),
    row(32, [_, 11], [SK, 3], [SD, 4], [SK, 3], [_, 11]),
    row(32, [_, 12], [SK, 8], [_, 12]),
    // Row 10-11: neck/cloak clasp
    row(32, [_, 12], [GR, 3], [GD2, 2], [GR, 3], [_, 12]),
    row(32, [_, 10], [GR, 12], [_, 10]),
    // Row 12-17: tunic
    row(32, [_, 9], [GR, 14], [_, 9]),
    row(32, [_, 8], [GR, 16], [_, 8]),
    row(32, [_, 8], [GR, 16], [_, 8]),
    row(32, [_, 8], [GR, 7], [BD, 2], [GR, 7], [_, 8]),
    row(32, [_, 8], [GR, 16], [_, 8]),
    row(32, [_, 8], [GR, 16], [_, 8]),
    // Row 18-21: arms with bow
    row(32, [_, 5], [SK, 3], [GR, 16], [SK, 3], [_, 5]),
    row(32, [_, 5], [SK, 2], [_, 1], [GR, 16], [_, 1], [SK, 2], [_, 5]),
    row(32, [_, 5], [SK, 2], [_, 1], [BD, 14], [_, 1], [SK, 2], [BN, 1], [_, 4]),
    row(32, [_, 8], [GD, 16], [BN, 1], [_, 7]),
    // Row 22-24: belt
    row(32, [_, 9], [BD, 14], [BN, 1], [_, 8]),
    row(32, [_, 9], [BN, 5], [GD2, 1], [BN, 5], [BD, 3], [_, 9]),
    row(32, [_, 9], [BD, 14], [_, 9]),
    // Row 25-29: legs
    row(32, [_, 10], [BD, 5], [_, 2], [BD, 5], [_, 10]),
    row(32, [_, 10], [BN, 5], [_, 2], [BN, 5], [_, 10]),
    row(32, [_, 10], [BN, 5], [_, 2], [BN, 5], [_, 10]),
    row(32, [_, 10], [BN, 5], [_, 2], [BN, 5], [_, 10]),
    row(32, [_, 10], [BD, 5], [_, 2], [BD, 5], [_, 10]),
    // Row 30-31: boots
    row(32, [_, 9], [BD, 6], [_, 2], [BD, 6], [_, 9]),
    row(32, [_, 9], [BD, 6], [_, 2], [BD, 6], [_, 9]),
  ],
}

// ============================================================
// ENEMIES (32x32)
// ============================================================

const enemy_skeleton: SpriteData = {
  width: 32, height: 32,
  pixels: [
    // Row 0-4: skull top
    row(32, [_, 12], [BW, 8], [_, 12]),
    row(32, [_, 10], [BW, 12], [_, 10]),
    row(32, [_, 9], [BW, 14], [_, 9]),
    row(32, [_, 9], [BW, 14], [_, 9]),
    row(32, [_, 9], [BW, 14], [_, 9]),
    // Row 5-8: skull face
    row(32, [_, 9], [BW, 2], [BK, 3], [BW, 4], [BK, 3], [BW, 2], [_, 9]),
    row(32, [_, 9], [BW, 2], [BK, 3], [BW, 4], [BK, 3], [BW, 2], [_, 9]),
    row(32, [_, 9], [BW, 5], [BK, 4], [BW, 5], [_, 9]),
    row(32, [_, 9], [BW, 3], [BK, 1], [BW, 2], [BK, 2], [BW, 2], [BK, 1], [BW, 3], [_, 9]),
    // Row 9-10: jaw
    row(32, [_, 10], [BW, 12], [_, 10]),
    row(32, [_, 11], [BG, 10], [_, 11]),
    // Row 11: neck
    row(32, [_, 13], [BW, 2], [_, 2], [BW, 2], [_, 13]),
    // Row 12-17: ribcage
    row(32, [_, 10], [BW, 12], [_, 10]),
    row(32, [_, 10], [BW, 2], [BK, 2], [BW, 4], [BK, 2], [BW, 2], [_, 10]),
    row(32, [_, 10], [BW, 2], [BK, 2], [BW, 4], [BK, 2], [BW, 2], [_, 10]),
    row(32, [_, 10], [BW, 2], [BK, 2], [BW, 4], [BK, 2], [BW, 2], [_, 10]),
    row(32, [_, 10], [BW, 12], [_, 10]),
    row(32, [_, 11], [BW, 10], [_, 11]),
    // Row 18-21: arms
    row(32, [_, 7], [BW, 3], [BG, 12], [BW, 3], [_, 7]),
    row(32, [_, 6], [BW, 2], [_, 2], [BG, 12], [_, 2], [BW, 2], [_, 6]),
    row(32, [_, 5], [BW, 2], [_, 4], [BG, 10], [_, 4], [BW, 2], [_, 5]),
    row(32, [_, 5], [BW, 2], [_, 5], [BG, 8], [_, 5], [BW, 2], [_, 5]),
    // Row 22-24: pelvis
    row(32, [_, 12], [BG, 8], [_, 12]),
    row(32, [_, 11], [BW, 10], [_, 11]),
    row(32, [_, 12], [BG, 8], [_, 12]),
    // Row 25-29: legs
    row(32, [_, 12], [BW, 3], [_, 2], [BW, 3], [_, 12]),
    row(32, [_, 12], [BW, 3], [_, 2], [BW, 3], [_, 12]),
    row(32, [_, 12], [BW, 3], [_, 2], [BW, 3], [_, 12]),
    row(32, [_, 12], [BW, 3], [_, 2], [BW, 3], [_, 12]),
    row(32, [_, 12], [BW, 3], [_, 2], [BW, 3], [_, 12]),
    // Row 30-31: feet
    row(32, [_, 11], [BG, 4], [_, 2], [BG, 4], [_, 11]),
    row(32, [_, 11], [BG, 4], [_, 2], [BG, 4], [_, 11]),
  ],
}

const enemy_slime: SpriteData = {
  width: 32, height: 32,
  pixels: [
    // Row 0-7: empty top space (slime is short)
    ...Array(8).fill(row(32, [_, 32])),
    // Row 8-11: slime top dome
    row(32, [_, 12], [SG, 8], [_, 12]),
    row(32, [_, 10], [SG, 12], [_, 10]),
    row(32, [_, 9], [SG, 14], [_, 9]),
    row(32, [_, 8], [SG, 16], [_, 8]),
    // Row 12-17: slime body
    row(32, [_, 7], [SG, 18], [_, 7]),
    row(32, [_, 7], [SG, 4], [SGD, 2], [SG, 4], [SGD, 2], [SG, 6], [_, 7]),
    row(32, [_, 7], [SG, 3], [BK, 3], [SG, 4], [BK, 3], [SG, 5], [_, 7]),
    row(32, [_, 7], [SG, 3], [WH, 1], [BK, 2], [SG, 4], [WH, 1], [BK, 2], [SG, 5], [_, 7]),
    row(32, [_, 6], [SG, 20], [_, 6]),
    row(32, [_, 6], [SG, 20], [_, 6]),
    // Row 18-23: slime body lower with mouth
    row(32, [_, 6], [SG, 7], [SGD, 6], [SG, 7], [_, 6]),
    row(32, [_, 6], [SG, 20], [_, 6]),
    row(32, [_, 6], [SG, 20], [_, 6]),
    row(32, [_, 6], [SG, 20], [_, 6]),
    row(32, [_, 6], [SGD, 20], [_, 6]),
    row(32, [_, 6], [SGD, 20], [_, 6]),
    // Row 24-27: slime base
    row(32, [_, 5], [SGD, 22], [_, 5]),
    row(32, [_, 5], [SGD, 22], [_, 5]),
    row(32, [_, 6], [SGD, 20], [_, 6]),
    row(32, [_, 7], [SGD, 18], [_, 7]),
    // Row 28-31: slime drip/base
    row(32, [_, 8], [SGD, 16], [_, 8]),
    row(32, [_, 8], [SGD, 16], [_, 8]),
    row(32, [_, 9], [SGD, 14], [_, 9]),
    row(32, [_, 10], [SGD, 12], [_, 10]),
  ],
}

const enemy_bat: SpriteData = {
  width: 32, height: 32,
  pixels: [
    // Row 0-5: empty
    ...Array(6).fill(row(32, [_, 32])),
    // Row 6-8: ears
    row(32, [_, 11], [PD, 3], [_, 4], [PD, 3], [_, 11]),
    row(32, [_, 10], [PD, 4], [_, 4], [PD, 4], [_, 10]),
    row(32, [_, 10], [PD, 5], [_, 2], [PD, 5], [_, 10]),
    // Row 9-13: head
    row(32, [_, 10], [PD, 12], [_, 10]),
    row(32, [_, 9], [PD, 14], [_, 9]),
    row(32, [_, 9], [PD, 3], [DR, 2], [PD, 4], [DR, 2], [PD, 3], [_, 9]),
    row(32, [_, 9], [PD, 3], [LY, 1], [DR, 1], [PD, 4], [LY, 1], [DR, 1], [PD, 3], [_, 9]),
    row(32, [_, 10], [PD, 12], [_, 10]),
    // Row 14: mouth
    row(32, [_, 12], [PD, 2], [WH, 1], [PD, 2], [WH, 1], [PD, 2], [_, 12]),
    // Row 15-19: wings extended
    row(32, [_, 4], [PD, 8], [PL, 8], [PD, 8], [_, 4]),
    row(32, [_, 2], [PD, 10], [PL, 8], [PD, 10], [_, 2]),
    row(32, [_, 1], [PD, 12], [PL, 6], [PD, 12], [_, 1]),
    row(32, [PD, 13], [PL, 6], [PD, 13]),
    row(32, [PD, 14], [PL, 4], [PD, 14]),
    // Row 20-23: wings lower
    row(32, [_, 1], [PD, 12], [PL, 6], [PD, 12], [_, 1]),
    row(32, [_, 2], [PD, 10], [PL, 8], [PD, 10], [_, 2]),
    row(32, [_, 4], [PD, 6], [_, 12], [PD, 6], [_, 4]),
    row(32, [_, 5], [PD, 4], [_, 14], [PD, 4], [_, 5]),
    // Row 24-27: body and feet
    row(32, [_, 13], [PD, 6], [_, 13]),
    row(32, [_, 13], [PD, 6], [_, 13]),
    row(32, [_, 13], [PD, 2], [_, 2], [PD, 2], [_, 13]),
    row(32, [_, 13], [PD, 2], [_, 2], [PD, 2], [_, 13]),
    // Row 28-31: empty
    ...Array(4).fill(row(32, [_, 32])),
  ],
}

const enemy_goblin: SpriteData = {
  width: 32, height: 32,
  pixels: [
    // Row 0-3: ears and head top
    row(32, [_, 8], [GD, 3], [_, 6], [GD, 3], [_, 12]),
    row(32, [_, 7], [GD, 4], [_, 6], [GD, 4], [_, 11]),
    row(32, [_, 10], [GD, 2], [SG, 8], [GD, 2], [_, 10]),
    row(32, [_, 10], [SG, 12], [_, 10]),
    // Row 4-8: face
    row(32, [_, 9], [SG, 14], [_, 9]),
    row(32, [_, 9], [SG, 3], [LY, 2], [SG, 4], [LY, 2], [SG, 3], [_, 9]),
    row(32, [_, 9], [SG, 3], [BK, 2], [SG, 4], [BK, 2], [SG, 3], [_, 9]),
    row(32, [_, 9], [SG, 5], [SGD, 4], [SG, 5], [_, 9]),
    row(32, [_, 10], [SG, 2], [WH, 1], [SG, 4], [WH, 1], [SG, 2], [_, 12]),
    // Row 9-10: chin
    row(32, [_, 10], [SG, 12], [_, 10]),
    row(32, [_, 12], [SG, 8], [_, 12]),
    // Row 11-16: body
    row(32, [_, 10], [BD, 12], [_, 10]),
    row(32, [_, 9], [BD, 14], [_, 9]),
    row(32, [_, 9], [BD, 14], [_, 9]),
    row(32, [_, 9], [BD, 6], [GD2, 2], [BD, 6], [_, 9]),
    row(32, [_, 9], [BD, 14], [_, 9]),
    row(32, [_, 9], [BD, 14], [_, 9]),
    // Row 17-20: arms
    row(32, [_, 6], [SG, 3], [BD, 14], [SG, 3], [_, 6]),
    row(32, [_, 5], [SG, 3], [_, 1], [BD, 14], [_, 1], [SG, 3], [_, 5]),
    row(32, [_, 5], [SG, 2], [_, 2], [BD, 14], [_, 2], [SG, 2], [_, 5]),
    row(32, [_, 5], [SG, 2], [_, 2], [BD, 14], [_, 2], [SG, 2], [_, 5]),
    // Row 21-24: lower body
    row(32, [_, 10], [BD, 12], [_, 10]),
    row(32, [_, 10], [BN, 12], [_, 10]),
    row(32, [_, 10], [BN, 12], [_, 10]),
    row(32, [_, 10], [BN, 12], [_, 10]),
    // Row 25-29: legs
    row(32, [_, 11], [SG, 4], [_, 2], [SG, 4], [_, 11]),
    row(32, [_, 11], [SG, 4], [_, 2], [SG, 4], [_, 11]),
    row(32, [_, 11], [SG, 4], [_, 2], [SG, 4], [_, 11]),
    row(32, [_, 11], [SG, 4], [_, 2], [SG, 4], [_, 11]),
    row(32, [_, 11], [SG, 4], [_, 2], [SG, 4], [_, 11]),
    // Row 30-31: feet
    row(32, [_, 10], [SGD, 5], [_, 2], [SGD, 5], [_, 10]),
    row(32, [_, 10], [SGD, 5], [_, 2], [SGD, 5], [_, 10]),
  ],
}

// ============================================================
// NPCs (32x32)
// ============================================================

const npc_villager: SpriteData = {
  width: 32, height: 32,
  pixels: [
    // Row 0-3: hair
    row(32, [_, 12], [HR, 8], [_, 12]),
    row(32, [_, 10], [HR, 12], [_, 10]),
    row(32, [_, 9], [HR, 14], [_, 9]),
    row(32, [_, 9], [HR, 14], [_, 9]),
    // Row 4-8: face
    row(32, [_, 9], [HR, 2], [SK, 10], [HR, 2], [_, 9]),
    row(32, [_, 10], [SK, 12], [_, 10]),
    row(32, [_, 10], [SK, 2], [BK, 2], [SK, 4], [BK, 2], [SK, 2], [_, 10]),
    row(32, [_, 10], [SK, 12], [_, 10]),
    row(32, [_, 10], [SK, 4], [RS, 4], [SK, 4], [_, 10]),
    // Row 9-10: neck
    row(32, [_, 11], [SK, 10], [_, 11]),
    row(32, [_, 12], [SK, 8], [_, 12]),
    // Row 11-17: blue tunic
    row(32, [_, 10], [CY, 12], [_, 10]),
    row(32, [_, 9], [CY, 14], [_, 9]),
    row(32, [_, 8], [CY, 16], [_, 8]),
    row(32, [_, 8], [CY, 16], [_, 8]),
    row(32, [_, 8], [CY, 16], [_, 8]),
    row(32, [_, 8], [CY, 16], [_, 8]),
    row(32, [_, 8], [CY, 16], [_, 8]),
    // Row 18-21: arms
    row(32, [_, 6], [SK, 2], [CY, 16], [SK, 2], [_, 6]),
    row(32, [_, 5], [SK, 3], [CY, 16], [SK, 3], [_, 5]),
    row(32, [_, 5], [SK, 2], [_, 1], [CY, 16], [_, 1], [SK, 2], [_, 5]),
    row(32, [_, 8], [CY, 16], [_, 8]),
    // Row 22-24: belt
    row(32, [_, 9], [BD, 14], [_, 9]),
    row(32, [_, 9], [BN, 14], [_, 9]),
    row(32, [_, 9], [BD, 14], [_, 9]),
    // Row 25-29: legs
    row(32, [_, 10], [BN, 5], [_, 2], [BN, 5], [_, 10]),
    row(32, [_, 10], [BN, 5], [_, 2], [BN, 5], [_, 10]),
    row(32, [_, 10], [BN, 5], [_, 2], [BN, 5], [_, 10]),
    row(32, [_, 10], [BN, 5], [_, 2], [BN, 5], [_, 10]),
    row(32, [_, 10], [BN, 5], [_, 2], [BN, 5], [_, 10]),
    // Row 30-31: shoes
    row(32, [_, 9], [BD, 6], [_, 2], [BD, 6], [_, 9]),
    row(32, [_, 9], [BD, 6], [_, 2], [BD, 6], [_, 9]),
  ],
}

const npc_merchant: SpriteData = {
  width: 32, height: 32,
  pixels: [
    // Row 0-3: hat
    row(32, [_, 11], [OR, 10], [_, 11]),
    row(32, [_, 10], [OR, 12], [_, 10]),
    row(32, [_, 9], [OR, 14], [_, 9]),
    row(32, [_, 8], [BD, 16], [_, 8]),
    // Row 4-8: face
    row(32, [_, 9], [BD, 1], [SK, 12], [BD, 1], [_, 9]),
    row(32, [_, 10], [SK, 12], [_, 10]),
    row(32, [_, 10], [SK, 2], [BK, 2], [SK, 4], [BK, 2], [SK, 2], [_, 10]),
    row(32, [_, 10], [SK, 12], [_, 10]),
    row(32, [_, 10], [SK, 4], [RS, 4], [SK, 4], [_, 10]),
    // Row 9-10: neck
    row(32, [_, 11], [SK, 10], [_, 11]),
    row(32, [_, 12], [SK, 8], [_, 12]),
    // Row 11-17: red vest over cream shirt
    row(32, [_, 9], [DR, 2], [CR, 10], [DR, 2], [_, 9]),
    row(32, [_, 8], [DR, 2], [CR, 12], [DR, 2], [_, 8]),
    row(32, [_, 8], [DR, 2], [CR, 12], [DR, 2], [_, 8]),
    row(32, [_, 8], [DR, 2], [CR, 5], [GD2, 2], [CR, 5], [DR, 2], [_, 8]),
    row(32, [_, 8], [DR, 2], [CR, 12], [DR, 2], [_, 8]),
    row(32, [_, 8], [DR, 2], [CR, 12], [DR, 2], [_, 8]),
    row(32, [_, 8], [DR, 2], [CR, 12], [DR, 2], [_, 8]),
    // Row 18-21: arms
    row(32, [_, 5], [SK, 3], [DR, 2], [CR, 12], [DR, 2], [SK, 3], [_, 5]),
    row(32, [_, 5], [SK, 2], [_, 1], [DR, 2], [CR, 12], [DR, 2], [_, 1], [SK, 2], [_, 5]),
    row(32, [_, 5], [SK, 2], [_, 2], [DR, 14], [_, 2], [SK, 2], [_, 5]),
    row(32, [_, 9], [DR, 14], [_, 9]),
    // Row 22-24: belt with pouch
    row(32, [_, 9], [BD, 4], [BN, 4], [GD2, 2], [BD, 4], [_, 9]),
    row(32, [_, 9], [BN, 14], [_, 9]),
    row(32, [_, 9], [BD, 14], [_, 9]),
    // Row 25-29: legs
    row(32, [_, 10], [BN, 5], [_, 2], [BN, 5], [_, 10]),
    row(32, [_, 10], [BD, 5], [_, 2], [BD, 5], [_, 10]),
    row(32, [_, 10], [BD, 5], [_, 2], [BD, 5], [_, 10]),
    row(32, [_, 10], [BD, 5], [_, 2], [BD, 5], [_, 10]),
    row(32, [_, 10], [BD, 5], [_, 2], [BD, 5], [_, 10]),
    // Row 30-31: boots
    row(32, [_, 9], [BK, 6], [_, 2], [BK, 6], [_, 9]),
    row(32, [_, 9], [BK, 6], [_, 2], [BK, 6], [_, 9]),
  ],
}

// ============================================================
// TILES (32x32)
// ============================================================

function makeTile(width: number, height: number, fill: string, detail: string, detailChance: number): SpriteData {
  const pixels: string[][] = []
  // Deterministic pseudo-random based on position
  let seed = fill.charCodeAt(1) * 7 + detail.charCodeAt(1) * 13
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed >> 16) / 32768 }
  for (let y = 0; y < height; y++) {
    const r: string[] = []
    for (let x = 0; x < width; x++) {
      r.push(rand() < detailChance ? detail : fill)
    }
    pixels.push(r)
  }
  return { width, height, pixels }
}

const tile_grass: SpriteData = (() => {
  const base = makeTile(32, 32, GR, GL, 0.3)
  // Add darker grass patches
  let seed = 42
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed >> 16) / 32768 }
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      if (rand() < 0.15) base.pixels[y][x] = GD
    }
  }
  return base
})()

const tile_stone = makeTile(32, 32, SM, ST, 0.35)
const tile_dirt = makeTile(32, 32, DT, DD, 0.3)
const tile_sand = makeTile(32, 32, SA, SL, 0.4)

const tile_wood: SpriteData = (() => {
  const pixels: string[][] = []
  for (let y = 0; y < 32; y++) {
    const r: string[] = []
    for (let x = 0; x < 32; x++) {
      // Horizontal wood grain pattern
      if (y % 8 === 0 || y % 8 === 1) r.push(BD)
      else if (x % 6 === 0) r.push(BD)
      else r.push(((x + y) % 3 === 0) ? BL : BN)
    }
    pixels.push(r)
  }
  return { width: 32, height: 32, pixels }
})()

const tile_brick: SpriteData = (() => {
  const pixels: string[][] = []
  const brick = '#B5544A'
  const brickDark = '#8B3A30'
  const mortar = '#C8B8A0'
  for (let y = 0; y < 32; y++) {
    const r: string[] = []
    const brickRow = Math.floor(y / 8)
    const isGap = (y % 8 === 0)
    const offset = (brickRow % 2 === 0) ? 0 : 8
    for (let x = 0; x < 32; x++) {
      if (isGap) {
        r.push(mortar)
      } else if ((x + offset) % 16 === 0 || (x + offset) % 16 === 1) {
        r.push(mortar)
      } else {
        r.push(((x + y) % 5 === 0) ? brickDark : brick)
      }
    }
    pixels.push(r)
  }
  return { width: 32, height: 32, pixels }
})()

const tile_ice: SpriteData = makeTile(32, 32, IC, IL, 0.4)

const tile_lava: SpriteData = (() => {
  const pixels: string[][] = []
  let seed = 77
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed >> 16) / 32768 }
  for (let y = 0; y < 32; y++) {
    const r: string[] = []
    for (let x = 0; x < 32; x++) {
      const v = rand()
      if (v < 0.3) r.push(LV)
      else if (v < 0.6) r.push(LO)
      else r.push(LY)
    }
    pixels.push(r)
  }
  return { width: 32, height: 32, pixels }
})()

// ============================================================
// STRUCTURES (64x64)
// ============================================================

function makeStructure64(name: string): SpriteData {
  const pixels: string[][] = []
  for (let y = 0; y < 64; y++) {
    pixels.push(Array(64).fill(_))
  }
  return { width: 64, height: 64, pixels }
}

const structure_castle: SpriteData = (() => {
  const pixels: string[][] = []
  for (let y = 0; y < 64; y++) {
    const r: string[] = Array(64).fill(_)
    pixels.push(r)
  }
  // Battlements (top row of crenellations)
  for (let y = 0; y < 8; y++) {
    for (let x = 4; x < 60; x++) {
      // Crenellation pattern: 6 solid, 4 gap
      const block = Math.floor((x - 4) / 10)
      const pos = (x - 4) % 10
      if (pos < 6 && y < 6) pixels[y][x] = SM
      else if (y >= 6) pixels[y][x] = SM
    }
  }
  // Main wall
  for (let y = 8; y < 56; y++) {
    for (let x = 4; x < 60; x++) {
      pixels[y][x] = ((x + y) % 7 === 0) ? ST : SM
    }
  }
  // Gate
  for (let y = 32; y < 56; y++) {
    for (let x = 22; x < 42; x++) {
      if (y < 34 || y > 54 || x < 24 || x > 40) {
        pixels[y][x] = SN
      } else {
        // Arch top
        const cx = 32, cy = 34
        const dx = x - cx, dy = y - cy
        if (dy < 0 && dx * dx + dy * dy > 64) {
          pixels[y][x] = SN
        } else if (y < 36 && Math.abs(x - 32) > 6) {
          pixels[y][x] = SN
        } else {
          pixels[y][x] = BK
        }
      }
    }
  }
  // Base
  for (let y = 56; y < 64; y++) {
    for (let x = 2; x < 62; x++) {
      pixels[y][x] = ((x + y) % 5 === 0) ? ST : SN
    }
  }
  // Tower tops (left and right)
  for (let y = 0; y < 4; y++) {
    for (let i = 0; i < 2; i++) {
      const bx = i === 0 ? 4 : 52
      for (let x = bx; x < bx + 8; x++) {
        pixels[y][x] = AD
      }
    }
  }
  return { width: 64, height: 64, pixels }
})()

const structure_house: SpriteData = (() => {
  const pixels: string[][] = []
  for (let y = 0; y < 64; y++) pixels.push(Array(64).fill(_))
  // Roof (triangle)
  for (let y = 4; y < 28; y++) {
    const half = y - 4
    const left = 32 - half - 4
    const right = 32 + half + 4
    for (let x = Math.max(4, left); x < Math.min(60, right); x++) {
      pixels[y][x] = ((x + y) % 3 === 0) ? '#A0522D' : DR
    }
  }
  // Walls
  for (let y = 28; y < 56; y++) {
    for (let x = 8; x < 56; x++) {
      pixels[y][x] = ((x + y) % 5 === 0) ? BL : CR
    }
  }
  // Door
  for (let y = 38; y < 56; y++) {
    for (let x = 26; x < 38; x++) {
      pixels[y][x] = BN
      if (x === 26 || x === 37 || y === 38) pixels[y][x] = BD
    }
  }
  // Doorknob
  pixels[48][35] = GD2
  // Window left
  for (let y = 32; y < 42; y++) {
    for (let x = 14; x < 22; x++) {
      if (y === 32 || y === 41 || x === 14 || x === 21) pixels[y][x] = BD
      else pixels[y][x] = CY
    }
  }
  // Window right
  for (let y = 32; y < 42; y++) {
    for (let x = 42; x < 50; x++) {
      if (y === 32 || y === 41 || x === 42 || x === 49) pixels[y][x] = BD
      else pixels[y][x] = CY
    }
  }
  // Base
  for (let y = 56; y < 64; y++) {
    for (let x = 6; x < 58; x++) {
      pixels[y][x] = SN
    }
  }
  return { width: 64, height: 64, pixels }
})()

const structure_tower: SpriteData = (() => {
  const pixels: string[][] = []
  for (let y = 0; y < 64; y++) pixels.push(Array(64).fill(_))
  // Cone roof
  for (let y = 0; y < 16; y++) {
    const half = Math.floor(y * 12 / 16)
    for (let x = 32 - half; x < 32 + half; x++) {
      pixels[y][x] = ((x + y) % 3 === 0) ? '#8B3A3A' : DR
    }
  }
  // Tower body
  for (let y = 16; y < 60; y++) {
    for (let x = 20; x < 44; x++) {
      pixels[y][x] = ((x + y) % 6 === 0) ? ST : SM
    }
  }
  // Window
  for (let y = 24; y < 34; y++) {
    for (let x = 28; x < 36; x++) {
      if (y === 24 || y === 33 || x === 28 || x === 35) pixels[y][x] = SN
      else pixels[y][x] = BK
    }
  }
  // Base
  for (let y = 60; y < 64; y++) {
    for (let x = 18; x < 46; x++) {
      pixels[y][x] = SN
    }
  }
  return { width: 64, height: 64, pixels }
})()

const structure_wall: SpriteData = (() => {
  const pixels: string[][] = []
  for (let y = 0; y < 64; y++) pixels.push(Array(64).fill(_))
  // Battlements
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 64; x++) {
      const pos = x % 12
      if (pos < 7 && y < 6) pixels[y][x] = SM
      else if (y >= 6) pixels[y][x] = SM
    }
  }
  // Wall body
  for (let y = 8; y < 64; y++) {
    for (let x = 8; x < 56; x++) {
      pixels[y][x] = ((x + y) % 7 === 0) ? ST : SM
    }
  }
  return { width: 64, height: 64, pixels }
})()

// ============================================================
// TREES (48x64)
// ============================================================

const tree_oak: SpriteData = (() => {
  const pixels: string[][] = []
  for (let y = 0; y < 64; y++) pixels.push(Array(48).fill(_))
  // Canopy (roughly circular, top half)
  const cx = 24, cy = 20
  for (let y = 2; y < 40; y++) {
    for (let x = 2; x < 46; x++) {
      const dx = x - cx, dy = (y - cy) * 1.2
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 20) {
        const v = (x * 7 + y * 13) % 5
        if (v === 0) pixels[y][x] = LK
        else if (v === 1) pixels[y][x] = GL
        else pixels[y][x] = LG
      }
    }
  }
  // Trunk
  for (let y = 34; y < 62; y++) {
    for (let x = 20; x < 28; x++) {
      pixels[y][x] = ((x + y) % 4 === 0) ? BL : BN
      if (x === 20 || x === 27) pixels[y][x] = BD
    }
  }
  // Roots
  for (let y = 60; y < 64; y++) {
    for (let x = 16; x < 32; x++) {
      if (Math.abs(x - 24) < (64 - y) * 2) {
        pixels[y][x] = BD
      }
    }
  }
  return { width: 48, height: 64, pixels }
})()

const tree_pine: SpriteData = (() => {
  const pixels: string[][] = []
  for (let y = 0; y < 64; y++) pixels.push(Array(48).fill(_))
  // Pine tree: triangle canopy layers
  const cx = 24
  // Top triangle
  for (let y = 2; y < 20; y++) {
    const half = Math.floor((y - 2) * 14 / 18)
    for (let x = cx - half; x <= cx + half; x++) {
      if (x >= 0 && x < 48) {
        pixels[y][x] = ((x + y) % 3 === 0) ? LK : GD
      }
    }
  }
  // Middle triangle
  for (let y = 14; y < 32; y++) {
    const half = Math.floor((y - 14) * 16 / 18)
    for (let x = cx - half; x <= cx + half; x++) {
      if (x >= 0 && x < 48) {
        pixels[y][x] = ((x + y) % 3 === 0) ? LK : GD
      }
    }
  }
  // Bottom triangle
  for (let y = 26; y < 44; y++) {
    const half = Math.floor((y - 26) * 18 / 18)
    for (let x = cx - half; x <= cx + half; x++) {
      if (x >= 0 && x < 48) {
        pixels[y][x] = ((x + y) % 4 === 0) ? LK : GR
      }
    }
  }
  // Trunk
  for (let y = 42; y < 62; y++) {
    for (let x = 21; x < 27; x++) {
      pixels[y][x] = ((x + y) % 3 === 0) ? BD : BN
      if (x === 21 || x === 26) pixels[y][x] = BD
    }
  }
  // Base
  for (let y = 62; y < 64; y++) {
    for (let x = 18; x < 30; x++) pixels[y][x] = BD
  }
  return { width: 48, height: 64, pixels }
})()

const tree_cactus: SpriteData = (() => {
  const pixels: string[][] = []
  for (let y = 0; y < 64; y++) pixels.push(Array(48).fill(_))
  const cactusGreen = '#5B8C3E'
  const cactusDark = '#3D6B2E'
  // Main trunk
  for (let y = 8; y < 60; y++) {
    for (let x = 20; x < 28; x++) {
      pixels[y][x] = ((x + y) % 4 === 0) ? cactusDark : cactusGreen
      if (x === 20 || x === 27) pixels[y][x] = cactusDark
    }
  }
  // Left arm
  for (let y = 20; y < 36; y++) {
    for (let x = 10; x < 20; x++) {
      if (y < 28) {
        pixels[y][x] = ((x + y) % 4 === 0) ? cactusDark : cactusGreen
      }
    }
  }
  for (let y = 20; y < 28; y++) {
    for (let x = 10; x < 18; x++) {
      if (y >= 20 && y < 22) {
        pixels[y][x] = cactusGreen
      }
    }
  }
  // Vertical part of left arm
  for (let y = 20; y < 32; y++) {
    pixels[y][10] = cactusDark
    pixels[y][11] = cactusGreen
    pixels[y][12] = cactusGreen
    pixels[y][13] = cactusGreen
    pixels[y][14] = cactusDark
  }
  // Horizontal connector
  for (let x = 14; x < 20; x++) {
    pixels[28][x] = cactusDark
    pixels[29][x] = cactusGreen
    pixels[30][x] = cactusGreen
    pixels[31][x] = cactusDark
  }
  // Right arm
  for (let y = 30; y < 42; y++) {
    pixels[y][34] = cactusDark
    pixels[y][35] = cactusGreen
    pixels[y][36] = cactusGreen
    pixels[y][37] = cactusGreen
    pixels[y][38] = cactusDark
  }
  for (let x = 28; x < 35; x++) {
    pixels[38][x] = cactusDark
    pixels[39][x] = cactusGreen
    pixels[40][x] = cactusGreen
    pixels[41][x] = cactusDark
  }
  // Base
  for (let y = 60; y < 64; y++) {
    for (let x = 18; x < 30; x++) pixels[y][x] = SA
  }
  return { width: 48, height: 64, pixels }
})()

// ============================================================
// ITEMS (24x24)
// ============================================================

const item_sword: SpriteData = (() => {
  const pixels: string[][] = []
  for (let y = 0; y < 24; y++) pixels.push(Array(24).fill(_))
  // Blade (diagonal from top-right to center)
  for (let i = 0; i < 12; i++) {
    const x = 18 - i, y2 = 2 + i
    if (x >= 0 && x < 24 && y2 >= 0 && y2 < 24) {
      pixels[y2][x] = SB
      if (x + 1 < 24) pixels[y2][x + 1] = AR
      if (x - 1 >= 0) pixels[y2][x - 1] = ST
    }
  }
  // Guard (horizontal bar)
  for (let x = 4; x < 16; x++) {
    pixels[14][x] = GD2
    pixels[15][x] = BD
  }
  // Handle
  for (let i = 0; i < 6; i++) {
    const x = 6 - i, y2 = 16 + i
    if (x >= 0 && x < 24 && y2 >= 0 && y2 < 24) {
      pixels[y2][x] = BN
      if (x + 1 < 24) pixels[y2][x + 1] = BD
    }
  }
  // Pommel
  pixels[22][1] = GD2
  pixels[22][2] = GD2
  pixels[23][1] = GD2
  pixels[23][2] = GD2
  return { width: 24, height: 24, pixels }
})()

const item_bow: SpriteData = (() => {
  const pixels: string[][] = []
  for (let y = 0; y < 24; y++) pixels.push(Array(24).fill(_))
  // Bow curve (left side arc)
  const bowColor = BN
  const stringColor = '#C8B8A0'
  // Top limb
  for (let y2 = 2; y2 < 6; y2++) { pixels[y2][6] = bowColor; pixels[y2][7] = BD }
  for (let y2 = 6; y2 < 10; y2++) { pixels[y2][4] = bowColor; pixels[y2][5] = BD }
  for (let y2 = 10; y2 < 14; y2++) { pixels[y2][3] = bowColor; pixels[y2][4] = BD }
  for (let y2 = 14; y2 < 18; y2++) { pixels[y2][4] = bowColor; pixels[y2][5] = BD }
  for (let y2 = 18; y2 < 22; y2++) { pixels[y2][6] = bowColor; pixels[y2][7] = BD }
  // String
  for (let y2 = 2; y2 < 22; y2++) { pixels[y2][8] = stringColor }
  // Arrow
  for (let x = 8; x < 20; x++) { pixels[12][x] = SB }
  pixels[11][19] = SB
  pixels[13][19] = SB
  pixels[10][20] = SB
  pixels[14][20] = SB
  return { width: 24, height: 24, pixels }
})()

const item_shield: SpriteData = (() => {
  const pixels: string[][] = []
  for (let y = 0; y < 24; y++) pixels.push(Array(24).fill(_))
  // Shield shape (rounded rectangle tapering to point at bottom)
  for (let y2 = 2; y2 < 20; y2++) {
    const maxHalf = y2 < 5 ? 6 + y2 - 2 : y2 > 14 ? Math.max(0, 10 - (y2 - 14) * 2) : 10
    for (let dx = -maxHalf; dx <= maxHalf; dx++) {
      const x = 12 + dx
      if (x >= 0 && x < 24) {
        if (Math.abs(dx) >= maxHalf - 1) pixels[y2][x] = AD
        else if (y2 === 2 || (y2 > 14 && Math.abs(dx) >= maxHalf - 2)) pixels[y2][x] = AD
        else if (Math.abs(dx) < 3 || y2 === 10) pixels[y2][x] = GD2
        else pixels[y2][x] = SB
      }
    }
  }
  // Bottom point
  pixels[20][12] = AD
  pixels[21][12] = AD
  return { width: 24, height: 24, pixels }
})()

const item_potion_red: SpriteData = (() => {
  const pixels: string[][] = []
  for (let y = 0; y < 24; y++) pixels.push(Array(24).fill(_))
  // Cork
  for (let y2 = 3; y2 < 6; y2++) for (let x = 10; x < 14; x++) pixels[y2][x] = BL
  // Neck
  for (let y2 = 6; y2 < 10; y2++) for (let x = 10; x < 14; x++) pixels[y2][x] = ST
  // Body
  for (let y2 = 10; y2 < 21; y2++) {
    const half = y2 < 13 ? 2 + (y2 - 10) * 2 : 8
    for (let dx = -half; dx <= half; dx++) {
      const x = 12 + dx
      if (x >= 0 && x < 24) {
        if (Math.abs(dx) === half) pixels[y2][x] = ST
        else pixels[y2][x] = RP
      }
    }
  }
  // Bottom
  for (let x = 4; x < 20; x++) pixels[21][x] = ST
  // Highlight
  pixels[13][8] = '#FF8A80'
  pixels[14][8] = '#FF8A80'
  return { width: 24, height: 24, pixels }
})()

const item_potion_blue: SpriteData = (() => {
  const pixels: string[][] = []
  for (let y = 0; y < 24; y++) pixels.push(Array(24).fill(_))
  // Cork
  for (let y2 = 3; y2 < 6; y2++) for (let x = 10; x < 14; x++) pixels[y2][x] = BL
  // Neck
  for (let y2 = 6; y2 < 10; y2++) for (let x = 10; x < 14; x++) pixels[y2][x] = ST
  // Body
  for (let y2 = 10; y2 < 21; y2++) {
    const half = y2 < 13 ? 2 + (y2 - 10) * 2 : 8
    for (let dx = -half; dx <= half; dx++) {
      const x = 12 + dx
      if (x >= 0 && x < 24) {
        if (Math.abs(dx) === half) pixels[y2][x] = ST
        else pixels[y2][x] = BP
      }
    }
  }
  // Bottom
  for (let x = 4; x < 20; x++) pixels[21][x] = ST
  // Highlight
  pixels[13][8] = '#64B5F6'
  pixels[14][8] = '#64B5F6'
  return { width: 24, height: 24, pixels }
})()

const item_key: SpriteData = (() => {
  const pixels: string[][] = []
  for (let y = 0; y < 24; y++) pixels.push(Array(24).fill(_))
  // Key head (ring)
  for (let y2 = 3; y2 < 11; y2++) {
    for (let x = 3; x < 11; x++) {
      const dx = x - 7, dy = y2 - 7
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist >= 2 && dist <= 4) pixels[y2][x] = GD2
    }
  }
  // Shaft
  for (let x = 10; x < 20; x++) {
    pixels[6][x] = GD2
    pixels[7][x] = GD2
  }
  // Teeth
  pixels[8][17] = GD2
  pixels[9][17] = GD2
  pixels[8][19] = GD2
  pixels[9][19] = GD2
  pixels[10][19] = GD2
  return { width: 24, height: 24, pixels }
})()

const item_coin: SpriteData = (() => {
  const pixels: string[][] = []
  for (let y = 0; y < 24; y++) pixels.push(Array(24).fill(_))
  const goldDark = '#D4A800'
  for (let y2 = 4; y2 < 20; y2++) {
    for (let x = 4; x < 20; x++) {
      const dx = x - 12, dy = y2 - 12
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= 8) {
        if (dist > 6.5) pixels[y2][x] = goldDark
        else pixels[y2][x] = GD2
      }
    }
  }
  // Dollar sign or symbol in center
  for (let y2 = 8; y2 < 16; y2++) {
    pixels[y2][12] = goldDark
  }
  for (let x = 10; x < 15; x++) {
    pixels[9][x] = goldDark
    pixels[12][x] = goldDark
    pixels[15][x] = goldDark
  }
  return { width: 24, height: 24, pixels }
})()

// ============================================================
// DECORATIONS (various sizes)
// ============================================================

const deco_torch: SpriteData = (() => {
  const pixels: string[][] = []
  for (let y = 0; y < 32; y++) pixels.push(Array(16).fill(_))
  // Flame
  for (let y2 = 2; y2 < 10; y2++) {
    const half = y2 < 5 ? y2 - 1 : 10 - y2
    for (let dx = -half; dx <= half; dx++) {
      const x = 8 + dx
      if (x >= 0 && x < 16) {
        if (y2 < 5) pixels[y2][x] = LY
        else if (y2 < 7) pixels[y2][x] = LO
        else pixels[y2][x] = LV
      }
    }
  }
  // Stick
  for (let y2 = 10; y2 < 30; y2++) {
    pixels[y2][7] = BN
    pixels[y2][8] = BL
  }
  // Bracket
  pixels[12][5] = AM
  pixels[12][6] = AM
  pixels[12][9] = AM
  pixels[12][10] = AM
  return { width: 16, height: 32, pixels }
})()

const deco_sign: SpriteData = (() => {
  const pixels: string[][] = []
  for (let y = 0; y < 32; y++) pixels.push(Array(32).fill(_))
  // Sign board
  for (let y2 = 4; y2 < 18; y2++) {
    for (let x = 4; x < 28; x++) {
      if (y2 === 4 || y2 === 17 || x === 4 || x === 27) pixels[y2][x] = BD
      else pixels[y2][x] = BL
    }
  }
  // Post
  for (let y2 = 18; y2 < 32; y2++) {
    pixels[y2][15] = BD
    pixels[y2][16] = BN
  }
  return { width: 32, height: 32, pixels }
})()

const deco_chest: SpriteData = (() => {
  const pixels: string[][] = []
  for (let y = 0; y < 24; y++) pixels.push(Array(24).fill(_))
  // Lid (rounded top)
  for (let y2 = 4; y2 < 10; y2++) {
    for (let x = 4; x < 20; x++) {
      if (y2 === 4) pixels[y2][x] = BD
      else pixels[y2][x] = ((x + y2) % 3 === 0) ? BD : BN
    }
  }
  // Body
  for (let y2 = 10; y2 < 20; y2++) {
    for (let x = 4; x < 20; x++) {
      if (y2 === 10 || y2 === 19 || x === 4 || x === 19) pixels[y2][x] = BD
      else pixels[y2][x] = BN
    }
  }
  // Lock
  pixels[12][11] = GD2
  pixels[12][12] = GD2
  pixels[13][11] = GD2
  pixels[13][12] = GD2
  // Metal bands
  for (let x = 4; x < 20; x++) {
    pixels[10][x] = AM
    pixels[15][x] = AM
  }
  return { width: 24, height: 24, pixels }
})()

const deco_barrel: SpriteData = (() => {
  const pixels: string[][] = []
  for (let y = 0; y < 32; y++) pixels.push(Array(24).fill(_))
  // Barrel body (oval)
  for (let y2 = 4; y2 < 28; y2++) {
    const maxHalf = y2 < 8 ? 4 + (y2 - 4) * 2 : y2 > 24 ? Math.max(4, 12 - (y2 - 24) * 2) : 12
    for (let dx = -maxHalf; dx <= maxHalf; dx++) {
      const x = 12 + dx
      if (x >= 0 && x < 24) {
        if (Math.abs(dx) >= maxHalf - 1) pixels[y2][x] = BD
        else pixels[y2][x] = ((x + y2) % 4 === 0) ? BD : BN
      }
    }
  }
  // Metal bands
  for (let dx = -10; dx <= 10; dx++) {
    const x = 12 + dx
    if (x >= 0 && x < 24) {
      pixels[8][x] = AM
      pixels[16][x] = AM
      pixels[24][x] = AM
    }
  }
  return { width: 24, height: 32, pixels }
})()

const deco_rock: SpriteData = (() => {
  const pixels: string[][] = []
  for (let y = 0; y < 24; y++) pixels.push(Array(24).fill(_))
  // Rock blob
  for (let y2 = 6; y2 < 22; y2++) {
    const half = y2 < 10 ? 2 + (y2 - 6) * 2 : y2 > 18 ? Math.max(2, 10 - (y2 - 18) * 2) : 10
    for (let dx = -half; dx <= half; dx++) {
      const x = 12 + dx
      if (x >= 0 && x < 24) {
        const v = (x * 7 + y2 * 3) % 4
        if (v === 0) pixels[y2][x] = ST
        else if (v === 1) pixels[y2][x] = SN
        else pixels[y2][x] = SM
      }
    }
  }
  return { width: 24, height: 24, pixels }
})()

const deco_bush: SpriteData = (() => {
  const pixels: string[][] = []
  for (let y = 0; y < 24; y++) pixels.push(Array(32).fill(_))
  // Bush blob
  for (let y2 = 4; y2 < 22; y2++) {
    for (let x = 2; x < 30; x++) {
      const dx = x - 16, dy = (y2 - 13) * 1.5
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 14) {
        const v = (x * 5 + y2 * 11) % 4
        if (v === 0) pixels[y2][x] = LK
        else if (v === 1) pixels[y2][x] = GD
        else pixels[y2][x] = GR
      }
    }
  }
  return { width: 32, height: 24, pixels }
})()

const deco_flower: SpriteData = (() => {
  const pixels: string[][] = []
  for (let y = 0; y < 16; y++) pixels.push(Array(16).fill(_))
  // Stem
  for (let y2 = 8; y2 < 15; y2++) {
    pixels[y2][7] = GR
    pixels[y2][8] = GR
  }
  // Leaves
  pixels[11][5] = GR
  pixels[11][6] = GR
  pixels[10][9] = GR
  pixels[10][10] = GR
  // Petals (5-petal flower)
  const petalColor = RS
  const centerColor = LY
  // Top petal
  pixels[2][7] = petalColor; pixels[2][8] = petalColor
  pixels[3][7] = petalColor; pixels[3][8] = petalColor
  // Left petal
  pixels[4][5] = petalColor; pixels[5][5] = petalColor
  pixels[4][6] = petalColor; pixels[5][6] = petalColor
  // Right petal
  pixels[4][9] = petalColor; pixels[5][9] = petalColor
  pixels[4][10] = petalColor; pixels[5][10] = petalColor
  // Bottom-left petal
  pixels[6][6] = petalColor; pixels[7][6] = petalColor
  // Bottom-right petal
  pixels[6][9] = petalColor; pixels[7][9] = petalColor
  // Center
  pixels[4][7] = centerColor; pixels[4][8] = centerColor
  pixels[5][7] = centerColor; pixels[5][8] = centerColor
  return { width: 16, height: 16, pixels }
})()

const deco_crystal: SpriteData = (() => {
  const pixels: string[][] = []
  for (let y = 0; y < 32; y++) pixels.push(Array(24).fill(_))
  const crystalLight = '#CE93D8'
  const crystalMid = '#9C27B0'
  const crystalDark = '#6A1B9A'
  // Main crystal (tall hexagonal prism)
  for (let y2 = 2; y2 < 26; y2++) {
    const half = y2 < 6 ? y2 - 1 : y2 > 22 ? 26 - y2 : 5
    for (let dx = -half; dx <= half; dx++) {
      const x = 12 + dx
      if (x >= 0 && x < 24) {
        if (dx < -half / 2) pixels[y2][x] = crystalDark
        else if (dx > half / 2) pixels[y2][x] = crystalLight
        else pixels[y2][x] = crystalMid
      }
    }
  }
  // Small crystal left
  for (let y2 = 14; y2 < 24; y2++) {
    const half = y2 < 17 ? y2 - 14 : y2 > 21 ? 24 - y2 : 3
    for (let dx = -half; dx <= half; dx++) {
      const x = 6 + dx
      if (x >= 0 && x < 24) {
        pixels[y2][x] = dx < 0 ? crystalDark : crystalLight
      }
    }
  }
  // Small crystal right
  for (let y2 = 16; y2 < 26; y2++) {
    const half = y2 < 19 ? y2 - 16 : y2 > 23 ? 26 - y2 : 3
    for (let dx = -half; dx <= half; dx++) {
      const x = 18 + dx
      if (x >= 0 && x < 24) {
        pixels[y2][x] = dx < 0 ? crystalDark : crystalMid
      }
    }
  }
  // Base
  for (let x = 3; x < 21; x++) pixels[26][x] = SN
  for (let x = 4; x < 20; x++) pixels[27][x] = SM
  return { width: 24, height: 32, pixels }
})()

// ============================================================
// REGISTRY
// ============================================================

export const SPRITE_REGISTRY: Record<string, SpriteData> = {
  // Heroes
  hero_knight,
  hero_mage,
  hero_ranger,
  // Enemies
  enemy_skeleton,
  enemy_slime,
  enemy_bat,
  enemy_goblin,
  // NPCs
  npc_villager,
  npc_merchant,
  // Tiles
  tile_grass,
  tile_stone,
  tile_dirt,
  tile_sand,
  tile_wood,
  tile_brick,
  tile_ice,
  tile_lava,
  // Structures
  structure_castle,
  structure_house,
  structure_tower,
  structure_wall,
  // Trees
  tree_oak,
  tree_pine,
  tree_cactus,
  // Items
  item_sword,
  item_bow,
  item_shield,
  item_potion_red,
  item_potion_blue,
  item_key,
  item_coin,
  // Decorations
  deco_torch,
  deco_sign,
  deco_chest,
  deco_barrel,
  deco_rock,
  deco_bush,
  deco_flower,
  deco_crystal,
}

export function getAssetIds(): string[] {
  return Object.keys(SPRITE_REGISTRY)
}

export const ASSET_IDS = Object.keys(SPRITE_REGISTRY)
