import { describe, expect, it } from 'vitest'
import { buildMergeGraph, isMergeable } from '../src/core/merge'
import { compilePlan } from '../src/core/plan'
import { DEMO_ENDURANCE, DEMO_SPEED, DEMO_WEIGHT } from '../src/renderer/src/fixtures/mechanics'

describe('fusion poids -> vitesse -> endurance', () => {
  const all = [DEMO_ENDURANCE, DEMO_SPEED, DEMO_WEIGHT]

  it('le poids produit les deux consommateurs', () => {
    const graph = buildMergeGraph(all)
    expect(graph.edges).toContainEqual({
      from: 'mech.inventory.weight',
      to: 'mech.speed.factor',
      resource: 'Inventory.TotalWeight'
    })
    expect(graph.edges).toContainEqual({
      from: 'mech.inventory.weight',
      to: 'mech.endurance.core',
      resource: 'Inventory.TotalWeight'
    })
    expect(isMergeable(graph)).toBe(true)
  })

  it('ordonne le poids avant la vitesse et l’endurance', () => {
    const { order } = buildMergeGraph(all)
    expect(order[0]).toBe('mech.inventory.weight')
    expect(order.slice(1).sort()).toEqual(['mech.endurance.core', 'mech.speed.factor'])
  })

  it('produit un plan qui crée le facteur de vitesse dans son propre Blueprint', () => {
    const plan = compilePlan(all)
    const speedOps = plan.operations.filter(
      (op) => 'asset' in op && op.asset === '/Game/Forge/Speed/BP_AC_Speed'
    )
    const names = speedOps.flatMap((op) => (op.op === 'AddVariable' ? [op.name] : []))
    expect(names).toContain('Movement_SpeedFactor')
    expect(names).toContain('SpeedPenalty')
  })

  it('la capacité de charge est publiée par le poids, une seule fois dans le plan', () => {
    const graph = buildMergeGraph(all)
    expect(graph.edges).toContainEqual({
      from: 'mech.inventory.weight',
      to: 'mech.speed.factor',
      resource: 'Inventory.WeightCapacity'
    })
    const names = compilePlan(all).operations.flatMap((op) =>
      op.op === 'AddVariable' ? [op.name] : []
    )
    expect(names.filter((n) => n === 'WeightCapacity')).toHaveLength(1)
    expect(names).not.toContain('Inventory_WeightCapacity')
  })

  it('refuse le plan si la vitesse est seule, sans le poids', () => {
    expect(() => compilePlan([DEMO_SPEED])).toThrow(/dépendance manquante/)
  })
})
