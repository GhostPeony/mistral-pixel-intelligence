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

// --- Thief palette ---
const TK = '#2A2035' // thief cloak dark
const TM = '#3D2856' // thief cloak mid
const TL = '#4E3A6B' // thief cloak light

// --- Cleric palette ---
const WG = '#E0E0E0' // white-gray robe
const WS = '#C0C0C0' // white-silver robe shadow
const GT = '#DAA520' // gold trim
const GS = '#B8860B' // gold trim shadow
const CB = '#81D4FA' // crystal blue

// --- Spider palette ---
const SPD = '#3E2723' // spider dark brown
const SPM = '#5D4037' // spider mid brown
const SPL = '#795548' // spider light brown
const RE = '#E53935'  // red eyes

// --- Wolf palette ---
const WFD = '#616161' // wolf fur dark
const WFM = '#757575' // wolf fur mid
const WFL = '#9E9E9E' // wolf fur light
const AE = '#FFC107'  // amber eyes

// --- Orc palette ---
const OKD = '#3A6420' // orc skin dark
const OKM = '#4E7A2E' // orc skin mid
const OKL = '#5A9C3E' // orc skin light

// --- Zombie palette ---
const ZSD = '#558B2F' // zombie skin dark
const ZSM = '#7CB342' // zombie skin mid
const ZCL = '#795548' // zombie clothes brown

// --- Ghost palette ---
const GHL = '#E1F5FE' // ghost lightest
const GHM = '#B3E5FC' // ghost mid
const GHD = '#81D4FA' // ghost darker

// --- Snake palette ---
const NKD = '#2E7D32' // snake dark green
const NKM = '#4E7A2E' // snake mid green
const NKY = '#FFC107' // snake underbelly yellow

// --- Berserker palette ---
const WP = '#E53935' // war paint red (same as DR but explicit)
const FL = '#8B6240' // fur loincloth light
const FD = '#6B4423' // fur loincloth dark

// --- Witch palette ---
const WK = '#1A0E2A' // witch darkest
const WM = '#2A1A3E' // witch dark
const WL = '#3D2856' // witch mid (same as TM but explicit for witch)
const OG = '#9575CD' // orb glow mid
const OL = '#B39DDB' // orb glow light
const OD = '#7E57C2' // orb glow dark

// --- Dragon palette ---
const DRS1 = '#B71C1C' // dragon scales darkest
const DRS2 = '#C62828' // dragon scales dark
const DRS3 = '#D32F2F' // dragon scales mid
const DRS4 = '#E53935' // dragon scales light
const DWD = '#FF8F00' // dragon wing dark
const DWM = '#F57F17' // dragon wing mid
const DWL = '#FFB300' // dragon wing light
const DUB = '#FFD54F' // dragon underbelly
const DFR1 = '#FF9800' // dragon fire outer
const DFR2 = '#FFC107' // dragon fire mid
const DFR3 = '#FFEB3B' // dragon fire bright
const DHN = '#222222' // dragon horn
const DEY = '#FFC107' // dragon eye

// --- Golem palette ---
const GST1 = '#424242' // golem stone darkest
const GST2 = '#616161' // golem stone dark
const GST3 = '#757575' // golem stone mid
const GST4 = '#9E9E9E' // golem stone light
const GST5 = '#BDBDBD' // golem stone highlight
const GCR1 = '#7E57C2' // golem crystal dark
const GCR2 = '#9575CD' // golem crystal mid
const GCR3 = '#B39DDB' // golem crystal light
const GCR4 = '#D1C4E9' // golem crystal glow
const GMS = '#4CAF50' // golem moss

// --- Demon palette ---
const DMS1 = '#B71C1C' // demon skin darkest
const DMS2 = '#C62828' // demon skin dark
const DMS3 = '#D32F2F' // demon skin mid
const DMS4 = '#E53935' // demon skin highlight
const DWG1 = '#3E2723' // demon wing dark
const DWG2 = '#5D4037' // demon wing mid
const DWG3 = '#795548' // demon wing membrane
const DMH = '#222222' // demon horn/hoof
const DMH2 = '#333333' // demon horn light
const DME = '#FFC107' // demon eyes

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

const hero_thief: SpriteData = {
  width: 32, height: 32,
  pixels: [
    // Row 0-2: pointed hood tip
    row(32, [_, 13], [TK, 6], [_, 13]),
    row(32, [_, 12], [TK, 2], [TM, 4], [TK, 2], [_, 12]),
    row(32, [_, 11], [TK, 1], [TM, 8], [TK, 1], [_, 11]),
    // Row 3-4: hood widens
    row(32, [_, 10], [TK, 1], [TM, 10], [TK, 1], [_, 10]),
    row(32, [_, 9], [TK, 1], [TM, 4], [TL, 4], [TM, 4], [TK, 1], [_, 9]),
    // Row 5-8: face (partially shadowed by hood)
    row(32, [_, 9], [TK, 1], [TM, 1], [SD, 8], [TM, 1], [TK, 1], [_, 10]),
    row(32, [_, 10], [TM, 1], [SK, 2], [BK, 2], [SK, 2], [BK, 2], [SK, 2], [TM, 1], [_, 10]),
    row(32, [_, 10], [TM, 1], [SK, 10], [TM, 1], [_, 10]),
    row(32, [_, 11], [SK, 3], [SD, 4], [SK, 3], [_, 11]),
    // Row 9-10: neck/collar
    row(32, [_, 12], [SD, 8], [_, 12]),
    row(32, [_, 11], [TK, 1], [TM, 8], [TK, 1], [_, 11]),
    // Row 11-16: slim torso with cloak
    row(32, [_, 10], [TK, 1], [TM, 10], [TK, 1], [_, 10]),
    row(32, [_, 10], [TK, 1], [TM, 4], [TL, 2], [TM, 4], [TK, 1], [_, 10]),
    row(32, [_, 10], [TK, 1], [TM, 10], [TK, 1], [_, 10]),
    row(32, [_, 10], [TK, 1], [TM, 10], [TK, 1], [_, 10]),
    row(32, [_, 10], [TK, 1], [TM, 4], [BD, 2], [TM, 4], [TK, 1], [_, 10]),
    row(32, [_, 10], [TK, 1], [TM, 10], [TK, 1], [_, 10]),
    // Row 17-20: arms with daggers at sides
    row(32, [_, 7], [TM, 3], [TK, 1], [TM, 8], [TK, 1], [TM, 3], [_, 7]),
    row(32, [_, 6], [SD, 2], [TM, 1], [TK, 1], [TM, 8], [TK, 1], [TM, 1], [SD, 2], [_, 6]),
    row(32, [_, 5], [SD, 2], [AM, 1], [_, 1], [TK, 1], [TM, 8], [TK, 1], [_, 1], [AM, 1], [SD, 2], [_, 5]),
    row(32, [_, 5], [SK, 1], [AR, 2], [_, 1], [TK, 1], [TM, 8], [TK, 1], [_, 1], [AR, 2], [SK, 1], [_, 5]),
    // Row 21-23: belt with buckle, daggers visible
    row(32, [_, 8], [AR, 1], [_, 1], [BD, 10], [_, 1], [AR, 1], [_, 8]),
    row(32, [_, 10], [BN, 3], [GD2, 2], [BD, 3], [BN, 2], [_, 10]),
    row(32, [_, 10], [BD, 12], [_, 10]),
    // Row 24-28: legs (slim, agile)
    row(32, [_, 11], [TM, 4], [_, 2], [TM, 4], [_, 11]),
    row(32, [_, 11], [TM, 4], [_, 2], [TM, 4], [_, 11]),
    row(32, [_, 11], [TK, 4], [_, 2], [TK, 4], [_, 11]),
    row(32, [_, 11], [TK, 4], [_, 2], [TK, 4], [_, 11]),
    row(32, [_, 11], [TK, 4], [_, 2], [TK, 4], [_, 11]),
    // Row 29-31: boots
    row(32, [_, 10], [HD, 5], [_, 2], [HD, 5], [_, 10]),
    row(32, [_, 10], [HD, 5], [_, 2], [HD, 5], [_, 10]),
    row(32, [_, 10], [BD, 5], [_, 2], [BD, 5], [_, 10]),
  ],
}

const hero_cleric: SpriteData = {
  width: 32, height: 32,
  pixels: [
    // Row 0-1: staff crystal tip (extends above head)
    row(32, [_, 24], [CB, 3], [_, 5]),
    row(32, [_, 23], [CB, 1], [OL, 3], [CB, 1], [_, 4]),
    // Row 2-4: head with short hair, staff beside
    row(32, [_, 12], [HR, 8], [_, 4], [CB, 1], [BN, 1], [_, 6]),
    row(32, [_, 11], [HR, 10], [_, 3], [BN, 1], [_, 7]),
    row(32, [_, 11], [HR, 2], [SK, 6], [HR, 2], [_, 3], [BN, 1], [_, 7]),
    // Row 5-8: face
    row(32, [_, 11], [SK, 2], [BK, 2], [SK, 2], [BK, 2], [SK, 2], [_, 3], [BN, 1], [_, 7]),
    row(32, [_, 11], [SK, 10], [_, 3], [BN, 1], [_, 7]),
    row(32, [_, 11], [SK, 3], [RS, 4], [SK, 3], [_, 3], [BN, 1], [_, 7]),
    row(32, [_, 12], [SK, 8], [_, 4], [BN, 1], [_, 7]),
    // Row 9-10: neck and collar
    row(32, [_, 13], [SK, 6], [_, 5], [BN, 1], [_, 7]),
    row(32, [_, 11], [GT, 1], [WH, 8], [GT, 1], [_, 3], [BN, 1], [_, 7]),
    // Row 11-16: white robe with gold trim, staff alongside
    row(32, [_, 10], [GT, 1], [WH, 10], [GT, 1], [_, 2], [BN, 1], [_, 7]),
    row(32, [_, 9], [GT, 1], [WH, 12], [GT, 1], [_, 1], [BN, 1], [_, 7]),
    row(32, [_, 9], [WG, 1], [WH, 5], [GT, 2], [WH, 5], [WG, 1], [_, 1], [BN, 1], [_, 7]),
    row(32, [_, 9], [WG, 1], [WH, 12], [WG, 1], [_, 1], [BN, 1], [_, 7]),
    row(32, [_, 9], [WG, 1], [WH, 12], [WG, 1], [_, 1], [BN, 1], [_, 7]),
    row(32, [_, 9], [WS, 1], [WG, 12], [WS, 1], [_, 1], [BN, 1], [_, 7]),
    // Row 17-20: wide sleeves, arms reaching out
    row(32, [_, 5], [WH, 5], [WG, 12], [WH, 5], [BN, 1], [_, 4]),
    row(32, [_, 4], [WG, 3], [SK, 2], [WS, 1], [WG, 12], [WS, 1], [SK, 2], [WG, 1], [BN, 1], [_, 3]),
    row(32, [_, 4], [SK, 3], [_, 2], [WS, 1], [WG, 12], [WS, 1], [_, 1], [SK, 2], [BN, 1], [_, 3]),
    row(32, [_, 9], [WS, 14], [BN, 1], [_, 8]),
    // Row 21-23: belt area
    row(32, [_, 9], [GS, 1], [GT, 12], [GS, 1], [BN, 1], [_, 8]),
    row(32, [_, 9], [GT, 2], [GS, 2], [GT, 2], [GS, 2], [GT, 2], [GS, 2], [BN, 1], [_, 8]),
    row(32, [_, 9], [GS, 14], [_, 9]),
    // Row 24-28: flowing robe bottom (wider)
    row(32, [_, 8], [WG, 16], [_, 8]),
    row(32, [_, 7], [WG, 18], [_, 7]),
    row(32, [_, 7], [WG, 18], [_, 7]),
    row(32, [_, 7], [WS, 18], [_, 7]),
    row(32, [_, 7], [WS, 18], [_, 7]),
    // Row 29-31: robe hem and feet
    row(32, [_, 7], [GT, 18], [_, 7]),
    row(32, [_, 8], [WS, 16], [_, 8]),
    row(32, [_, 10], [BD, 5], [_, 2], [BD, 5], [_, 10]),
  ],
}

const hero_berserker: SpriteData = {
  width: 32, height: 32,
  pixels: [
    // Row 0-2: wild hair (broad)
    row(32, [_, 10], [HR, 2], [HD, 6], [HR, 2], [_, 12]),
    row(32, [_, 8], [HR, 3], [HD, 8], [HR, 3], [_, 10]),
    row(32, [_, 7], [HR, 2], [HD, 12], [HR, 2], [_, 7]),
    // Row 3-4: forehead with headband
    row(32, [_, 7], [HD, 2], [SK, 10], [HD, 2], [_, 9]),
    row(32, [_, 8], [DR, 14], [_, 10]),
    // Row 5-8: face with war paint
    row(32, [_, 8], [SK, 2], [WP, 1], [SK, 1], [BK, 2], [SK, 2], [BK, 2], [SK, 1], [WP, 1], [SK, 2], [_, 8]),
    row(32, [_, 8], [SK, 14], [_, 10]),
    row(32, [_, 8], [SK, 2], [WP, 2], [SK, 6], [WP, 2], [SK, 2], [_, 8]),
    row(32, [_, 9], [SK, 3], [SD, 4], [SK, 3], [_, 13]),
    // Row 9-10: thick neck
    row(32, [_, 10], [SK, 10], [_, 12]),
    row(32, [_, 10], [SD, 10], [_, 12]),
    // Row 11-15: bare broad chest with war paint stripes
    row(32, [_, 6], [SK, 20], [_, 6]),
    row(32, [_, 5], [SK, 22], [_, 5]),
    row(32, [_, 5], [SK, 4], [WP, 2], [SK, 10], [WP, 2], [SK, 4], [_, 5]),
    row(32, [_, 5], [SK, 5], [WP, 2], [SK, 8], [WP, 2], [SK, 5], [_, 5]),
    row(32, [_, 5], [SD, 6], [SK, 10], [SD, 6], [_, 5]),
    // Row 16-18: shoulders transition to arms, axe handle starts
    row(32, [_, 4], [SD, 3], [SK, 18], [SD, 3], [_, 4]),
    row(32, [_, 3], [SK, 3], [_, 1], [SD, 2], [SK, 12], [SD, 2], [_, 1], [SK, 3], [_, 3]),
    row(32, [_, 3], [SD, 2], [SK, 1], [_, 1], [SD, 1], [SK, 12], [SD, 1], [_, 1], [SK, 1], [SD, 2], [BN, 1], [_, 2]),
    // Row 19-21: arms extend, belt line, axe handle
    row(32, [_, 3], [SK, 2], [_, 3], [SD, 12], [_, 3], [SK, 2], [BN, 1], [_, 2]),
    row(32, [_, 9], [BD, 2], [FL, 8], [BD, 2], [_, 2], [BN, 1], [_, 6]),
    row(32, [_, 9], [FL, 2], [GD2, 2], [FD, 4], [GD2, 2], [FL, 2], [BN, 1], [_, 6]),
    // Row 22-23: fur loincloth with axe head appearing
    row(32, [_, 9], [FD, 14], [BN, 1], [_, 8]),
    row(32, [_, 10], [FL, 5], [_, 2], [FL, 5], [AM, 3], [_, 7]),
    // Row 24-27: legs, axe head at side
    row(32, [_, 10], [SK, 5], [_, 2], [SK, 5], [AD, 1], [AM, 3], [_, 6]),
    row(32, [_, 10], [SK, 5], [_, 2], [SK, 5], [_, 1], [AM, 3], [_, 4]),
    row(32, [_, 10], [SD, 5], [_, 2], [SD, 5], [_, 1], [AD, 2], [_, 5]),
    row(32, [_, 10], [SD, 5], [_, 2], [SD, 5], [_, 10]),
    // Row 28-29: lower legs
    row(32, [_, 10], [FD, 5], [_, 2], [FD, 5], [_, 10]),
    row(32, [_, 10], [FD, 5], [_, 2], [FD, 5], [_, 10]),
    // Row 30-31: fur-wrapped boots
    row(32, [_, 9], [FL, 6], [_, 2], [FL, 6], [_, 9]),
    row(32, [_, 9], [FD, 6], [_, 2], [FD, 6], [_, 9]),
  ],
}

const hero_witch: SpriteData = {
  width: 32, height: 32,
  pixels: [
    // Row 0-3: tall pointed hat (very tall — key silhouette feature)
    row(32, [_, 14], [WK, 2], [_, 16]),
    row(32, [_, 13], [WK, 1], [WM, 2], [WK, 1], [_, 15]),
    row(32, [_, 12], [WK, 1], [WM, 4], [WK, 1], [_, 14]),
    row(32, [_, 11], [WK, 1], [WM, 6], [WK, 1], [_, 13]),
    // Row 4-5: hat widens with band
    row(32, [_, 10], [WK, 1], [WM, 8], [WK, 1], [_, 12]),
    row(32, [_, 9], [WK, 1], [OG, 10], [WK, 1], [_, 11]),
    // Row 6-7: hat brim
    row(32, [_, 7], [WK, 18], [_, 7]),
    row(32, [_, 6], [WK, 20], [_, 6]),
    // Row 8-11: face
    row(32, [_, 10], [WK, 1], [SK, 10], [WK, 1], [_, 10]),
    row(32, [_, 10], [_, 1], [SK, 2], [BK, 2], [SK, 2], [BK, 2], [SK, 2], [_, 1], [_, 10]),
    row(32, [_, 11], [SK, 10], [_, 11]),
    row(32, [_, 11], [SK, 3], [PL, 4], [SK, 3], [_, 11]),
    // Row 12-13: neck and collar
    row(32, [_, 12], [SK, 8], [_, 12]),
    row(32, [_, 10], [WK, 1], [WM, 10], [WK, 1], [_, 10]),
    // Row 14-19: dark flowing robes
    row(32, [_, 9], [WK, 1], [WM, 12], [WK, 1], [_, 9]),
    row(32, [_, 9], [WK, 1], [WM, 5], [GD2, 2], [WM, 5], [WK, 1], [_, 9]),
    row(32, [_, 9], [WK, 1], [WM, 12], [WK, 1], [_, 9]),
    row(32, [_, 9], [WK, 1], [WL, 12], [WK, 1], [_, 9]),
    row(32, [_, 9], [WK, 1], [WM, 12], [WK, 1], [_, 9]),
    row(32, [_, 9], [WK, 1], [WM, 12], [WK, 1], [_, 9]),
    // Row 20-22: sleeves, one hand holds glowing orb
    row(32, [_, 6], [WM, 3], [WK, 1], [WM, 12], [WK, 1], [WM, 3], [_, 6]),
    row(32, [_, 5], [SK, 2], [WM, 1], [WK, 1], [WM, 12], [WK, 1], [WM, 1], [SK, 2], [_, 5]),
    row(32, [OG, 2], [OL, 1], [SK, 2], [_, 1], [WK, 1], [WM, 12], [WK, 1], [_, 1], [SK, 2], [_, 5]),
    // Row 23-24: orb glow and belt
    row(32, [OD, 1], [OG, 2], [OL, 1], [_, 5], [GT, 1], [GD2, 10], [GT, 1], [_, 9]),
    row(32, [_, 1], [OG, 1], [_, 7], [GS, 14], [_, 9]),
    // Row 25-28: robe flows out wide
    row(32, [_, 8], [WM, 16], [_, 8]),
    row(32, [_, 7], [WM, 18], [_, 7]),
    row(32, [_, 7], [WK, 18], [_, 7]),
    row(32, [_, 7], [WK, 18], [_, 7]),
    // Row 29-31: robe hem and feet
    row(32, [_, 7], [WK, 1], [WM, 16], [WK, 1], [_, 7]),
    row(32, [_, 8], [WK, 16], [_, 8]),
    row(32, [_, 10], [WK, 5], [_, 2], [WK, 5], [_, 10]),
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

const enemy_spider: SpriteData = {
  width: 32, height: 32,
  pixels: [
    // Row 0-3: empty top (spider is low-profile)
    ...Array(4).fill(row(32, [_, 32])),
    // Row 4-5: leg tips (outermost reach)
    row(32, [_, 2], [SPD, 2], [_, 8], [SPD, 2], [_, 4], [SPD, 2], [_, 8], [SPD, 2], [_, 2]),
    row(32, [_, 3], [SPD, 2], [_, 6], [SPM, 2], [_, 6], [SPM, 2], [_, 6], [SPD, 2], [_, 3]),
    // Row 6-7: upper legs spreading
    row(32, [_, 4], [SPD, 2], [_, 4], [SPM, 2], [_, 8], [SPM, 2], [_, 4], [SPD, 2], [_, 4]),
    row(32, [_, 5], [SPD, 2], [_, 2], [SPM, 2], [_, 10], [SPM, 2], [_, 2], [SPD, 2], [_, 5]),
    // Row 8-9: legs connect to body area
    row(32, [_, 6], [SPD, 2], [SPM, 2], [_, 12], [SPM, 2], [SPD, 2], [_, 6]),
    row(32, [_, 7], [SPM, 2], [_, 2], [SPD, 8], [_, 2], [SPM, 2], [_, 7]),
    // Row 10-11: body top with eyes
    row(32, [_, 9], [SPD, 2], [SPM, 10], [SPD, 2], [_, 9]),
    row(32, [_, 8], [SPD, 2], [SPM, 3], [RE, 2], [SPM, 2], [RE, 2], [SPM, 3], [SPD, 2], [_, 8]),
    // Row 12-14: body center (round)
    row(32, [_, 8], [SPD, 1], [SPM, 4], [SPL, 4], [SPM, 4], [SPD, 1], [_, 8]),
    row(32, [_, 8], [SPD, 1], [SPM, 3], [SPL, 6], [SPM, 3], [SPD, 1], [_, 8]),
    row(32, [_, 8], [SPD, 1], [SPM, 4], [SPL, 4], [SPM, 4], [SPD, 1], [_, 8]),
    // Row 15-16: body bottom with markings
    row(32, [_, 8], [SPD, 2], [SPM, 3], [SPD, 2], [SPM, 2], [SPD, 2], [SPM, 3], [SPD, 2], [_, 8]),
    row(32, [_, 9], [SPD, 2], [SPM, 10], [SPD, 2], [_, 9]),
    // Row 17-18: lower body taper + abdomen attachment
    row(32, [_, 10], [SPD, 1], [SPM, 10], [SPD, 1], [_, 10]),
    row(32, [_, 9], [SPD, 1], [SPM, 4], [SPD, 4], [SPM, 4], [SPD, 1], [_, 9]),
    // Row 19-21: abdomen (larger, patterned)
    row(32, [_, 8], [SPD, 2], [SPM, 12], [SPD, 2], [_, 8]),
    row(32, [_, 7], [SPD, 2], [SPM, 3], [SPD, 2], [SPL, 4], [SPD, 2], [SPM, 3], [SPD, 2], [_, 7]),
    row(32, [_, 7], [SPD, 1], [SPM, 4], [SPL, 6], [SPM, 4], [SPD, 1], [_, 7]),
    // Row 22-23: abdomen lower
    row(32, [_, 7], [SPD, 2], [SPM, 3], [SPD, 2], [SPL, 4], [SPD, 2], [SPM, 3], [SPD, 2], [_, 7]),
    row(32, [_, 8], [SPD, 2], [SPM, 12], [SPD, 2], [_, 8]),
    // Row 24-25: legs underneath
    row(32, [_, 6], [SPD, 2], [SPM, 2], [_, 12], [SPM, 2], [SPD, 2], [_, 6]),
    row(32, [_, 5], [SPD, 2], [_, 2], [SPM, 2], [_, 10], [SPM, 2], [_, 2], [SPD, 2], [_, 5]),
    // Row 26-27: lower leg spread
    row(32, [_, 4], [SPD, 2], [_, 4], [SPM, 2], [_, 8], [SPM, 2], [_, 4], [SPD, 2], [_, 4]),
    row(32, [_, 3], [SPD, 2], [_, 6], [SPM, 2], [_, 6], [SPM, 2], [_, 6], [SPD, 2], [_, 3]),
    // Row 28-29: leg tips bottom
    row(32, [_, 2], [SPD, 2], [_, 8], [SPD, 2], [_, 4], [SPD, 2], [_, 8], [SPD, 2], [_, 2]),
    row(32, [_, 1], [SPD, 2], [_, 10], [SPD, 2], [_, 2], [SPD, 2], [_, 10], [SPD, 2], [_, 1]),
    // Row 30-31: lowest leg tips
    row(32, [SPD, 2], [_, 12], [SPD, 2], [_, 0], [SPD, 2], [_, 12], [SPD, 2]),
    row(32, [_, 32]),
  ],
}

const enemy_wolf: SpriteData = {
  width: 32, height: 32,
  pixels: [
    // Row 0-5: empty top
    ...Array(6).fill(row(32, [_, 32])),
    // Row 6-7: ears
    row(32, [_, 5], [WFD, 2], [_, 3], [WFD, 2], [_, 20]),
    row(32, [_, 4], [WFD, 1], [WFM, 2], [_, 1], [WFM, 2], [WFD, 1], [_, 21]),
    // Row 8-9: head top
    row(32, [_, 4], [WFD, 1], [WFM, 8], [WFD, 1], [_, 18]),
    row(32, [_, 4], [WFM, 10], [_, 18]),
    // Row 10-11: face with eyes
    row(32, [_, 4], [WFM, 2], [AE, 2], [WFM, 2], [AE, 2], [WFM, 2], [_, 18]),
    row(32, [_, 4], [WFM, 2], [BK, 2], [WFM, 2], [BK, 2], [WFM, 2], [_, 18]),
    // Row 12-13: snout
    row(32, [_, 3], [WFM, 12], [_, 17]),
    row(32, [_, 2], [WFM, 3], [WFL, 4], [BK, 1], [WFL, 4], [WFM, 2], [_, 16]),
    // Row 14: jaw with fangs
    row(32, [_, 3], [WFM, 2], [WH, 1], [DR, 4], [WH, 1], [WFM, 2], [_, 19]),
    // Row 15-16: neck
    row(32, [_, 5], [WFM, 10], [WFD, 2], [_, 15]),
    row(32, [_, 6], [WFM, 4], [WFD, 2], [WFM, 4], [WFD, 2], [_, 14]),
    // Row 17-19: body front
    row(32, [_, 8], [WFD, 2], [WFM, 12], [WFD, 2], [_, 8]),
    row(32, [_, 7], [WFD, 1], [WFM, 4], [WFL, 6], [WFM, 4], [WFD, 1], [_, 9]),
    row(32, [_, 7], [WFD, 1], [WFM, 3], [WFL, 8], [WFM, 3], [WFD, 1], [_, 9]),
    // Row 20-21: body mid
    row(32, [_, 7], [WFD, 1], [WFM, 3], [WFL, 8], [WFM, 3], [WFD, 1], [_, 9]),
    row(32, [_, 7], [WFD, 1], [WFM, 4], [WFL, 6], [WFM, 4], [WFD, 1], [_, 9]),
    // Row 22-23: body rear with tail
    row(32, [_, 8], [WFD, 1], [WFM, 14], [WFD, 1], [_, 8]),
    row(32, [_, 8], [WFD, 1], [WFM, 12], [WFD, 1], [WFM, 4], [WFD, 2], [_, 4]),
    // Row 24: tail + haunch
    row(32, [_, 8], [WFD, 1], [WFM, 12], [WFD, 1], [_, 1], [WFM, 3], [WFD, 1], [WFL, 2], [WFD, 1], [_, 2]),
    // Row 25: tail tip
    row(32, [_, 9], [WFM, 12], [_, 2], [WFD, 1], [WFM, 3], [WFD, 1], [_, 4]),
    // Row 26-27: legs
    row(32, [_, 8], [WFM, 3], [_, 4], [WFM, 3], [_, 4], [WFM, 3], [_, 7]),
    row(32, [_, 8], [WFM, 3], [_, 4], [WFM, 3], [_, 4], [WFM, 3], [_, 7]),
    // Row 28-29: lower legs
    row(32, [_, 8], [WFD, 3], [_, 4], [WFD, 3], [_, 4], [WFD, 3], [_, 7]),
    row(32, [_, 8], [WFD, 3], [_, 4], [WFD, 3], [_, 4], [WFD, 3], [_, 7]),
    // Row 30-31: paws
    row(32, [_, 7], [BK, 4], [_, 4], [BK, 4], [_, 3], [BK, 4], [_, 6]),
    row(32, [_, 7], [BK, 4], [_, 4], [BK, 4], [_, 3], [BK, 4], [_, 6]),
  ],
}

const enemy_orc: SpriteData = {
  width: 32, height: 32,
  pixels: [
    // Row 0-2: head top
    row(32, [_, 11], [OKD, 10], [_, 11]),
    row(32, [_, 10], [OKD, 12], [_, 10]),
    row(32, [_, 9], [OKM, 14], [_, 9]),
    // Row 3-4: brow ridge
    row(32, [_, 9], [OKD, 2], [OKM, 10], [OKD, 2], [_, 9]),
    row(32, [_, 9], [OKM, 14], [_, 9]),
    // Row 5-6: face with eyes
    row(32, [_, 9], [OKM, 2], [AE, 2], [OKM, 6], [AE, 2], [OKM, 2], [_, 9]),
    row(32, [_, 9], [OKM, 2], [BK, 2], [OKM, 6], [BK, 2], [OKM, 2], [_, 9]),
    // Row 7-8: nose and mouth area
    row(32, [_, 9], [OKM, 5], [OKD, 4], [OKM, 5], [_, 9]),
    row(32, [_, 9], [OKM, 2], [WH, 2], [OKM, 6], [WH, 2], [OKM, 2], [_, 9]),
    // Row 9-10: chin/jaw (tusks visible)
    row(32, [_, 9], [OKM, 1], [WH, 1], [OKM, 10], [WH, 1], [OKM, 1], [_, 9]),
    row(32, [_, 10], [OKM, 12], [_, 10]),
    // Row 11-12: neck
    row(32, [_, 12], [OKM, 8], [_, 12]),
    row(32, [_, 11], [OKD, 10], [_, 11]),
    // Row 13-17: armored torso
    row(32, [_, 9], [BD, 1], [BN, 12], [BD, 1], [_, 9]),
    row(32, [_, 8], [BD, 1], [BN, 14], [BD, 1], [_, 8]),
    row(32, [_, 8], [BD, 1], [BN, 6], [AD, 2], [BN, 6], [BD, 1], [_, 8]),
    row(32, [_, 8], [BD, 1], [BN, 5], [AM, 4], [BN, 5], [BD, 1], [_, 8]),
    row(32, [_, 8], [BD, 1], [BN, 14], [BD, 1], [_, 8]),
    // Row 18-20: arms holding weapon
    row(32, [_, 5], [OKM, 3], [BD, 1], [BN, 14], [BD, 1], [OKM, 3], [_, 5]),
    row(32, [_, 4], [OKM, 3], [_, 1], [BD, 14], [_, 1], [OKM, 3], [BN, 1], [_, 5]),
    row(32, [_, 4], [OKL, 2], [_, 2], [BD, 14], [_, 2], [OKL, 2], [BN, 1], [_, 3]),
    // Row 21: weapon handle
    row(32, [_, 4], [OKL, 2], [_, 2], [BD, 14], [_, 2], [OKL, 1], [BN, 1], [SM, 2], [_, 2]),
    // Row 22-24: belt and lower torso
    row(32, [_, 9], [BK, 14], [_, 9]),
    row(32, [_, 9], [BD, 5], [GD2, 4], [BD, 5], [_, 9]),
    row(32, [_, 9], [BK, 14], [_, 9]),
    // Row 25-28: legs
    row(32, [_, 10], [OKM, 5], [_, 2], [OKM, 5], [_, 10]),
    row(32, [_, 10], [OKM, 5], [_, 2], [OKM, 5], [_, 10]),
    row(32, [_, 10], [OKD, 5], [_, 2], [OKD, 5], [_, 10]),
    row(32, [_, 10], [OKD, 5], [_, 2], [OKD, 5], [_, 10]),
    // Row 29-31: boots
    row(32, [_, 9], [BD, 6], [_, 2], [BD, 6], [_, 9]),
    row(32, [_, 9], [BD, 6], [_, 2], [BD, 6], [_, 9]),
    row(32, [_, 9], [BK, 6], [_, 2], [BK, 6], [_, 9]),
  ],
}

const enemy_zombie: SpriteData = {
  width: 32, height: 32,
  pixels: [
    // Row 0-2: messy hair/head top
    row(32, [_, 11], [HD, 3], [_, 2], [HD, 3], [_, 13]),
    row(32, [_, 10], [HD, 2], [ZSM, 8], [HD, 2], [_, 10]),
    row(32, [_, 9], [HD, 1], [ZSM, 12], [HD, 1], [_, 9]),
    // Row 3-4: forehead
    row(32, [_, 9], [ZSM, 14], [_, 9]),
    row(32, [_, 9], [ZSD, 2], [ZSM, 10], [ZSD, 2], [_, 9]),
    // Row 5-6: face with hollow eyes
    row(32, [_, 9], [ZSM, 2], [BK, 3], [ZSM, 4], [BK, 3], [ZSM, 2], [_, 9]),
    row(32, [_, 9], [ZSM, 2], [BK, 3], [ZSM, 4], [BK, 3], [ZSM, 2], [_, 9]),
    // Row 7-8: nose and mouth (gaping)
    row(32, [_, 9], [ZSM, 5], [ZSD, 4], [ZSM, 5], [_, 9]),
    row(32, [_, 9], [ZSM, 3], [BK, 1], [ZSD, 6], [BK, 1], [ZSM, 3], [_, 9]),
    // Row 9-10: jaw
    row(32, [_, 10], [ZSM, 12], [_, 10]),
    row(32, [_, 12], [ZSD, 8], [_, 12]),
    // Row 11: neck (thin, tilted)
    row(32, [_, 12], [ZSD, 4], [BW, 2], [ZSD, 2], [_, 12]),
    // Row 12-13: shoulders (slouched)
    row(32, [_, 8], [ZCL, 2], [_, 1], [ZCL, 10], [_, 1], [ZCL, 2], [_, 8]),
    row(32, [_, 8], [ZCL, 16], [_, 8]),
    // Row 14-17: torn torso clothing
    row(32, [_, 8], [ZCL, 6], [_, 2], [ZCL, 8], [_, 8]),
    row(32, [_, 8], [ZCL, 5], [ZSD, 3], [ZCL, 8], [_, 8]),
    row(32, [_, 8], [ZCL, 4], [ZSD, 4], [ZCL, 8], [_, 8]),
    row(32, [_, 8], [ZCL, 16], [_, 8]),
    // Row 18-20: arms reaching forward
    row(32, [_, 3], [ZSM, 4], [ZSD, 2], [ZCL, 14], [_, 2], [ZSM, 3], [_, 4]),
    row(32, [_, 2], [ZSM, 3], [_, 4], [ZCL, 14], [_, 4], [ZSM, 2], [_, 3]),
    row(32, [_, 1], [ZSD, 3], [_, 5], [ZCL, 12], [_, 5], [ZSD, 3], [_, 3]),
    // Row 21-22: hands (bony fingers)
    row(32, [BW, 2], [ZSD, 1], [_, 6], [ZCL, 12], [_, 6], [ZSD, 1], [BW, 2], [_, 2]),
    row(32, [_, 32]),
    // Row 23-24: belt/waist
    row(32, [_, 10], [BD, 12], [_, 10]),
    row(32, [_, 10], [ZCL, 12], [_, 10]),
    // Row 25-28: legs (shambling)
    row(32, [_, 10], [ZCL, 5], [_, 3], [ZCL, 4], [_, 10]),
    row(32, [_, 10], [ZSD, 5], [_, 3], [ZSD, 4], [_, 10]),
    row(32, [_, 10], [ZSD, 5], [_, 3], [ZSD, 4], [_, 10]),
    row(32, [_, 10], [ZSD, 5], [_, 4], [ZSD, 4], [_, 9]),
    // Row 29-31: feet (dragging)
    row(32, [_, 9], [BD, 6], [_, 4], [BD, 5], [_, 8]),
    row(32, [_, 9], [BD, 6], [_, 5], [BD, 5], [_, 7]),
    row(32, [_, 9], [BD, 7], [_, 5], [BD, 5], [_, 6]),
  ],
}

const enemy_ghost: SpriteData = {
  width: 32, height: 32,
  pixels: [
    // Row 0-2: empty top
    ...Array(3).fill(row(32, [_, 32])),
    // Row 3-5: head top (ethereal glow)
    row(32, [_, 13], [GHL, 6], [_, 13]),
    row(32, [_, 11], [GHL, 2], [GHM, 6], [GHL, 2], [_, 11]),
    row(32, [_, 10], [GHL, 1], [GHM, 10], [GHL, 1], [_, 10]),
    // Row 6-8: face
    row(32, [_, 9], [GHL, 1], [GHM, 12], [GHL, 1], [_, 9]),
    row(32, [_, 9], [GHM, 3], [BK, 3], [GHM, 2], [BK, 3], [GHM, 3], [_, 9]),
    row(32, [_, 9], [GHM, 3], [BK, 3], [GHM, 2], [BK, 3], [GHM, 3], [_, 9]),
    // Row 9-10: mouth area
    row(32, [_, 9], [GHM, 5], [BK, 4], [GHM, 5], [_, 9]),
    row(32, [_, 9], [GHL, 1], [GHM, 12], [GHL, 1], [_, 9]),
    // Row 11-13: upper body
    row(32, [_, 8], [GHL, 1], [GHM, 14], [GHL, 1], [_, 8]),
    row(32, [_, 8], [GHM, 16], [_, 8]),
    row(32, [_, 7], [GHL, 1], [GHM, 16], [GHL, 1], [_, 7]),
    // Row 14-16: arms spreading ghostly
    row(32, [_, 5], [GHL, 2], [GHM, 18], [GHL, 2], [_, 5]),
    row(32, [_, 4], [GHL, 2], [GHM, 6], [GHD, 4], [GHM, 6], [GHL, 2], [_, 8]),
    row(32, [_, 5], [GHL, 1], [GHM, 18], [GHL, 1], [_, 7]),
    // Row 17-19: body
    row(32, [_, 6], [GHM, 18], [_, 8]),
    row(32, [_, 7], [GHL, 1], [GHM, 16], [_, 8]),
    row(32, [_, 7], [GHM, 16], [GHL, 1], [_, 8]),
    // Row 20-22: fading body
    row(32, [_, 8], [GHM, 14], [_, 10]),
    row(32, [_, 9], [GHM, 12], [GHL, 1], [_, 10]),
    row(32, [_, 9], [GHL, 1], [GHM, 10], [GHL, 1], [_, 11]),
    // Row 23-25: wispy taper
    row(32, [_, 10], [GHM, 10], [_, 12]),
    row(32, [_, 11], [GHL, 1], [GHM, 6], [GHL, 1], [_, 13]),
    row(32, [_, 12], [GHM, 6], [_, 14]),
    // Row 26-28: wispy tail getting thinner
    row(32, [_, 13], [GHL, 1], [GHM, 4], [_, 14]),
    row(32, [_, 14], [GHM, 2], [GHL, 1], [_, 15]),
    row(32, [_, 14], [GHL, 1], [GHM, 2], [_, 15]),
    // Row 29-31: final wisps
    row(32, [_, 15], [GHL, 2], [_, 15]),
    row(32, [_, 16], [GHL, 1], [_, 15]),
    row(32, [_, 32]),
  ],
}

const enemy_snake: SpriteData = {
  width: 32, height: 32,
  pixels: [
    // Row 0-4: empty top space
    ...Array(5).fill(row(32, [_, 32])),
    // Row 5-6: tongue and head top
    row(32, [_, 6], [RE, 1], [_, 1], [RE, 1], [_, 23]),
    row(32, [_, 7], [RE, 2], [_, 23]),
    // Row 7-8: head
    row(32, [_, 6], [NKD, 2], [NKM, 4], [NKD, 2], [_, 18]),
    row(32, [_, 5], [NKD, 1], [NKM, 2], [AE, 1], [NKM, 2], [AE, 1], [NKM, 2], [NKD, 1], [_, 17]),
    // Row 9-10: head sides and neck
    row(32, [_, 5], [NKD, 1], [NKM, 8], [NKD, 1], [_, 17]),
    row(32, [_, 6], [NKD, 1], [NKM, 6], [NKD, 1], [_, 18]),
    // Row 11-12: neck curving into coil
    row(32, [_, 7], [NKD, 1], [NKM, 4], [NKD, 1], [_, 19]),
    row(32, [_, 8], [NKD, 1], [NKM, 4], [NKD, 1], [_, 18]),
    // Row 13-14: coil top layer
    row(32, [_, 9], [NKD, 1], [NKM, 12], [NKD, 1], [_, 9]),
    row(32, [_, 8], [NKD, 1], [NKM, 4], [NKD, 2], [NKM, 4], [NKD, 2], [NKM, 2], [NKD, 1], [_, 8]),
    // Row 15-16: upper coil body
    row(32, [_, 7], [NKD, 1], [NKM, 3], [NKD, 1], [_, 4], [NKD, 1], [NKM, 4], [NKD, 1], [_, 2], [NKD, 1], [NKM, 3], [NKD, 1], [_, 3]),
    row(32, [_, 7], [NKD, 1], [NKY, 3], [NKD, 1], [_, 4], [NKD, 1], [NKY, 4], [NKD, 1], [_, 2], [NKD, 1], [NKY, 3], [NKD, 1], [_, 2]),
    // Row 17-18: mid coil
    row(32, [_, 7], [NKD, 1], [NKM, 3], [NKD, 1], [_, 4], [NKD, 1], [NKM, 4], [NKD, 1], [_, 2], [NKD, 1], [NKM, 3], [NKD, 1], [_, 2]),
    row(32, [_, 8], [NKD, 1], [NKM, 3], [NKD, 1], [_, 2], [NKD, 1], [NKM, 4], [NKD, 1], [_, 3], [NKD, 1], [NKM, 2], [NKD, 1], [_, 3]),
    // Row 19-20: lower coil visible
    row(32, [_, 9], [NKD, 1], [NKM, 3], [NKD, 1], [NKM, 6], [NKD, 1], [NKM, 2], [NKD, 1], [_, 7]),
    row(32, [_, 9], [NKD, 1], [NKY, 3], [NKD, 1], [NKY, 6], [NKD, 1], [NKY, 2], [NKD, 1], [_, 7]),
    // Row 21-22: coil body
    row(32, [_, 8], [NKD, 1], [NKM, 14], [NKD, 1], [_, 8]),
    row(32, [_, 8], [NKD, 1], [NKM, 3], [NKD, 2], [NKM, 4], [NKD, 2], [NKM, 3], [NKD, 1], [_, 8]),
    // Row 23-24: coil bottom layers
    row(32, [_, 9], [NKD, 1], [NKM, 12], [NKD, 1], [_, 9]),
    row(32, [_, 9], [NKD, 1], [NKY, 12], [NKD, 1], [_, 9]),
    // Row 25-26: base coil
    row(32, [_, 10], [NKD, 1], [NKM, 10], [NKD, 1], [_, 10]),
    row(32, [_, 10], [NKD, 1], [NKM, 3], [NKD, 2], [NKM, 3], [NKD, 1], [_, 12]),
    // Row 27-28: tail tip emerging
    row(32, [_, 11], [NKD, 1], [NKM, 6], [NKD, 1], [_, 13]),
    row(32, [_, 12], [NKD, 1], [NKM, 4], [NKD, 1], [_, 14]),
    // Row 29-30: tail point
    row(32, [_, 13], [NKD, 1], [NKM, 2], [NKD, 1], [_, 15]),
    row(32, [_, 14], [NKD, 2], [_, 16]),
    // Row 31: empty
    row(32, [_, 32]),
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
// BOSSES (48x48)
// ============================================================

const boss_dragon: SpriteData = (() => {
  const pixels: string[][] = []
  for (let y = 0; y < 48; y++) pixels.push(Array(48).fill(_))

  // --- Horns (rows 0-5) ---
  // Left horn
  pixels[0][17] = DHN; pixels[0][18] = DHN
  pixels[1][16] = DHN; pixels[1][17] = DHN; pixels[1][18] = DHN
  pixels[2][16] = DHN; pixels[2][17] = DHN; pixels[2][18] = DHN
  pixels[3][17] = DHN; pixels[3][18] = DHN; pixels[3][19] = DHN
  pixels[4][18] = DHN; pixels[4][19] = DHN; pixels[4][20] = DHN
  pixels[5][19] = DHN; pixels[5][20] = DHN

  // Right horn
  pixels[0][29] = DHN; pixels[0][30] = DHN
  pixels[1][29] = DHN; pixels[1][30] = DHN; pixels[1][31] = DHN
  pixels[2][29] = DHN; pixels[2][30] = DHN; pixels[2][31] = DHN
  pixels[3][28] = DHN; pixels[3][29] = DHN; pixels[3][30] = DHN
  pixels[4][27] = DHN; pixels[4][28] = DHN; pixels[4][29] = DHN
  pixels[5][27] = DHN; pixels[5][28] = DHN

  // --- Head (rows 4-11) ---
  for (let y2 = 4; y2 <= 11; y2++) {
    const topInset = Math.max(0, 4 - (y2 - 4))
    const left = 20 + topInset
    const right = 27 - topInset
    for (let x = left; x <= right; x++) {
      if (x === left || x === right) pixels[y2][x] = DRS1
      else if (x === left + 1 || x === right - 1) pixels[y2][x] = DRS2
      else pixels[y2][x] = DRS3
    }
  }
  // Crest ridges on top of head
  for (let x = 21; x <= 26; x += 2) {
    pixels[4][x] = DRS1
    pixels[3][x] = DRS2
  }

  // Eyes (row 7-8)
  pixels[7][21] = DEY; pixels[7][22] = BK
  pixels[8][21] = DEY; pixels[8][22] = BK
  pixels[7][25] = BK; pixels[7][26] = DEY
  pixels[8][25] = BK; pixels[8][26] = DEY

  // Snout (rows 9-11)
  for (let x = 21; x <= 26; x++) {
    pixels[9][x] = DRS3
    pixels[10][x] = DRS2
  }
  pixels[10][22] = BK; pixels[10][25] = BK // nostrils

  // --- Fire breath (rows 12-18, coming from mouth) ---
  // Mouth opening
  pixels[11][22] = DRS1; pixels[11][23] = DFR1; pixels[11][24] = DFR1; pixels[11][25] = DRS1
  // Fire expanding downward/forward
  for (let y2 = 12; y2 <= 18; y2++) {
    const spread = Math.floor((y2 - 12) * 1.5)
    const cx = 23
    for (let dx = -1 - spread; dx <= 1 + spread; dx++) {
      const x = cx + dx
      if (x >= 0 && x < 48) {
        const dist = Math.abs(dx)
        if (dist <= 1) pixels[y2][x] = DFR3
        else if (dist <= 2 + (y2 - 12) / 2) pixels[y2][x] = DFR2
        else pixels[y2][x] = DFR1
      }
    }
  }

  // --- Neck (rows 12-16) ---
  for (let y2 = 12; y2 <= 16; y2++) {
    for (let x = 19; x <= 21; x++) pixels[y2][x] = DRS2
    for (let x = 26; x <= 28; x++) pixels[y2][x] = DRS2
    // Neck connects head to body on the sides of the fire
  }

  // --- Wings (rows 6-28, wide span) ---
  // Left wing
  for (let y2 = 6; y2 <= 28; y2++) {
    const wingProgress = (y2 - 6) / 22
    // Wing arm (leading edge)
    const armX = Math.floor(18 - wingProgress * 16)
    if (armX >= 0) {
      pixels[y2][armX] = DRS1
      if (armX + 1 < 19) pixels[y2][armX + 1] = DRS2
    }
    // Wing membrane
    if (y2 >= 10 && y2 <= 26) {
      const memStart = Math.max(1, armX + 2)
      const memEnd = 18
      for (let x = memStart; x <= memEnd; x++) {
        const t = (x - memStart) / Math.max(1, memEnd - memStart)
        if ((x + y2) % 6 === 0) pixels[y2][x] = DWD // vein lines
        else if (t < 0.3) pixels[y2][x] = DWD
        else if (t < 0.7) pixels[y2][x] = DWM
        else pixels[y2][x] = DWL
      }
    }
    // Wing fingers / structural ribs
    if (y2 >= 8 && y2 <= 26 && (y2 - 8) % 4 === 0) {
      const ribEnd = Math.max(1, armX + 1)
      for (let x = ribEnd; x <= 18; x++) {
        pixels[y2][x] = DRS1
      }
    }
  }

  // Right wing (mirror)
  for (let y2 = 6; y2 <= 28; y2++) {
    const wingProgress = (y2 - 6) / 22
    const armX = Math.floor(29 + wingProgress * 16)
    if (armX < 48) {
      pixels[y2][armX] = DRS1
      if (armX - 1 > 28) pixels[y2][armX - 1] = DRS2
    }
    if (y2 >= 10 && y2 <= 26) {
      const memStart = 29
      const memEnd = Math.min(46, armX - 2)
      for (let x = memStart; x <= memEnd; x++) {
        const t = (x - memStart) / Math.max(1, memEnd - memStart)
        if ((x + y2) % 6 === 0) pixels[y2][x] = DWD
        else if (t > 0.7) pixels[y2][x] = DWD
        else if (t > 0.3) pixels[y2][x] = DWM
        else pixels[y2][x] = DWL
      }
    }
    if (y2 >= 8 && y2 <= 26 && (y2 - 8) % 4 === 0) {
      const ribEnd = Math.min(46, armX - 1)
      for (let x = 29; x <= ribEnd; x++) {
        pixels[y2][x] = DRS1
      }
    }
  }

  // --- Body / torso (rows 17-32) ---
  for (let y2 = 17; y2 <= 32; y2++) {
    const bodyHalf = y2 < 22 ? 6 : y2 < 28 ? 7 : 6 - Math.floor((y2 - 28) / 2)
    const cx = 24
    for (let dx = -bodyHalf; dx <= bodyHalf; dx++) {
      const x = cx + dx
      if (x >= 0 && x < 48) {
        const absDx = Math.abs(dx)
        if (absDx >= bodyHalf - 1) pixels[y2][x] = DRS1
        else if (absDx >= bodyHalf - 2) pixels[y2][x] = DRS2
        else if (dx < -1) pixels[y2][x] = DRS3
        else if (dx > 1) pixels[y2][x] = DRS3
        else pixels[y2][x] = DUB // underbelly center stripe
      }
    }
  }
  // Underbelly horizontal bands (detail)
  for (let y2 = 18; y2 <= 31; y2 += 2) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = 24 + dx
      if (pixels[y2][x] === DUB) pixels[y2][x] = '#FFC44D' // slightly diff shade band
    }
  }

  // --- Legs (rows 30-40) ---
  // Left leg
  for (let y2 = 30; y2 <= 40; y2++) {
    const legX = 20 + Math.floor((y2 - 30) * 0.3)
    for (let dx = 0; dx < 4; dx++) {
      const x = legX + dx
      if (x >= 0 && x < 48) {
        pixels[y2][x] = dx === 0 || dx === 3 ? DRS1 : DRS3
      }
    }
  }
  // Left claws
  pixels[41][20] = DHN; pixels[41][21] = DHN; pixels[41][22] = DRS2
  pixels[41][23] = DHN; pixels[41][24] = DHN

  // Right leg
  for (let y2 = 30; y2 <= 40; y2++) {
    const legX = 26 - Math.floor((y2 - 30) * 0.3)
    for (let dx = 0; dx < 4; dx++) {
      const x = legX + dx
      if (x >= 0 && x < 48) {
        pixels[y2][x] = dx === 0 || dx === 3 ? DRS1 : DRS3
      }
    }
  }
  // Right claws
  pixels[41][25] = DHN; pixels[41][26] = DHN; pixels[41][27] = DRS2
  pixels[41][28] = DHN; pixels[41][29] = DHN

  // --- Tail (rows 28-47, curving to the right) ---
  for (let i = 0; i <= 20; i++) {
    const t = i / 20
    const ty = 28 + Math.floor(i * 0.85)
    const tx = 30 + Math.floor(Math.sin(t * Math.PI) * 10)
    if (ty < 48 && tx < 48 && tx >= 0) {
      const thickness = Math.max(1, Math.floor(3 * (1 - t * 0.6)))
      for (let dt = -thickness; dt <= thickness; dt++) {
        const yy = ty + dt
        if (yy >= 0 && yy < 48) {
          if (Math.abs(dt) === thickness) pixels[yy][tx] = DRS1
          else pixels[yy][tx] = DRS3
          if (tx + 1 < 48) pixels[yy][tx + 1] = DRS2
        }
      }
    }
  }
  // Tail tip spade
  pixels[44][38] = DRS4; pixels[44][39] = DRS1; pixels[44][40] = DRS4
  pixels[45][37] = DRS4; pixels[45][38] = DRS1; pixels[45][39] = DRS1; pixels[45][40] = DRS1; pixels[45][41] = DRS4
  pixels[46][38] = DRS4; pixels[46][39] = DRS1; pixels[46][40] = DRS4

  return { width: 48, height: 48, pixels }
})()

const boss_golem: SpriteData = (() => {
  const pixels: string[][] = []
  for (let y = 0; y < 48; y++) pixels.push(Array(48).fill(_))

  // --- Head (rows 2-10, small relative to body) ---
  for (let y2 = 2; y2 <= 10; y2++) {
    const headHalf = y2 < 4 ? 3 : y2 < 8 ? 4 : 3
    const cx = 24
    for (let dx = -headHalf; dx <= headHalf; dx++) {
      const x = cx + dx
      if (x >= 0 && x < 48) {
        const absDx = Math.abs(dx)
        if (absDx >= headHalf) pixels[y2][x] = GST1
        else if ((x + y2) % 5 === 0) pixels[y2][x] = GST4 // stone texture
        else if ((x + y2) % 3 === 0) pixels[y2][x] = GST2
        else pixels[y2][x] = GST3
      }
    }
  }

  // Eyes (glowing crystal, rows 5-7)
  pixels[5][22] = GCR2; pixels[5][23] = GCR3
  pixels[6][22] = GCR3; pixels[6][23] = GCR4
  pixels[5][25] = GCR3; pixels[5][26] = GCR2
  pixels[6][25] = GCR4; pixels[6][26] = GCR3

  // Brow ridge
  for (let x = 20; x <= 28; x++) pixels[4][x] = GST1
  pixels[3][21] = GST1; pixels[3][27] = GST1

  // Mouth crevice
  pixels[8][22] = GST1; pixels[8][23] = GST1; pixels[8][24] = GST1; pixels[8][25] = GST1; pixels[8][26] = GST1

  // --- Neck (rows 10-12) thick ---
  for (let y2 = 10; y2 <= 12; y2++) {
    for (let x = 19; x <= 29; x++) {
      pixels[y2][x] = (x + y2) % 4 === 0 ? GST4 : GST2
    }
  }

  // --- Massive torso (rows 13-32) ---
  for (let y2 = 13; y2 <= 32; y2++) {
    // Torso expands from top, widest in middle
    let half: number
    if (y2 < 17) half = 10 + (y2 - 13)
    else if (y2 < 28) half = 14
    else half = 14 - Math.floor((y2 - 28) * 0.8)
    const cx = 24
    for (let dx = -half; dx <= half; dx++) {
      const x = cx + dx
      if (x >= 0 && x < 48) {
        const absDx = Math.abs(dx)
        // Edge shading
        if (absDx >= half - 1) pixels[y2][x] = GST1
        else if (absDx >= half - 3) pixels[y2][x] = GST2
        else {
          // Interior stone texture with cracks
          const v = (x * 7 + y2 * 13) % 11
          if (v === 0) pixels[y2][x] = GST1 // crack
          else if (v < 3) pixels[y2][x] = GST4 // highlight
          else if (v < 6) pixels[y2][x] = GST2
          else pixels[y2][x] = GST3
        }
      }
    }
  }

  // --- Crystal core in chest (rows 17-25, centered) ---
  const coreCx = 24, coreCy = 21
  for (let y2 = 17; y2 <= 25; y2++) {
    for (let x = 20; x <= 28; x++) {
      const dx = x - coreCx, dy = y2 - coreCy
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 2) pixels[y2][x] = GCR4 // bright center
      else if (dist < 3) pixels[y2][x] = GCR3
      else if (dist < 4) pixels[y2][x] = GCR2
      else if (dist < 5) pixels[y2][x] = GCR1
    }
  }
  // Crystal glow emanating outward
  pixels[19][18] = GCR1; pixels[19][30] = GCR1
  pixels[21][17] = GCR1; pixels[21][31] = GCR1
  pixels[23][18] = GCR1; pixels[23][30] = GCR1

  // --- Moss patches ---
  const mossSpots = [
    [14, 13], [14, 14], [15, 12], [15, 13],
    [26, 33], [26, 34], [27, 34], [27, 35],
    [30, 15], [30, 16], [31, 16],
    [16, 34], [17, 33], [17, 34],
  ]
  for (const [my, mx] of mossSpots) {
    if (my < 48 && mx < 48 && pixels[my][mx] !== _) {
      pixels[my][mx] = GMS
    }
  }

  // --- Arms (rows 14-36, massive fists) ---
  // Left arm
  for (let y2 = 14; y2 <= 30; y2++) {
    const armOffset = Math.floor((y2 - 14) * 0.5)
    const armLeft = 8 - armOffset
    const armRight = 12 - armOffset
    for (let x = Math.max(0, armLeft); x <= Math.min(47, armRight); x++) {
      if (x === armLeft || x === armRight) pixels[y2][x] = GST1
      else pixels[y2][x] = (x + y2) % 3 === 0 ? GST4 : GST2
    }
    // Connecting to shoulder
    if (y2 <= 18) {
      for (let x = armRight + 1; x < 24 - 14 + (y2 - 13); x++) {
        if (pixels[y2][x] === _) pixels[y2][x] = GST2
      }
    }
  }
  // Left fist (huge, rows 31-36)
  for (let y2 = 31; y2 <= 36; y2++) {
    const fistHalf = y2 < 34 ? 5 : 4
    const fistCx = 5
    for (let dx = -fistHalf; dx <= fistHalf; dx++) {
      const x = fistCx + dx
      if (x >= 0 && x < 48) {
        if (Math.abs(dx) >= fistHalf) pixels[y2][x] = GST1
        else pixels[y2][x] = (x + y2) % 4 === 0 ? GST4 : GST3
      }
    }
  }
  // Fist cracks
  pixels[33][4] = GST1; pixels[34][5] = GST1; pixels[33][6] = GST1

  // Right arm
  for (let y2 = 14; y2 <= 30; y2++) {
    const armOffset = Math.floor((y2 - 14) * 0.5)
    const armLeft = 35 + armOffset
    const armRight = 39 + armOffset
    for (let x = Math.max(0, armLeft); x <= Math.min(47, armRight); x++) {
      if (x === armLeft || x === armRight) pixels[y2][x] = GST1
      else pixels[y2][x] = (x + y2) % 3 === 0 ? GST4 : GST2
    }
    if (y2 <= 18) {
      for (let x = 24 + 14 - (y2 - 13); x < armLeft; x++) {
        if (pixels[y2][x] === _) pixels[y2][x] = GST2
      }
    }
  }
  // Right fist
  for (let y2 = 31; y2 <= 36; y2++) {
    const fistHalf = y2 < 34 ? 5 : 4
    const fistCx = 42
    for (let dx = -fistHalf; dx <= fistHalf; dx++) {
      const x = fistCx + dx
      if (x >= 0 && x < 48) {
        if (Math.abs(dx) >= fistHalf) pixels[y2][x] = GST1
        else pixels[y2][x] = (x + y2) % 4 === 0 ? GST4 : GST3
      }
    }
  }
  pixels[33][41] = GST1; pixels[34][42] = GST1; pixels[33][43] = GST1

  // --- Legs (rows 33-44, wide stance) ---
  // Left leg
  for (let y2 = 33; y2 <= 44; y2++) {
    const legHalf = y2 < 38 ? 4 : 5
    const legCx = 18
    for (let dx = -legHalf; dx <= legHalf; dx++) {
      const x = legCx + dx
      if (x >= 0 && x < 48) {
        if (Math.abs(dx) >= legHalf) pixels[y2][x] = GST1
        else pixels[y2][x] = (x + y2) % 5 === 0 ? GST4 : GST3
      }
    }
  }
  // Left foot
  for (let x = 12; x <= 24; x++) {
    pixels[45][x] = GST1
    pixels[46][x] = GST2
    pixels[47][x] = GST1
  }

  // Right leg
  for (let y2 = 33; y2 <= 44; y2++) {
    const legHalf = y2 < 38 ? 4 : 5
    const legCx = 30
    for (let dx = -legHalf; dx <= legHalf; dx++) {
      const x = legCx + dx
      if (x >= 0 && x < 48) {
        if (Math.abs(dx) >= legHalf) pixels[y2][x] = GST1
        else pixels[y2][x] = (x + y2) % 5 === 0 ? GST4 : GST3
      }
    }
  }
  // Right foot
  for (let x = 24; x <= 36; x++) {
    pixels[45][x] = GST1
    pixels[46][x] = GST2
    pixels[47][x] = GST1
  }

  // --- Shoulder boulders (rows 11-16) ---
  // Left shoulder
  for (let y2 = 11; y2 <= 16; y2++) {
    for (let x = 10; x <= 17; x++) {
      const dx = x - 13, dy = y2 - 13
      if (dx * dx + dy * dy <= 12) {
        pixels[y2][x] = Math.abs(dx) + Math.abs(dy) > 3 ? GST1 : GST3
      }
    }
  }
  // Right shoulder
  for (let y2 = 11; y2 <= 16; y2++) {
    for (let x = 31; x <= 38; x++) {
      const dx = x - 35, dy = y2 - 13
      if (dx * dx + dy * dy <= 12) {
        pixels[y2][x] = Math.abs(dx) + Math.abs(dy) > 3 ? GST1 : GST3
      }
    }
  }

  return { width: 48, height: 48, pixels }
})()

const boss_demon: SpriteData = (() => {
  const pixels: string[][] = []
  for (let y = 0; y < 48; y++) pixels.push(Array(48).fill(_))

  // --- Horns (rows 0-7, curving upward and outward) ---
  // Left horn (curves up-left)
  const leftHorn = [
    [7, 17], [6, 16], [5, 15], [4, 14], [3, 14], [2, 13], [1, 13], [0, 12],
    [7, 18], [6, 17], [5, 16], [4, 15], [3, 15], [2, 14], [1, 14], [0, 13],
  ]
  for (const [hy, hx] of leftHorn) {
    pixels[hy][hx] = hy < 3 ? DMH : DMH2
  }

  // Right horn (curves up-right, mirror)
  const rightHorn = [
    [7, 30], [6, 31], [5, 32], [4, 33], [3, 33], [2, 34], [1, 34], [0, 35],
    [7, 29], [6, 30], [5, 31], [4, 32], [3, 32], [2, 33], [1, 33], [0, 34],
  ]
  for (const [hy, hx] of rightHorn) {
    pixels[hy][hx] = hy < 3 ? DMH : DMH2
  }

  // --- Head (rows 5-13) ---
  for (let y2 = 5; y2 <= 13; y2++) {
    const headHalf = y2 < 7 ? 3 + (y2 - 5) : y2 < 11 ? 5 : 5 - (y2 - 11)
    const cx = 24
    for (let dx = -headHalf; dx <= headHalf; dx++) {
      const x = cx + dx
      if (x >= 0 && x < 48) {
        const absDx = Math.abs(dx)
        if (absDx >= headHalf) pixels[y2][x] = DMS1
        else if (absDx >= headHalf - 1) pixels[y2][x] = DMS2
        else pixels[y2][x] = DMS3
      }
    }
  }

  // Brow ridge (thick, menacing)
  for (let x = 20; x <= 28; x++) pixels[7][x] = DMS1
  pixels[7][19] = DMS1; pixels[7][29] = DMS1

  // Glowing eyes (rows 8-9)
  pixels[8][21] = DME; pixels[8][22] = DME; pixels[8][23] = BK
  pixels[9][21] = BK; pixels[9][22] = DME
  pixels[8][24] = BK; pixels[8][25] = DME; pixels[8][26] = DME
  pixels[9][25] = DME; pixels[9][26] = BK

  // Mouth / fangs (row 11-12)
  pixels[11][22] = DMS1; pixels[11][23] = BK; pixels[11][24] = BK; pixels[11][25] = DMS1
  pixels[12][21] = WH; pixels[12][22] = BK; pixels[12][23] = BK; pixels[12][24] = BK; pixels[12][25] = BK; pixels[12][26] = WH

  // --- Neck (rows 13-15, muscular) ---
  for (let y2 = 13; y2 <= 15; y2++) {
    for (let x = 20; x <= 28; x++) {
      pixels[y2][x] = (x + y2) % 3 === 0 ? DMS1 : DMS2
    }
  }

  // --- Wings (rows 6-34, bat-style) ---
  // Left wing
  for (let y2 = 6; y2 <= 34; y2++) {
    const wingProgress = (y2 - 6) / 28
    // Wing arm (leading bone edge)
    const armX = Math.floor(18 - wingProgress * 17)
    if (armX >= 0) {
      pixels[y2][armX] = DWG1
      if (armX + 1 < 18) pixels[y2][armX + 1] = DWG1
    }
    // Wing membrane (thin, translucent look)
    if (y2 >= 10 && y2 <= 32) {
      const memStart = Math.max(1, armX + 2)
      const memEnd = 18
      for (let x = memStart; x <= memEnd; x++) {
        if ((x + y2) % 7 === 0) pixels[y2][x] = DWG1 // vein
        else if ((x + y2) % 3 === 0) pixels[y2][x] = DWG3 // lighter membrane
        else pixels[y2][x] = DWG2
      }
    }
    // Wing finger bones
    if (y2 >= 8 && y2 <= 32 && (y2 - 8) % 5 === 0) {
      const ribEnd = Math.max(0, armX + 1)
      for (let x = ribEnd; x <= 18; x++) {
        pixels[y2][x] = DWG1
      }
    }
  }

  // Right wing (mirror)
  for (let y2 = 6; y2 <= 34; y2++) {
    const wingProgress = (y2 - 6) / 28
    const armX = Math.floor(29 + wingProgress * 17)
    if (armX < 48) {
      pixels[y2][armX] = DWG1
      if (armX - 1 > 29) pixels[y2][armX - 1] = DWG1
    }
    if (y2 >= 10 && y2 <= 32) {
      const memStart = 29
      const memEnd = Math.min(46, armX - 2)
      for (let x = memStart; x <= memEnd; x++) {
        if ((x + y2) % 7 === 0) pixels[y2][x] = DWG1
        else if ((x + y2) % 3 === 0) pixels[y2][x] = DWG3
        else pixels[y2][x] = DWG2
      }
    }
    if (y2 >= 8 && y2 <= 32 && (y2 - 8) % 5 === 0) {
      const ribEnd = Math.min(47, armX - 1)
      for (let x = 29; x <= ribEnd; x++) {
        pixels[y2][x] = DWG1
      }
    }
  }

  // --- Muscular torso (rows 16-30) ---
  for (let y2 = 16; y2 <= 30; y2++) {
    let half: number
    if (y2 < 20) half = 5 + (y2 - 16)
    else if (y2 < 27) half = 9
    else half = 9 - (y2 - 27)
    const cx = 24
    for (let dx = -half; dx <= half; dx++) {
      const x = cx + dx
      if (x >= 0 && x < 48) {
        const absDx = Math.abs(dx)
        if (absDx >= half) pixels[y2][x] = DMS1
        else if (absDx >= half - 2) pixels[y2][x] = DMS2
        else {
          // Muscle definition lines
          if ((y2 === 20 || y2 === 24) && absDx < 3) pixels[y2][x] = DMS1
          else if (y2 >= 18 && y2 <= 26 && absDx === 3) pixels[y2][x] = DMS1
          else if (absDx <= 1) pixels[y2][x] = DMS4 // center highlight
          else pixels[y2][x] = DMS3
        }
      }
    }
  }

  // Chest scar / rune marking
  pixels[19][23] = DMS4; pixels[19][25] = DMS4
  pixels[20][24] = DMS4
  pixels[21][23] = DMS4; pixels[21][25] = DMS4

  // --- Arms (rows 17-30, muscular) ---
  // Left arm
  for (let y2 = 17; y2 <= 30; y2++) {
    const armX = 14 - Math.floor((y2 - 17) * 0.3)
    for (let dx = 0; dx < 4; dx++) {
      const x = armX + dx
      if (x >= 0 && x < 48) {
        pixels[y2][x] = dx === 0 || dx === 3 ? DMS1 : DMS3
      }
    }
  }
  // Left claws
  pixels[31][11] = DMH; pixels[31][12] = DMH; pixels[31][13] = DMH
  pixels[32][10] = DMH; pixels[32][13] = DMH

  // Right arm
  for (let y2 = 17; y2 <= 30; y2++) {
    const armX = 31 + Math.floor((y2 - 17) * 0.3)
    for (let dx = 0; dx < 4; dx++) {
      const x = armX + dx
      if (x >= 0 && x < 48) {
        pixels[y2][x] = dx === 0 || dx === 3 ? DMS1 : DMS3
      }
    }
  }
  // Right claws
  pixels[31][34] = DMH; pixels[31][35] = DMH; pixels[31][36] = DMH
  pixels[32][34] = DMH; pixels[32][37] = DMH

  // --- Digitigrade legs (rows 30-44) ---
  // Left leg - upper thigh
  for (let y2 = 30; y2 <= 36; y2++) {
    const legCx = 20
    for (let dx = -3; dx <= 3; dx++) {
      const x = legCx + dx
      if (x >= 0 && x < 48) {
        pixels[y2][x] = Math.abs(dx) >= 3 ? DMS1 : DMS3
      }
    }
  }
  // Left leg - backward knee bend
  for (let y2 = 37; y2 <= 40; y2++) {
    const bend = 19 - (y2 - 37)
    for (let dx = -2; dx <= 2; dx++) {
      const x = bend + dx
      if (x >= 0 && x < 48) {
        pixels[y2][x] = Math.abs(dx) >= 2 ? DMS1 : DMS2
      }
    }
  }
  // Left leg - lower (forward angle to hoof)
  for (let y2 = 41; y2 <= 44; y2++) {
    const shin = 17 + (y2 - 41) * 1
    for (let dx = -2; dx <= 2; dx++) {
      const x = shin + dx
      if (x >= 0 && x < 48) {
        pixels[y2][x] = Math.abs(dx) >= 2 ? DMS1 : DMS2
      }
    }
  }
  // Left hoof
  pixels[45][18] = DMH; pixels[45][19] = DMH; pixels[45][20] = DMH; pixels[45][21] = DMH
  pixels[46][17] = DMH; pixels[46][18] = DMH; pixels[46][19] = DMH; pixels[46][20] = DMH; pixels[46][21] = DMH
  pixels[47][17] = DMH; pixels[47][18] = DMH; pixels[47][19] = DMH; pixels[47][20] = DMH; pixels[47][21] = DMH

  // Right leg - upper thigh
  for (let y2 = 30; y2 <= 36; y2++) {
    const legCx = 28
    for (let dx = -3; dx <= 3; dx++) {
      const x = legCx + dx
      if (x >= 0 && x < 48) {
        pixels[y2][x] = Math.abs(dx) >= 3 ? DMS1 : DMS3
      }
    }
  }
  // Right leg - backward knee bend
  for (let y2 = 37; y2 <= 40; y2++) {
    const bend = 29 + (y2 - 37)
    for (let dx = -2; dx <= 2; dx++) {
      const x = bend + dx
      if (x >= 0 && x < 48) {
        pixels[y2][x] = Math.abs(dx) >= 2 ? DMS1 : DMS2
      }
    }
  }
  // Right leg - lower (forward angle to hoof)
  for (let y2 = 41; y2 <= 44; y2++) {
    const shin = 31 - (y2 - 41) * 1
    for (let dx = -2; dx <= 2; dx++) {
      const x = shin + dx
      if (x >= 0 && x < 48) {
        pixels[y2][x] = Math.abs(dx) >= 2 ? DMS1 : DMS2
      }
    }
  }
  // Right hoof
  pixels[45][27] = DMH; pixels[45][28] = DMH; pixels[45][29] = DMH; pixels[45][30] = DMH
  pixels[46][27] = DMH; pixels[46][28] = DMH; pixels[46][29] = DMH; pixels[46][30] = DMH; pixels[46][31] = DMH
  pixels[47][27] = DMH; pixels[47][28] = DMH; pixels[47][29] = DMH; pixels[47][30] = DMH; pixels[47][31] = DMH

  // --- Tail (rows 28-42, thin whip-like) ---
  for (let i = 0; i <= 16; i++) {
    const t = i / 16
    const ty = 28 + Math.floor(i * 0.9)
    const tx = 24 + Math.floor(Math.sin(t * Math.PI * 1.5) * 8)
    if (ty < 48 && tx >= 0 && tx < 48) {
      pixels[ty][tx] = DMS1
      if (tx + 1 < 48) pixels[ty][tx + 1] = DMS2
    }
  }
  // Tail barb
  pixels[42][31] = DMS4; pixels[43][30] = DMS1; pixels[43][31] = DMS1; pixels[43][32] = DMS4

  return { width: 48, height: 48, pixels }
})()

// ============================================================
// REGISTRY
// ============================================================

export const SPRITE_REGISTRY: Record<string, SpriteData> = {
  // Heroes
  hero_knight,
  hero_mage,
  hero_ranger,
  hero_thief,
  hero_cleric,
  hero_berserker,
  hero_witch,
  // Enemies
  enemy_skeleton,
  enemy_slime,
  enemy_bat,
  enemy_goblin,
  enemy_spider,
  enemy_wolf,
  enemy_orc,
  enemy_zombie,
  enemy_ghost,
  enemy_snake,
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
  // Bosses
  boss_dragon,
  boss_golem,
  boss_demon,
}

export function getAssetIds(): string[] {
  return Object.keys(SPRITE_REGISTRY)
}

export const ASSET_IDS = Object.keys(SPRITE_REGISTRY)
