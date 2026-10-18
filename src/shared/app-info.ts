import { z } from 'zod'

export { IPC_CHANNELS } from './ipc'

export const APP_INFO_SCHEMA_VERSION = 'app-info.v1'

/** Contrat versionné des informations de l'application. */
export const AppInfoSchema = z.object({
  schemaVersion: z.literal(APP_INFO_SCHEMA_VERSION),
  name: z.string().min(1),
  version: z.string().min(1),
  electron: z.string().min(1),
  chrome: z.string().min(1),
  node: z.string().min(1)
})

export type AppInfo = z.infer<typeof AppInfoSchema>
