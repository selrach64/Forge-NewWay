import type { Mechanic } from '../shared/mechanic'

/**
 * Identifiant de run : horodatage UTC compact, ex. "r20261019145400".
 * Chaque exécution utilise des noms d'assets neufs, donc aucun asset existant n'est écrasé.
 */
export function makeRunId(now: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return (
    'r' +
    now.getUTCFullYear() +
    pad(now.getUTCMonth() + 1) +
    pad(now.getUTCDate()) +
    pad(now.getUTCHours()) +
    pad(now.getUTCMinutes()) +
    pad(now.getUTCSeconds())
  )
}

/**
 * Ajoute le suffixe de run au segment de nom de chaque mécanique.
 * mech.endurance.core + r2026... -> mech.endurance_r2026....core
 * Les ressources (provides / requires) ne changent pas : elles restent les mêmes entre runs.
 */
export function suffixMechanics(mechanics: Mechanic[], runId: string): Mechanic[] {
  return mechanics.map((m) => {
    const [prefix, segment, ...rest] = m.id.split('.')
    return { ...m, id: [prefix, `${segment}_${runId}`, ...rest].join('.') }
  })
}
