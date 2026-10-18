import { createHash } from 'node:crypto'
import { UnrealOperationSchema, type UnrealOperation } from '../shared/unreal-operation'
import type { Mechanic } from '../shared/mechanic'
import { buildMergeGraph, isMergeable, type MergeGraph } from './merge'

export const MERGE_PLAN_SCHEMA_VERSION = 'merge-plan.v1'

export interface MergePlan {
  schemaVersion: typeof MERGE_PLAN_SCHEMA_VERSION
  mechanicIds: string[]
  graph: MergeGraph
  operations: UnrealOperation[]
  /** Empreinte du plan exact : l'approbation porte sur cette valeur (docs/ARCHITECTURE.md §6). */
  planHash: string
}

export class PlanError extends Error {
  constructor(
    message: string,
    readonly graph: MergeGraph
  ) {
    super(message)
    this.name = 'PlanError'
  }
}

/** Sérialisation canonique : clés triées à tous les niveaux, sans espaces. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const entries = Object.keys(value as Record<string, unknown>)
      .sort()
      .map(
        (key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`
      )
    return `{${entries.join(',')}}`
  }
  return JSON.stringify(value)
}

export function hashOf(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex')
}

/** Nom court d'une mécanique pour les chemins d'assets : mech.endurance.core -> Endurance. */
function assetName(mechanic: Mechanic): string {
  const segment = mechanic.id.split('.')[1] ?? mechanic.id
  return segment.charAt(0).toUpperCase() + segment.slice(1)
}

/** Ressource "Endurance.Current" -> nom de variable Blueprint "Endurance_Current". */
function variableName(resource: string): string {
  return resource.replace(/\./g, '_')
}

/**
 * Compile un ensemble de mécaniques en plan d'opérations.
 * Refuse toute fusion qui n'est pas acceptable (conflit, dépendance manquante, cycle).
 */
export function compilePlan(mechanics: Mechanic[]): MergePlan {
  const graph = buildMergeGraph(mechanics)
  if (!isMergeable(graph)) {
    const reasons = [
      ...graph.conflicts.map(
        (c) => `propriétaire multiple pour ${c.resource} (${c.owners.join(', ')})`
      ),
      ...graph.missing.map((m) => `dépendance manquante : ${m.mechanicId} lit ${m.resource}`),
      ...(graph.cycle ? [`cycle entre ${graph.cycle.join(', ')}`] : [])
    ]
    throw new PlanError(`Fusion refusée : ${reasons.join('; ')}`, graph)
  }

  const byId = new Map(mechanics.map((m) => [m.id, m]))
  const operations: UnrealOperation[] = []

  for (const id of graph.order) {
    const mechanic = byId.get(id)!
    const name = assetName(mechanic)
    const asset = `/Game/Forge/${name}/BP_AC_${name}`

    operations.push({ op: 'CreateBlueprint', parent: 'ActorComponent', path: asset })
    for (const p of mechanic.parameters) {
      operations.push({
        op: 'AddVariable',
        asset,
        name: p.key,
        type: 'float',
        defaultValue: p.value,
        editable: true
      })
    }
    for (const resource of mechanic.provides) {
      operations.push({
        op: 'AddVariable',
        asset,
        name: variableName(resource),
        type: 'float',
        defaultValue: 0,
        editable: false
      })
    }
    operations.push({ op: 'Compile', asset })
    operations.push({ op: 'Save', asset })
  }

  // Chaque opération doit appartenir à la liste blanche, sinon la compilation échoue.
  const validated = operations.map((op) => UnrealOperationSchema.parse(op))

  const body = {
    schemaVersion: MERGE_PLAN_SCHEMA_VERSION as typeof MERGE_PLAN_SCHEMA_VERSION,
    mechanicIds: graph.order,
    graph,
    operations: validated
  }
  return { ...body, planHash: hashOf(body) }
}
