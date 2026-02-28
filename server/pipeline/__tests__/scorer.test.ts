import { describe, it, expect } from 'vitest'
import { scoreTrace, classifyTier } from '../scorer.js'

describe('scoreTrace', () => {
  it('scores a success trace high', () => {
    const trace = {
      type: 'success',
      output: {
        entities: Array.from({ length: 8 }, (_, i) => ({
          name: `entity_${i}`,
          components: { sprite: { assetId: `type_${i % 4}` } }
        })),
        toolCalls: [
          { name: 'spawn_entities' },
          { name: 'add_behavior' },
          { name: 'set_health' },
        ],
      },
    }
    const score = scoreTrace(trace)
    expect(score.overall).toBeGreaterThan(0.6)
    expect(score.successRate).toBe(1.0)
    expect(score.verification).toBe(1.0)
  })

  it('scores a correction trace lower', () => {
    const trace = {
      type: 'correction',
      attempts: 3,
      rejected: { entities: [], toolCalls: [{ name: 'spawn_entities' }] },
      chosen: { entities: [{ name: 'e1', components: { sprite: { assetId: 'a' } } }], toolCalls: [{ name: 'spawn_entities' }] },
    }
    const score = scoreTrace(trace)
    expect(score.overall).toBeLessThan(0.8)
    expect(score.verification).toBe(0.5)
  })
})

describe('classifyTier', () => {
  it('gold for high score low attempts', () => {
    expect(classifyTier(0.8, 1)).toBe('gold')
  })
  it('silver for medium score', () => {
    expect(classifyTier(0.6, 4)).toBe('silver')
  })
  it('failed for low score', () => {
    expect(classifyTier(0.2)).toBe('failed')
  })
})
