import { describe, expect, it } from 'vitest'
import { canonicalJson, compilePlan, hashOf, PlanError } from '../src/core/plan'
import { DEMO_ENDURANCE, DEMO_WEIGHT } from '../src/renderer/src/fixtures/mechanics'
import { UnrealOperationSchema } from '../src/shared/unreal-operation'

describe('compilateur de plan', () => {
  it('produit un plan ordonné : poids avant endurance', () => {
    const plan = compilePlan([DEMO_ENDURANCE, DEMO_WEIGHT])
    expect(plan.mechanicIds).toEqual(['mech.inventory.weight', 'mech.endurance.core'])
    const createPaths = plan.operations.flatMap((op) =>
      op.op === 'CreateBlueprint' ? [op.path] : []
    )
    expect(createPaths).toEqual([
      '/Game/Forge/Inventory/BP_AC_Inventory',
      '/Game/Forge/Endurance/BP_AC_Endurance'
    ])
  })

  it("crée les variables de l'endurance avec les valeurs de la mission", () => {
    const plan = compilePlan([DEMO_ENDURANCE, DEMO_WEIGHT])
    const endurance = plan.operations.filter(
      (op) => op.op === 'AddVariable' && op.asset === '/Game/Forge/Endurance/BP_AC_Endurance'
    )
    const defaults = Object.fromEntries(
      endurance.map((op) => (op.op === 'AddVariable' ? [op.name, op.defaultValue] : ['', 0]))
    )
    expect(defaults).toMatchObject({
      MaxEndurance: 100,
      DodgeCost: 25,
      RegenRate: 15,
      RegenDelay: 1
    })
  })

  it('valide chaque opération contre la liste blanche', () => {
    const plan = compilePlan([DEMO_ENDURANCE, DEMO_WEIGHT])
    for (const op of plan.operations) {
      expect(UnrealOperationSchema.safeParse(op).success).toBe(true)
    }
  })

  it('refuse une fusion en conflit', () => {
    const rival = { ...DEMO_WEIGHT, id: 'mech.inventory.rival' }
    expect(() => compilePlan([DEMO_WEIGHT, rival, DEMO_ENDURANCE])).toThrow(PlanError)
  })

  it('refuse une dépendance manquante', () => {
    expect(() => compilePlan([DEMO_ENDURANCE])).toThrow(/dépendance manquante/)
  })

  it('a une empreinte stable pour un plan identique', () => {
    const a = compilePlan([DEMO_ENDURANCE, DEMO_WEIGHT])
    const b = compilePlan([DEMO_WEIGHT, DEMO_ENDURANCE])
    expect(a.planHash).toBe(b.planHash)
    expect(a.planHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it("change d'empreinte si un paramètre change", () => {
    const changed = {
      ...DEMO_ENDURANCE,
      parameters: DEMO_ENDURANCE.parameters.map((p) =>
        p.key === 'DodgeCost' ? { ...p, value: 30 } : p
      )
    }
    expect(compilePlan([changed, DEMO_WEIGHT]).planHash).not.toBe(
      compilePlan([DEMO_ENDURANCE, DEMO_WEIGHT]).planHash
    )
  })
})

describe('sérialisation canonique', () => {
  it("ignore l'ordre des clés", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}')
    expect(hashOf({ b: 1, a: 2 })).toBe(hashOf({ a: 2, b: 1 }))
  })
})
