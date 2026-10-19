import { createHash } from 'node:crypto'
import { UnrealOperationSchema, type UnrealOperation } from '../shared/unreal-operation'
import type { Mechanic } from '../shared/mechanic'
import { buildMergeGraph, isMergeable, type MergeGraph } from './merge'
import {
  RESOURCE_POOL_REQUIRED_VARIABLES,
  RESOURCE_POOL_TEMPLATE_ID
} from './templates/resource-pool'

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
    for (const v of mechanic.state) {
      // Modifiable dans l'éditeur : permet de tester un état précis (ex. endurance à 50).
      operations.push({
        op: 'AddVariable',
        asset,
        name: v.key,
        type: 'float',
        defaultValue: v.value,
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
    for (const templateId of mechanic.implementation) {
      if (templateId !== RESOURCE_POOL_TEMPLATE_ID) {
        throw new PlanError(`Modèle inconnu : ${templateId}`, graph)
      }
      const declared = new Set([...mechanic.parameters, ...mechanic.state].map((v) => v.key))
      const missing = RESOURCE_POOL_REQUIRED_VARIABLES.filter((name) => !declared.has(name))
      if (missing.length > 0) {
        throw new PlanError(
          `${mechanic.id} : variables manquantes pour ${templateId} : ${missing.join(', ')}`,
          graph
        )
      }
      operations.push({ op: 'ApplyTemplate', asset, templateId, params: {} })
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
