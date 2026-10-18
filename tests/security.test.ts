import { describe, expect, it } from 'vitest'
import { buildMainWindowOptions, isAllowedNavigation, isTrustedSender } from '../src/main/security'

describe('options de la fenêtre principale', () => {
  const options = buildMainWindowOptions('/app/preload/index.js')
  const web = options.webPreferences ?? {}

  it('isole le contexte et coupe Node dans le rendu', () => {
    expect(web.contextIsolation).toBe(true)
    expect(web.nodeIntegration).toBe(false)
  })

  it('active le sandbox et la sécurité web', () => {
    expect(web.sandbox).toBe(true)
    expect(web.webSecurity).toBe(true)
    expect(web.allowRunningInsecureContent).toBe(false)
  })

  it('charge le preload fourni', () => {
    expect(web.preload).toBe('/app/preload/index.js')
  })
})

describe('navigation', () => {
  it('autorise le rendu local en fichier', () => {
    expect(isAllowedNavigation('file:///app/renderer/index.html')).toBe(true)
  })

  it('bloque les sites distants', () => {
    expect(isAllowedNavigation('https://evil.example/page')).toBe(false)
    expect(isAllowedNavigation('http://localhost.evil.example/')).toBe(false)
  })

  it("n'autorise que l'origine exacte du serveur de développement", () => {
    expect(isAllowedNavigation('http://localhost:5173/', 'http://localhost:5173')).toBe(true)
    expect(isAllowedNavigation('http://localhost:9999/', 'http://localhost:5173')).toBe(false)
  })

  it('refuse les URL invalides', () => {
    expect(isAllowedNavigation('pas une url')).toBe(false)
  })
})

describe('origine des appels IPC', () => {
  it('accepte le rendu local et refuse une page distante', () => {
    expect(isTrustedSender('file:///app/renderer/index.html')).toBe(true)
    expect(isTrustedSender('https://evil.example/')).toBe(false)
    expect(isTrustedSender('')).toBe(false)
  })
})
