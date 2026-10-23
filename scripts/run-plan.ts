// Lance un run du plan de démonstration sur la copie de test, avec les mêmes garde-fous que l'application :
// garde sandbox sur le port 8002, suffixe de run neuf, exécuteur avec relecture.
// Usage : node run-plan.cjs [runId|auto] [rapport.json]
import { writeFileSync } from 'node:fs'
import { compilePlan } from '../src/core/plan'
import { makeRunId, suffixMechanics } from '../src/core/run'
import { DEMO_MECHANICS } from '../src/renderer/src/fixtures/mechanics'
import { executePlan } from '../src/unreal/executor'
import { UnrealMcpClient } from '../src/unreal/mcp-client'
import { assertSandboxListener, SANDBOX_PORT } from '../src/unreal/sandbox'

async function main(): Promise<void> {
  const requested = process.argv[2] ?? 'auto'
  const runId = requested === 'auto' ? makeRunId(new Date()) : requested
  const reportPath = process.argv[3] ?? `run-${runId}.json`

  assertSandboxListener(SANDBOX_PORT)
  console.log(`garde sandbox : OK (port ${SANDBOX_PORT})`)

  const plan = compilePlan(suffixMechanics(DEMO_MECHANICS, runId))
  console.log(
    `run ${runId} : empreinte ${plan.planHash.slice(0, 16)}…, ${plan.operations.length} opérations`
  )

  const client = new UnrealMcpClient(`http://127.0.0.1:${SANDBOX_PORT}/mcp`)
  await client.connect()
  const report = await executePlan(plan, plan.planHash, client)

  writeFileSync(reportPath, JSON.stringify({ runId, ...report }, null, 2))
  for (const step of report.steps) {
    console.log(
      `${String(step.index).padStart(2)} ${step.status.padEnd(6)} ${step.op.padEnd(16)} ${step.detail}`
    )
  }
  console.log(`RESULTAT : ${report.status}`)
  process.exitCode = report.status === 'succeeded' ? 0 : 1
}

main().catch((error: unknown) => {
  console.error('ERREUR :', error instanceof Error ? error.message : error)
  process.exitCode = 2
})
