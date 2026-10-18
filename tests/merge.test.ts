import { describe, expect, it } from 'vitest'
import { buildMergeGraph, isMergeable } from '../src/core/merge'
import { DEMO_ENDURANCE, DEMO_WEIGHT } from '../src/renderer/src/fixtures/mechanics'
import type { Mechanic } from '../src/shared/mechanic'

const movement: Mechanic = {
  ...DEMO_WEIGHT,
  id: 'mech.movement.speed',
  name: 'Vitesse',
  category: 'movement',
  provides: ['Movement.MaxSpeed'],
  requires: ['Movement.SpeedFactor']
}

describe('moteur de fusion', () => {
  it('construit la dépendance poids -> endurance et ordonne le poids en premier', () => {
    const graph = buildMergeGraph([DEMO_ENDURANCE, DEMO_WEIGHT])
    expect(graph.edges).toContainEqual({
      from: 'mech.inventory.weight',
      to: 'mech.endurance.core',
      resource: 'Inventory.TotalWeight'
    })
    expect(graph.order.indexOf('mech.inventory.weight')).toBeLessThan(
      graph.order.indexOf('mech.endurance.core')
    )
    expect(isMergeable(graph)).toBe(true)
  })

  it("chaîne les dépendances jusqu'au mouvement", () => {
    const graph = buildMergeGraph([movement, DEMO_WEIGHT])
    expect(graph.order).toEqual(['mech.inventory.weight', 'mech.movement.speed'])
  })

  it('signale deux propriétaires pour une même ressource', () => {
    const rival: Mechanic = {
      ...DEMO_WEIGHT,
      id: 'mech.inventory.rival',
      provides: ['Inventory.TotalWeight']
    }
    const graph = buildMergeGraph([DEMO_WEIGHT, rival, DEMO_ENDURANCE])
    expect(graph.conflicts).toEqual([
      {
        resource: 'Inventory.TotalWeight',
        owners: ['mech.inventory.rival', 'mech.inventory.weight']
      }
    ])
    expect(isMergeable(graph)).toBe(false)
  })

  it('signale une dépendance manquante', () => {
    const graph = buildMergeGraph([DEMO_ENDURANCE])
    expect(graph.missing).toEqual([
      { mechanicId: 'mech.endurance.core', resource: 'Inventory.TotalWeight' }
    ])
    expect(isMergeable(graph)).toBe(false)
  })

  it('détecte un cycle', () => {
    const a: Mechanic = { ...DEMO_WEIGHT, id: 'mech.a.one', provides: ['A.x'], requires: ['B.y'] }
    const b: Mechanic = { ...DEMO_WEIGHT, id: 'mech.b.two', provides: ['B.y'], requires: ['A.x'] }
    const graph = buildMergeGraph([a, b])
    expect(graph.cycle).toEqual(['mech.a.one', 'mech.b.two'])
    expect(graph.order).toEqual([])
  })

  it("est déterministe quel que soit l'ordre d'entrée", () => {
    const one = buildMergeGraph([DEMO_ENDURANCE, DEMO_WEIGHT])
    const two = buildMergeGraph([DEMO_WEIGHT, DEMO_ENDURANCE])
    expect(two).toEqual(one)
  })
})
