import type { AppInfo } from '../shared/app-info'
import type { CompileResult, ExecuteResult } from '../shared/ipc'

interface ForgeApi {
  getAppInfo: () => Promise<AppInfo>
  compilePlan: (mechanics: unknown[]) => Promise<CompileResult>
  executePlan: (mechanics: unknown[], approvedHash: string) => Promise<ExecuteResult>
}

declare global {
  interface Window {
    forge: ForgeApi
  }
}

export {}
