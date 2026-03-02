import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DatasetBuilder } from '../dataset-builder.js'
import { scoreTrace, classifyTier } from '../scorer.js'
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'

const TEST_DIR = join(process.cwd(), '.test-integration')

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true })
})

afterEach(() => {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true })
})

describe('Pipeline Integration', () => {
  const mockCorrection = {
    type: 'correction',
    prompt: 'Build a haunted castle with skeleton guards',
    rejected: {
      entities: [
        { id: 'e1', name: 'castle', components: { sprite: { assetId: 'struct_castle' }, position: { x: 100, y: 200 } } },
        { id: 'e2', name: 'skeleton', components: { sprite: { assetId: 'enemy_skeleton' }, position: { x: 150, y: 200 } } },
      ],
      toolCalls: [{ name: 'spawn_entities', arguments: '{}' }],
      cognitive: {
        thinking: 'The player wants a haunted castle with guards. I will spawn a castle and one skeleton.',
        plan: 'Spawn castle, then add a skeleton guard next to it.',
      },
    },
    chosen: {
      entities: [
        { id: 'e1', name: 'castle', components: { sprite: { assetId: 'struct_castle' }, position: { x: 100, y: 200 } } },
        { id: 'e2', name: 'skeleton_1', components: { sprite: { assetId: 'enemy_skeleton' }, position: { x: 200, y: 200 } } },
        { id: 'e3', name: 'skeleton_2', components: { sprite: { assetId: 'enemy_skeleton' }, position: { x: 300, y: 200 } } },
        { id: 'e4', name: 'torch_1', components: { sprite: { assetId: 'deco_torch' }, position: { x: 90, y: 180 } } },
        { id: 'e5', name: 'torch_2', components: { sprite: { assetId: 'deco_torch' }, position: { x: 110, y: 180 } } },
      ],
      toolCalls: [
        { name: 'spawn_entities', arguments: '{}' },
        { name: 'move_entity', arguments: '{}' },
        { name: 'add_behavior', arguments: '{}' },
      ],
      cognitive: {
        thinking: 'Player wanted more guards and decoration. Adding second skeleton and torches.',
        reflection: 'Spreading entities apart and adding atmosphere with torches.',
      },
    },
    feedback: 'Added 3 entities. Modified 1 entity.',
    critiques: ['spread skeletons apart', 'add torches to entrance'],
    attempts: 3,
    cognitive: {
      thinking: 'Player wants a haunted castle scene with multiple guards.',
      plan: 'Castle + skeleton guards + decorative torches for atmosphere.',
      reflection: 'Initial attempt had too few entities, needed more spacing and decoration.',
    },
    context: { model: 'mistral-large-latest', sessionId: 'test', timestamp: new Date().toISOString(), canvasSize: { width: 800, height: 600 } },
  }

  const mockSuccess = {
    type: 'success',
    prompt: 'Add a lava pit between platforms',
    output: {
      entities: Array.from({ length: 8 }, (_, i) => ({
        id: `lava_${i}`,
        name: `lava_tile_${i}`,
        components: {
          sprite: { assetId: i < 6 ? 'tile_lava' : 'deco_particles' },
          position: { x: 400 + i * 32, y: 400 },
          behavior: i >= 6 ? { rules: [{ trigger: 'on_collision hero', action: 'hurt other 10' }] } : undefined,
        },
      })),
      toolCalls: [
        { name: 'spawn_entities' },
        { name: 'add_behavior' },
        { name: 'set_health' },
      ],
      cognitive: {
        thinking: 'Player wants a lava pit hazard. I will create lava tiles in a row with damage behavior on the particle effects.',
        plan: 'Spawn 6 lava tiles, 2 particle effects with collision damage.',
      },
    },
    score: 1.0,
    cognitive: {
      thinking: 'Creating a hazard zone with visual lava tiles and damage-dealing particles.',
      plan: '6 lava tiles + 2 particle entities with hurt behavior.',
    },
    context: { model: 'mistral-large-latest', sessionId: 'test', timestamp: new Date().toISOString(), canvasSize: { width: 800, height: 600 } },
  }

  it('scores traces correctly with cognitive quality', () => {
    const correctionScore = scoreTrace(mockCorrection)
    expect(correctionScore.overall).toBeGreaterThan(0)
    expect(correctionScore.overall).toBeLessThan(1)
    expect(correctionScore.verification).toBe(0.5) // correction = 0.5
    expect(correctionScore.cognitiveQuality).toBeGreaterThan(0.1) // has cognitive data

    const successScore = scoreTrace(mockSuccess)
    expect(successScore.overall).toBeGreaterThan(correctionScore.overall)
    expect(successScore.successRate).toBe(1.0)
    expect(successScore.verification).toBe(1.0)
    expect(successScore.cognitiveQuality).toBeGreaterThan(0.1) // has cognitive data
  })

  it('classifies tiers based on scores', () => {
    const successScore = scoreTrace(mockSuccess)
    const successTier = classifyTier(successScore.overall)
    expect(['gold', 'silver']).toContain(successTier)

    const correctionScore = scoreTrace(mockCorrection)
    const correctionTier = classifyTier(correctionScore.overall, mockCorrection.attempts)
    expect(['silver', 'bronze']).toContain(correctionTier)
  })

  it('builds complete dataset from mixed traces', () => {
    const traces = [mockCorrection, mockSuccess]
    writeFileSync(
      join(TEST_DIR, 'traces.jsonl'),
      traces.map(t => JSON.stringify(t)).join('\n')
    )

    const builder = new DatasetBuilder(TEST_DIR)
    const { dpo, sft } = builder.buildSeeds({ minTier: 'failed' })

    expect(dpo.length).toBe(1)
    expect(sft.length).toBe(1)

    expect(dpo[0].prompt).toBe('Build a haunted castle with skeleton guards')
    // DPO seeds are now chat message arrays
    expect(Array.isArray(dpo[0].chosen)).toBe(true)
    const chosenAssistant = dpo[0].chosen.find((m: any) => m.role === 'assistant')!
    expect(chosenAssistant.tool_calls).toHaveLength(3)
    const rejectedAssistant = dpo[0].rejected.find((m: any) => m.role === 'assistant')!
    expect(rejectedAssistant.tool_calls).toHaveLength(1)

    // SFT seeds use messages format
    expect(sft[0].messages[1].content).toBe('Add a lava pit between platforms')
  })

  it('writes dataset files to disk', () => {
    const traces = [mockCorrection, mockSuccess]
    writeFileSync(
      join(TEST_DIR, 'traces.jsonl'),
      traces.map(t => JSON.stringify(t)).join('\n')
    )

    const builder = new DatasetBuilder(TEST_DIR)
    const dir = builder.buildAndWrite({ minTier: 'failed' })

    expect(existsSync(join(dir, 'dpo_seeds.jsonl'))).toBe(true)
    expect(existsSync(join(dir, 'sft_seeds.jsonl'))).toBe(true)
    expect(existsSync(join(dir, 'metadata.json'))).toBe(true)

    const metadata = JSON.parse(readFileSync(join(dir, 'metadata.json'), 'utf-8'))
    expect(metadata.dpoCount).toBe(1)
    expect(metadata.sftCount).toBe(1)
  })
})
