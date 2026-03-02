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
    expect(score.overall).toBeGreaterThan(0.5)
    expect(score.successRate).toBe(1.0)
    expect(score.verification).toBe(1.0)
    expect(score.cognitiveQuality).toBeDefined()
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

  it('gives higher cognitive score when cognitive data present', () => {
    const withoutCognitive = {
      type: 'success',
      output: {
        entities: [{ name: 'e1', components: { sprite: { assetId: 'a' } } }],
        toolCalls: [{ name: 'spawn_entities' }],
      },
    }
    const withCognitive = {
      type: 'success',
      cognitive: {
        thinking: 'I need to place a castle in the center of the map with guards flanking it for defense',
        plan: 'First spawn the castle structure, then add skeleton guards on either side with patrol behaviors',
        reflection: 'The layout looks good - guards are evenly spaced and the castle is centered',
      },
      output: {
        entities: [{ name: 'e1', components: { sprite: { assetId: 'a' } } }],
        toolCalls: [{ name: 'spawn_entities' }],
      },
    }
    const scoreWithout = scoreTrace(withoutCognitive)
    const scoreWith = scoreTrace(withCognitive)
    expect(scoreWith.cognitiveQuality).toBeGreaterThan(scoreWithout.cognitiveQuality)
  })

  it('credits critiques as reflection signal', () => {
    const trace = {
      type: 'correction',
      attempts: 2,
      critiques: ['spread the enemies further apart', 'add more decoration'],
      rejected: { entities: [], toolCalls: [{ name: 'spawn_entities' }] },
      chosen: { entities: [{ name: 'e1', components: { sprite: { assetId: 'a' } } }], toolCalls: [{ name: 'spawn_entities' }] },
    }
    const score = scoreTrace(trace)
    expect(score.cognitiveQuality).toBeGreaterThan(0.1)
  })
})

describe('classifyTier', () => {
  it('gold for high score low attempts', () => {
    expect(classifyTier(0.8, 1)).toBe('gold')
  })
  it('gold requires >= 0.75', () => {
    expect(classifyTier(0.74, 1)).toBe('silver')
    expect(classifyTier(0.75, 2)).toBe('gold')
  })
  it('silver for medium score', () => {
    expect(classifyTier(0.6, 4)).toBe('silver')
  })
  it('bronze for lower-medium score', () => {
    expect(classifyTier(0.45, 1)).toBe('bronze')
  })
  it('failed for low score', () => {
    expect(classifyTier(0.3)).toBe('failed')
  })
})
