// Constantes IPC sans dépendance : importées par le préchargement, qui tourne en sandbox
// et ne peut pas charger de paquets npm (zod, etc.).
export const IPC_CHANNELS = {
  appInfo: 'app:info',
  planCompile: 'plan:compile'
} as const

/** Résultat renvoyé au rendu : jamais d'exception brute, toujours un état explicite. */
export type CompileResult =
  { ok: true; plan: import('../core/plan').MergePlan } | { ok: false; error: string }
