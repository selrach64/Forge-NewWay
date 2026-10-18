import type { AppInfo } from '../shared/app-info'

interface ForgeApi {
  getAppInfo: () => Promise<AppInfo>
}

declare global {
  interface Window {
    forge: ForgeApi
  }
}

export {}
