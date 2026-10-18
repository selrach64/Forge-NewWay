import { openDatabase, roundTrip } from './sqlite'

/** Diagnostic exécuté avec FORGE_SELFTEST=1 : retourne 'OK ...' ou 'ERREUR ...'. */
export function runSqliteSelfTest(): string {
  try {
    const db = openDatabase(':memory:')
    const value = roundTrip(db, 'forge-selftest')
    db.close()
    return value === 'forge-selftest' ? `OK sqlite (${value})` : `ERREUR valeur relue "${value}"`
  } catch (error) {
    return `ERREUR ${error instanceof Error ? error.message : String(error)}`
  }
}
