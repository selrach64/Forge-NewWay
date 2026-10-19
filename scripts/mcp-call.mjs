// Outil de test local : appelle un outil MCP Unreal et affiche la réponse.
// Usage : node scripts/mcp-call.mjs <endpoint> <toolset> <tool> '<json args>'
const [endpoint, toolset, tool, argsJson = '{}'] = process.argv.slice(2)

const init = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'forge-test', version: '0' }
    }
  })
})
const sid = init.headers.get('mcp-session-id')

const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'Mcp-Session-Id': sid
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'call_tool',
      arguments: { toolset_name: toolset, tool_name: tool, arguments: JSON.parse(argsJson) }
    }
  })
})
const body = await response.json()
console.log(body.result ? body.result.content[0].text : JSON.stringify(body.error))
