import { describe, expect, it } from 'vitest'
import { AppInfoSchema, APP_INFO_SCHEMA_VERSION, IPC_CHANNELS } from '../src/shared/app-info'

const valid = {
  schemaVersion: APP_INFO_SCHEMA_VERSION,
  name: 'Forge',
  version: '0.1.0',
  electron: '44.9.0',
  chrome: '140.0.0.0',
  node: '24.12.0'
}

describe('contrat AppInfo (versionné)', () => {
  it('accepte une donnée valide', () => {
    expect(AppInfoSchema.parse(valid)).toEqual(valid)
  })

  it('refuse une autre version de schéma', () => {
    expect(() => AppInfoSchema.parse({ ...valid, schemaVersion: 'app-info.v0' })).toThrow()
  })

  it('refuse un champ manquant', () => {
    const incomplete: Partial<typeof valid> = { ...valid }
    delete incomplete.version
    expect(() => AppInfoSchema.parse(incomplete)).toThrow()
  })

  it('refuse une chaîne vide', () => {
    expect(() => AppInfoSchema.parse({ ...valid, name: '' })).toThrow()
  })
})

describe('canaux IPC', () => {
  it('déclare un canal unique et explicite', () => {
    expect(IPC_CHANNELS.appInfo).toBe('app:info')
  })
})
