import type { Mechanic } from '../shared/mechanic'

/** Une dépendance : `to` lit une ressource que `from` publie. */
export interface MergeEdge {
  from: string
  to: string
  resource: string
}

export interface OwnerConflict {
  resource: string
  owners: string[]
}

export interface MissingDependency {
  mechanicId: string
  resource: string
}

/** Résultat du moteur de fusion. Les champs `conflicts`, `missing` et `cycle` bloquent la génération. */
export interface MergeGraph {
  nodes: string[]
  edges: MergeEdge[]
  owners: Record<string, string>
  conflicts: OwnerConflict[]
  missing: MissingDependency[]
  cycle: string[] | null
  /** Ordre de génération : chaque producteur avant ses consommateurs. Vide si cycle. */
  order: string[]
}

/**
 * Construit le graphe de dépendances d'un ensemble de mécaniques.
 * Fonction pure et déterministe : même entrée, même sortie (ordre trié par identifiant).
 */
export function buildMergeGraph(mechanics: Mechanic[]): MergeGraph {
  const nodes = mechanics.map((m) => m.id).sort()
  const byId = new Map(mechanics.map((m) => [m.id, m]))

  // Propriétaire unique : une ressource ne peut être publiée que par une seule mécanique.
  const providers = new Map<string, string[]>()
  for (const m of mechanics) {
    for (const resource of m.provides) {
      providers.set(resource, [...(providers.get(resource) ?? []), m.id])
    }
  }
  const conflicts: OwnerConflict[] = []
  const owners: Record<string, string> = {}
  for (const [resource, list] of [...providers].sort(([a], [b]) => a.localeCompare(b))) {
    const sorted = [...list].sort()
    if (sorted.length > 1) conflicts.push({ resource, owners: sorted })
    else owners[resource] = sorted[0]
  }

  // Dépendances : producteur unique -> consommateur.
  const edges: MergeEdge[] = []
  const missing: MissingDependency[] = []
  for (const id of nodes) {
    const consumer = byId.get(id)!
    for (const resource of [...consumer.requires].sort()) {
      const producer = owners[resource]
      if (producer === undefined) {
        // Une ressource en conflit ne compte pas comme manquante : elle est déjà signalée.
        if (!providers.has(resource)) missing.push({ mechanicId: id, resource })
        continue
      }
      if (producer !== id) edges.push({ from: producer, to: id, resource })
    }
  }

  const { cycle, order } = topologicalOrder(nodes, edges)

  return { nodes, edges, owners, conflicts, missing, cycle, order }
}

/** Tri topologique de Kahn. Retourne un cycle si le graphe n'est pas acyclique. */
function topologicalOrder(
  nodes: string[],
  edges: MergeEdge[]
): { cycle: string[] | null; order: string[] } {
  const indegree = new Map(nodes.map((n) => [n, 0]))
  const next = new Map<string, string[]>(nodes.map((n) => [n, []]))
  for (const e of edges) {
    indegree.set(e.to, (indegree.get(e.to) ?? 0) + 1)
    next.get(e.from)?.push(e.to)
  }

  const ready = nodes.filter((n) => indegree.get(n) === 0)
  const order: string[] = []
  while (ready.length > 0) {
    ready.sort()
    const current = ready.shift()!
    order.push(current)
    for (const to of next.get(current) ?? []) {
      const remaining = (indegree.get(to) ?? 0) - 1
      indegree.set(to, remaining)
      if (remaining === 0) ready.push(to)
    }
  }

  if (order.length === nodes.length) return { cycle: null, order }
  const stuck = nodes.filter((n) => !order.includes(n)).sort()
  return { cycle: stuck, order: [] }
}

/** Vrai si le graphe peut servir à générer un plan. */
export function isMergeable(graph: MergeGraph): boolean {
  return graph.conflicts.length === 0 && graph.missing.length === 0 && graph.cycle === null
}
