/** Erreur remontée par le serveur MCP Unreal. Jamais avalée : le message est conservé. */
export class UnrealCallError extends Error {
  constructor(
    message: string,
    readonly toolset: string,
    readonly tool: string
  ) {
    super(`${toolset}.${tool} : ${message}`)
    this.name = 'UnrealCallError'
  }
}

/** Tout appel d'outil passe par cette interface : la Forge ne parle jamais directement au réseau. */
export interface ToolCaller {
  callTool(toolset: string, tool: string, args: Record<string, unknown>): Promise<unknown>
}

const LOOPBACK = /^(127\.0\.0\.1|localhost|\[::1\])$/

/**
 * Client MCP minimal (protocole 2025-11-25, HTTP JSON) vers le serveur de l'éditeur.
 * Refuse toute adresse qui n'est pas la machine locale.
 */
export class UnrealMcpClient implements ToolCaller {
  private sessionId: string | null = null
  private nextId = 1

  constructor(
    readonly endpoint: string,
    private readonly fetchImpl: typeof fetch = fetch
  ) {
    const url = new URL(endpoint)
    if (url.protocol !== 'http:' || !LOOPBACK.test(url.hostname)) {
      throw new Error(`Endpoint MCP refusé : ${url.hostname} n'est pas la machine locale`)
    }
  }

  private async rpc(method: string, params: Record<string, unknown>): Promise<unknown> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream'
    }
    if (this.sessionId) headers['Mcp-Session-Id'] = this.sessionId

    const response = await this.fetchImpl(this.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: this.nextId++, method, params })
    })
    const session = response.headers.get('mcp-session-id')
    if (session) this.sessionId = session
    if (response.status === 202) return null
    if (!response.ok) throw new Error(`HTTP ${response.status} sur ${method}`)

    const body = (await response.json()) as { result?: unknown; error?: { message: string } }
    if (body.error) throw new Error(`${method} : ${body.error.message}`)
    return body.result
  }

  /** Ouvre la session MCP. À appeler une fois avant les appels d'outils. */
  async connect(): Promise<void> {
    await this.rpc('initialize', {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'forge', version: '0.1.0' }
    })
    await this.rpc('notifications/initialized', {})
  }

  async callTool(toolset: string, tool: string, args: Record<string, unknown>): Promise<unknown> {
    const result = (await this.rpc('tools/call', {
      name: 'call_tool',
      arguments: { toolset_name: toolset, tool_name: tool, arguments: args }
    })) as { content?: { text?: string }[]; isError?: boolean } | null
    const text = result?.content?.[0]?.text ?? ''

    // Un succès renvoie {"returnValue": ...}. Tout autre texte est une erreur, même sans isError.
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      throw new UnrealCallError(text || 'réponse vide', toolset, tool)
    }
    if (
      result?.isError ||
      typeof parsed !== 'object' ||
      parsed === null ||
      !('returnValue' in parsed)
    ) {
      throw new UnrealCallError(text, toolset, tool)
    }
    return (parsed as { returnValue: unknown }).returnValue
  }
}
