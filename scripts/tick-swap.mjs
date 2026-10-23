/* eslint-disable @typescript-eslint/explicit-function-return-type */
// Remplace le graphe EventGraph d'un Blueprint de test par le contenu d'un fichier DSL.
// Usage : node scripts/tick-swap.mjs <endpoint> <blueprint-asset-path> <fichier.dsl>
import { readFileSync } from 'node:fs'

const [endpoint, assetPath, dslFile] = process.argv.slice(2)
const BLUEPRINT = 'editor_toolset.toolsets.blueprint.BlueprintTools'
const ASSET = 'editor_toolset.toolsets.asset.AssetTools'

let sid = null
async function call(toolset, tool, args) {
  if (!sid) {
    const init = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-11-25',
          capabilities: {},
          clientInfo: { name: 'tick-swap', version: '0' }
        }
      })
    })
    sid = init.headers.get('mcp-session-id')
  }
  const r = await fetch(endpoint, {
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
        arguments: { toolset_name: toolset, tool_name: tool, arguments: args }
      }
    })
  })
  const j = await r.json()
  if (!j.result) throw new Error(JSON.stringify(j.error))
  const text = j.result.content[0].text
  if (/Error|could not|not found|does not exist/i.test(text)) throw new Error(text.slice(0, 300))
  return text
}

const name = assetPath.split('/').pop()
const bp = { refPath: `${assetPath}.${name}` }
const graph = { refPath: `${assetPath}.${name}:EventGraph` }

// 1. Vider le graphe (write_graph_dsl ne supprime pas les nœuds existants).
const found = JSON.parse(
  await call(BLUEPRINT, 'find_nodes', { graph, title: '', entry_points_only: false })
)
const refs = found.returnValue.map((r) => r.refPath)
let deleted = 0
for (const ref of refs) {
  try {
    await call(BLUEPRINT, 'delete_node', { node: { refPath: ref } })
    deleted++
  } catch {
    // Certains nœuds (points d'entrée) ne se suppriment pas : on continue.
  }
}
console.log(`nœuds supprimés : ${deleted} / ${refs.length}`)

// 2. Écrire le nouveau contenu.
const code = readFileSync(dslFile, 'utf8')
await call(BLUEPRINT, 'write_graph_dsl', { graph, code })
await call(BLUEPRINT, 'compile_blueprint', { blueprint: bp })
await call(ASSET, 'save_assets', { asset_paths: [assetPath] })

// 3. Relecture.
const readback = JSON.parse(await call(BLUEPRINT, 'read_graph_dsl', { graph }))
console.log('relecture (début) :')
console.log(readback.returnValue.slice(0, 400))
