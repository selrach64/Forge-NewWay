import { describe, expect, it } from 'vitest'
import { MechanicSchema } from '../src/shared/mechanic'
import { DEMO_ENDURANCE } from '../src/renderer/src/fixtures/mechanics'

describe('contrat Mechanic (mechanic.v1)', () => {
  it("accepte la fiche de démonstration de l'endurance", () => {
    expect(MechanicSchema.safeParse(DEMO_ENDURANCE).success).toBe(true)
  })

  it('refuse une valeur hors bornes', () => {
    const bad = {
      ...DEMO_ENDURANCE,
      parameters: DEMO_ENDURANCE.parameters.map((p) =>
        p.key === 'DodgeCost' ? { ...p, value: 500 } : p
      )
    }
    const result = MechanicSchema.safeParse(bad)
    expect(result.success).toBe(false)
    expect(result.success || result.error.issues[0].message).toContain('DodgeCost')
  })

  it('refuse un paramètre dupliqué', () => {
    const dup = {
      ...DEMO_ENDURANCE,
      parameters: [...DEMO_ENDURANCE.parameters, DEMO_ENDURANCE.parameters[0]]
    }
    expect(MechanicSchema.safeParse(dup).success).toBe(false)
  })

  it('refuse un statut de règle inconnu', () => {
    const bad = { ...DEMO_ENDURANCE, rules: [{ ...DEMO_ENDURANCE.rules[0], status: 'vrai' }] }
    expect(MechanicSchema.safeParse(bad).success).toBe(false)
  })

  it('refuse un identifiant qui ne suit pas la convention', () => {
    expect(MechanicSchema.safeParse({ ...DEMO_ENDURANCE, id: 'Endurance' }).success).toBe(false)
  })
})
