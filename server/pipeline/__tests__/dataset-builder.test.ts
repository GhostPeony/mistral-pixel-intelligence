import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DatasetBuilder } from '../dataset-builder.js'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'

const TEST_DIR = join(process.cwd(), '.test-data')

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true })
})

afterEach(() => {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true })
})

describe('DatasetBuilder', () => {
  it('builds DPO seeds from correction traces', () => {
    const traces = [
      {
        type: 'correction',
        prompt: 'Build a castle',
        rejected: { entities: [], toolCalls: [{ name: 'spawn_entities' }] },
        chosen: { entities: [{ name: 'castle', components: { sprite: { assetId: 'castle' } } }], toolCalls: [{ name: 'spawn_entities' }] },
        feedback: 'Rebuilt castle',
        attempts: 2,
      },
    ]
    writeFileSync(join(TEST_DIR, 'traces.jsonl'), traces.map(t => JSON.stringify(t)).join('\n'))

    const builder = new DatasetBuilder(TEST_DIR)
    const { dpo, sft } = builder.buildSeeds({ minTier: 'failed' })
    expect(dpo.length).toBe(1)
    expect(sft.length).toBe(0)
    expect(dpo[0].prompt).toBe('Build a castle')
  })

  it('builds SFT seeds from success traces', () => {
    const traces = [
      {
        type: 'success',
        prompt: 'Add a tree',
        output: {
          entities: Array.from({ length: 5 }, (_, i) => ({ name: `e${i}`, components: { sprite: { assetId: `t${i}` } } })),
          toolCalls: [{ name: 'spawn_entities' }, { name: 'set_physics' }],
        },
      },
    ]
    writeFileSync(join(TEST_DIR, 'traces.jsonl'), traces.map(t => JSON.stringify(t)).join('\n'))

    const builder = new DatasetBuilder(TEST_DIR)
    const { dpo, sft } = builder.buildSeeds({ minTier: 'failed' })
    expect(sft.length).toBe(1)
    expect(dpo.length).toBe(0)
  })

  it('deduplicates by prompt', () => {
    const trace = {
      type: 'success',
      prompt: 'Same prompt',
      output: { entities: [{ name: 'e', components: { sprite: { assetId: 'a' } } }], toolCalls: [{ name: 'spawn_entities' }] },
    }
    writeFileSync(join(TEST_DIR, 'traces.jsonl'), [trace, trace].map(t => JSON.stringify(t)).join('\n'))

    const builder = new DatasetBuilder(TEST_DIR)
    const { sft } = builder.buildSeeds({ minTier: 'failed' })
    expect(sft.length).toBe(1)
  })
})
