import { describe, expect, it } from 'vitest'
import { compilePlan } from '../src/core/plan'
import { makeRunId, suffixMechanics } from '../src/core/run'
import { DEMO_MECHANICS } from '../src/renderer/src/fixtures/mechanics'

describe('identifiant de run', () => {
  it('format compact UTC', () => {
    expect(makeRunId(new Date('2026-10-19T14:54:00Z'))).toBe('r20261019145400')
  })
})

describe('suffixe de run', () => {
  const runId = 'r20261019145400'

  it('suffixe le segment de nom, pas les ressources', () => {
    const [endurance] = suffixMechanics(DEMO_MECHANICS, runId)
    expect(endurance.id).toBe(`mech.endurance_${runId}.core`)
    expect(endurance.provides).toEqual(DEMO_MECHANICS[0].provides)
    expect(endurance.requires).toEqual(DEMO_MECHANICS[0].requires)
  })

  it('donne un plan au hash différent de la base', () => {
    const base = compilePlan(DEMO_MECHANICS).planHash
    const run = compilePlan(suffixMechanics(DEMO_MECHANICS, runId)).planHash
    expect(run).not.toBe(base)
  })

  it('produit des chemins d’assets neufs', () => {
    const plan = compilePlan(suffixMechanics(DEMO_MECHANICS, runId))
    const paths = plan.operations.flatMap((op) => (op.op === 'CreateBlueprint' ? [op.path] : []))
    expect(paths.every((p) => p.includes(runId.slice(1, 9)) || p.includes(runId))).toBe(true)
    expect(paths.every((p) => p.includes('_r2026'))).toBe(true)
  })
})
