// Lance le plan de démonstration sur une copie de test. Usage : node out-scripts/run-plan.cjs <endpoint>
import { writeFileSync } from 'node:fs'
import { compilePlan } from '../src/core/plan'
import { DEMO_MECHANICS } from '../src/renderer/src/fixtures/mechanics'
import { executePlan } from '../src/unreal/executor'
import { UnrealMcpClient } from '../src/unreal/mcp-client'

async function main(): Promise<void> {
  const endpoint = process.argv[2] ?? 'http://127.0.0.1:8002/mcp'
  // Suffixe optionnel : évite de réécrire des assets déjà générés (ex. "_v2").
  const suffix = process.argv[4] ?? ''
  const mechanics = DEMO_MECHANICS.map((m) => {
    const [, segment, ...rest] = m.id.split('.')
    return { ...m, id: ['mech', `${segment}${suffix}`, ...rest].join('.') }
  })
  const plan = compilePlan(mechanics)
  console.log(`plan ${plan.planHash} : ${plan.operations.length} opérations`)

  const client = new UnrealMcpClient(endpoint)
  await client.connect()
  const report = await executePlan(plan, plan.planHash, client)

  writeFileSync(process.argv[3] ?? 'run-report.json', JSON.stringify(report, null, 2))
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
