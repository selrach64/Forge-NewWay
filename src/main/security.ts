import type { BrowserWindowConstructorOptions } from 'electron'

/**
 * Options de la fenêtre principale. Fonction pure, testée dans tests/security.test.ts :
 * toute régression de sécurité fait échouer les tests.
 */
export function buildMainWindowOptions(preloadPath: string): BrowserWindowConstructorOptions {
  return {
    width: 1100,
    height: 720,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false
    }
  }
}

/**
 * Une navigation n'est autorisée que vers le rendu local de l'application
 * (fichier ou serveur de développement exact). Tout le reste est bloqué.
 */
export function isAllowedNavigation(url: string, devServerUrl?: string): boolean {
  try {
    const target = new URL(url)
    if (target.protocol === 'file:') return true
    if (devServerUrl) {
      return target.origin === new URL(devServerUrl).origin
    }
    return false
  } catch {
    return false
  }
}

/** Vérifie que l'appelant IPC provient du rendu local, et non d'une page distante. */
export function isTrustedSender(senderUrl: string, devServerUrl?: string): boolean {
  return isAllowedNavigation(senderUrl, devServerUrl)
}
