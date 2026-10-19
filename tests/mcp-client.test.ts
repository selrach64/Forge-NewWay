import { describe, expect, it } from 'vitest'
import { UnrealCallError, UnrealMcpClient } from '../src/unreal/mcp-client'

describe("client MCP : sécurité de l'endpoint", () => {
  it('accepte la machine locale', () => {
    expect(() => new UnrealMcpClient('http://127.0.0.1:8001/mcp')).not.toThrow()
    expect(() => new UnrealMcpClient('http://localhost:8001/mcp')).not.toThrow()
  })

  it('refuse toute adresse distante', () => {
    expect(() => new UnrealMcpClient('http://192.168.1.10:8001/mcp')).toThrow(/machine locale/)
    expect(() => new UnrealMcpClient('https://example.com/mcp')).toThrow(/machine locale/)
  })
})

describe('client MCP : lecture des réponses', () => {
  function clientReplying(text: string, isError = false): UnrealMcpClient {
    const fetchImpl = async (): Promise<Response> =>
      new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: { content: [{ type: 'text', text }], isError }
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Mcp-Session-Id': 'abc' }
        }
      )
    return new UnrealMcpClient('http://127.0.0.1:8001/mcp', fetchImpl as typeof fetch)
  }

  it("renvoie la valeur d'un succès", async () => {
    const client = clientReplying('{"returnValue":true}')
    expect(await client.callTool('t', 'save', {})).toBe(true)
  })

  it("signale comme erreur un texte qui n'est pas une réponse", async () => {
    const client = clientReplying("Tool 'x' not found")
    await expect(client.callTool('t', 'x', {})).rejects.toBeInstanceOf(UnrealCallError)
  })

  it('signale comme erreur une réponse marquée isError', async () => {
    const client = clientReplying('{"returnValue":null}', true)
    await expect(client.callTool('t', 'x', {})).rejects.toThrow(/x/)
  })
})
