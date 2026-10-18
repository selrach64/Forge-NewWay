import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, type AppInfo } from '../shared/app-info'

/**
 * Seule surface exposée au rendu. Une fonction par canal, sans jamais
 * transmettre ipcRenderer ni l'objet événement.
 */
const forgeApi = {
  getAppInfo: (): Promise<AppInfo> => ipcRenderer.invoke(IPC_CHANNELS.appInfo)
}

contextBridge.exposeInMainWorld('forge', forgeApi)
