import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc'
import type { AppInfo } from '../shared/app-info'
import type { CompileResult, ExecuteResult } from '../shared/ipc'

/**
 * Seule surface exposée au rendu. Une fonction par canal, sans jamais
 * transmettre ipcRenderer ni l'objet événement.
 */
const forgeApi = {
  getAppInfo: (): Promise<AppInfo> => ipcRenderer.invoke(IPC_CHANNELS.appInfo),
  compilePlan: (mechanics: unknown[]): Promise<CompileResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.planCompile, mechanics),
  executePlan: (mechanics: unknown[], approvedHash: string): Promise<ExecuteResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.planExecute, { mechanics, approvedHash })
}

contextBridge.exposeInMainWorld('forge', forgeApi)
