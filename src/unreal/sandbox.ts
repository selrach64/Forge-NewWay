import { execFileSync } from 'node:child_process'

/** Port du serveur MCP de la copie de test. Le port 8001 est réservé à une autre session. */
export const SANDBOX_PORT = 8002

/** Chemin du projet de test attendu dans la ligne de commande de l'éditeur (séparateurs Windows). */
const SANDBOX_PROJECT = 'Fayel_Forge_Clean\\Fayel.uproject'

/** Vrai seulement si la ligne de commande désigne bien la copie de test, pas l'original. */
export function isSandboxCommandLine(commandLine: string): boolean {
  const normalized = commandLine.split('/').join('\\')
  return normalized.includes(SANDBOX_PROJECT)
}

/** Lit la ligne de commande du processus qui écoute sur un port local (Windows uniquement). */
export function listenerCommandLine(port: number): string | null {
  const netstat = execFileSync('netstat', ['-ano'], { encoding: 'utf8' })
  const pid = netstat
    .split('\n')
    .find((line) => line.includes(`:${port} `) && line.includes('LISTENING'))
    ?.trim()
    .split(/\s+/)
    .pop()
  if (!pid) return null
  const command = execFileSync(
    'powershell',
    [
      '-NoProfile',
      '-Command',
      `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`
    ],
    { encoding: 'utf8' }
  ).trim()
  return command || null
}

/** Garde à appeler avant toute écriture : refuse si le serveur ne vient pas de la copie de test. */
export function assertSandboxListener(port: number = SANDBOX_PORT): void {
  const commandLine = listenerCommandLine(port)
  if (!commandLine) throw new Error(`Aucun éditeur n'écoute sur le port ${port}`)
  if (!isSandboxCommandLine(commandLine)) {
    throw new Error(`Le port ${port} n'appartient pas à la copie de test : exécution refusée`)
  }
}
