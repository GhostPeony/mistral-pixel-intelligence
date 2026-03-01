/**
 * NPC Dialogue System
 * Defines voice lines per NPC type with ElevenLabs voice IDs and weighted random selection.
 */

export interface DialogueLine {
  id: string
  text: string
  weight: number
}

export interface NPCDialogueProfile {
  npcType: string
  voiceId: string
  lines: DialogueLine[]
  cooldownMs: number
}

const DEFAULT_DIALOGUE: NPCDialogueProfile[] = [
  {
    npcType: 'npc_guard',
    voiceId: 'pNInz6obpgDQGcFmaJgB',  // "Adam" — deep, authoritative
    cooldownMs: 25000,
    lines: [
      { id: 'guard_1', text: 'Move along, citizen.', weight: 30 },
      { id: 'guard_2', text: 'Keep your weapons sheathed in town.', weight: 25 },
      { id: 'guard_3', text: 'I used to be an adventurer like you.', weight: 20 },
      { id: 'guard_4', text: 'The roads aren\'t safe after dark.', weight: 15 },
      { id: 'guard_5', text: 'Stay out of trouble.', weight: 10 },
    ],
  },
  {
    npcType: 'npc_blacksmith',
    voiceId: 'VR6AewLTigWG4xSOukaG',  // "Arnold" — gruff, strong
    cooldownMs: 25000,
    lines: [
      { id: 'smith_1', text: 'Need something forged?', weight: 30 },
      { id: 'smith_2', text: 'Steel doesn\'t shape itself.', weight: 25 },
      { id: 'smith_3', text: 'That blade of yours could use some work.', weight: 20 },
      { id: 'smith_4', text: 'Finest weapons in the realm, right here.', weight: 15 },
      { id: 'smith_5', text: 'The forge burns day and night.', weight: 10 },
    ],
  },
  {
    npcType: 'npc_healer',
    voiceId: '21m00Tcm4TlvDq8ikWAM',  // "Rachel" — warm, gentle
    cooldownMs: 25000,
    lines: [
      { id: 'healer_1', text: 'You look weary, traveler.', weight: 30 },
      { id: 'healer_2', text: 'Let me tend to your wounds.', weight: 25 },
      { id: 'healer_3', text: 'The herbs are fresh today.', weight: 20 },
      { id: 'healer_4', text: 'Rest is the best medicine.', weight: 15 },
      { id: 'healer_5', text: 'Be careful out there.', weight: 10 },
    ],
  },
  {
    npcType: 'npc_elder',
    voiceId: 'SOYHLrjzK2X1ezoPC6cr',  // "Harry" — older, wise
    cooldownMs: 30000,
    lines: [
      { id: 'elder_1', text: 'Ah, the young ones always rush ahead.', weight: 30 },
      { id: 'elder_2', text: 'I remember when these lands were peaceful.', weight: 25 },
      { id: 'elder_3', text: 'Wisdom comes at a price, child.', weight: 20 },
      { id: 'elder_4', text: 'There are dark things stirring in the east.', weight: 15 },
      { id: 'elder_5', text: 'Heed an old man\'s warning.', weight: 10 },
    ],
  },
  {
    npcType: 'npc_villager',
    voiceId: 'EXAVITQu4vr4xnSDxMaL',  // "Sarah" — casual, friendly
    cooldownMs: 20000,
    lines: [
      { id: 'villager_1', text: 'Nice weather today, isn\'t it?', weight: 30 },
      { id: 'villager_2', text: 'Have you seen the merchant\'s new wares?', weight: 25 },
      { id: 'villager_3', text: 'I heard strange noises last night.', weight: 20 },
      { id: 'villager_4', text: 'Welcome to our little village.', weight: 15 },
      { id: 'villager_5', text: 'Don\'t wander too far from town.', weight: 10 },
    ],
  },
  {
    npcType: 'npc_merchant',
    voiceId: 'onwK4e9ZLuTAKqWW03F9',  // "Daniel" — energetic, persuasive
    cooldownMs: 20000,
    lines: [
      { id: 'merchant_1', text: 'Finest goods in the land, friend!', weight: 30 },
      { id: 'merchant_2', text: 'Special prices, just for you.', weight: 25 },
      { id: 'merchant_3', text: 'You won\'t find a better deal anywhere.', weight: 20 },
      { id: 'merchant_4', text: 'Take a look at my wares!', weight: 15 },
      { id: 'merchant_5', text: 'Everything must go!', weight: 10 },
    ],
  },
]

export class DialogueManager {
  private profiles = new Map<string, NPCDialogueProfile>()

  constructor() {
    for (const profile of DEFAULT_DIALOGUE) {
      this.profiles.set(profile.npcType, profile)
    }
  }

  getProfile(npcType: string): NPCDialogueProfile | undefined {
    return this.profiles.get(npcType)
  }

  /** Weighted random line selection (same algo as loot tables). */
  pickLine(npcType: string): DialogueLine | null {
    const profile = this.profiles.get(npcType)
    if (!profile || profile.lines.length === 0) return null

    const totalWeight = profile.lines.reduce((sum, l) => sum + l.weight, 0)
    let roll = Math.random() * totalWeight

    for (const line of profile.lines) {
      roll -= line.weight
      if (roll <= 0) return line
    }

    return profile.lines[profile.lines.length - 1]
  }
}
