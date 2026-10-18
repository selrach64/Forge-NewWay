import { app, BrowserWindow, ipcMain, shell, type IpcMainInvokeEvent } from 'electron'
import { join } from 'path'
import {
  AppInfoSchema,
  APP_INFO_SCHEMA_VERSION,
  IPC_CHANNELS,
  type AppInfo
} from '../shared/app-info'
import { buildMainWindowOptions, isAllowedNavigation, isTrustedSender } from './security'
import { compilePlan, PlanError } from '../core/plan'
import { MechanicSchema } from '../shared/mechanic'
import { z } from 'zod'
import type { CompileResult } from '../shared/ipc'

const devServerUrl = process.env['ELECTRON_RENDERER_URL']

function readAppInfo(): AppInfo {
  return AppInfoSchema.parse({
    schemaVersion: APP_INFO_SCHEMA_VERSION,
    name: app.getName(),
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  })
}

function createWindow(): void {
  const mainWindow = new BrowserWindow(
    buildMainWindowOptions(join(__dirname, '../preload/index.js'))
  )

  mainWindow.on('ready-to-show', () => mainWindow.show())

  // Aucune fenêtre enfant : les liens externes s'ouvrent dans le navigateur système.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })

  // Aucune navigation hors du rendu local.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedNavigation(url, devServerUrl)) event.preventDefault()
  })

  if (devServerUrl) {
    void mainWindow.loadURL(devServerUrl)
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

ipcMain.handle(IPC_CHANNELS.appInfo, (event: IpcMainInvokeEvent) => {
  if (!isTrustedSender(event.senderFrame?.url ?? '', devServerUrl)) {
    throw new Error('Appel IPC refusé : origine non autorisée')
  }
  return readAppInfo()
})

ipcMain.handle(
  IPC_CHANNELS.planCompile,
  (event: IpcMainInvokeEvent, payload: unknown): CompileResult => {
    if (!isTrustedSender(event.senderFrame?.url ?? '', devServerUrl)) {
      throw new Error('Appel IPC refusé : origine non autorisée')
    }
    // Toute donnée venant du rendu est validée avant d'entrer dans le cœur métier.
    const parsed = z.array(MechanicSchema).max(50).safeParse(payload)
    if (!parsed.success) {
      return {
        ok: false,
        error: `Données invalides : ${parsed.error.issues[0]?.message ?? 'format inattendu'}`
      }
    }
    try {
      return { ok: true, plan: compilePlan(parsed.data) }
    } catch (error) {
      if (error instanceof PlanError) return { ok: false, error: error.message }
      throw error
    }
  }
)

app.whenReady().then(() => {
  // Test de diagnostic : vérifie que la base SQLite native se charge avec Electron.
  if (process.env['FORGE_SELFTEST'] === '1') {
    void import('../storage/selftest').then(({ runSqliteSelfTest }) => {
      const result = runSqliteSelfTest()
      console.log(`[selftest] ${result}`)
      app.exit(result.startsWith('OK') ? 0 : 1)
    })
    return
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
