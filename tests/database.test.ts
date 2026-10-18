import { afterEach, describe, expect, it } from 'vitest'
import { openDatabase, roundTrip, type ForgeDatabase } from '../src/storage/sqlite'

let db: ForgeDatabase | undefined

afterEach(() => {
  db?.close()
  db = undefined
})

describe('base SQLite', () => {
  it('écrit puis relit une valeur', () => {
    db = openDatabase(':memory:')
    expect(roundTrip(db, 'bonjour')).toBe('bonjour')
  })

  it('active les clés étrangères', () => {
    db = openDatabase(':memory:')
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1)
  })
})
