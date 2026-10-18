import Database from 'better-sqlite3'

export type ForgeDatabase = Database.Database

/** Ouvre la base et active les contraintes de clés étrangères. */
export function openDatabase(path: string): ForgeDatabase {
  const db = new Database(path)
  db.pragma('foreign_keys = ON')
  db.pragma('journal_mode = WAL')
  return db
}

/** Aller-retour minimal : écrire une ligne puis la relire. Sert au test de diagnostic. */
export function roundTrip(db: ForgeDatabase, value: string): string {
  db.exec('CREATE TABLE IF NOT EXISTS selftest (id INTEGER PRIMARY KEY, value TEXT NOT NULL)')
  db.prepare('INSERT INTO selftest (value) VALUES (?)').run(value)
  const row = db.prepare('SELECT value FROM selftest ORDER BY id DESC LIMIT 1').get() as
    { value: string } | undefined
  return row?.value ?? ''
}
