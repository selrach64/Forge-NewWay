import type { AppInfo } from '../shared/app-info'
import type { CompileResult } from '../shared/ipc'

interface ForgeApi {
  getAppInfo: () => Promise<AppInfo>
  compilePlan: (mechanics: unknown[]) => Promise<CompileResult>
}

declare global {
  interface Window {
    forge: ForgeApi
  }
}

export {}
