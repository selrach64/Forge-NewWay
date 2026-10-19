import { describe, expect, it } from 'vitest'
import { compilePlan } from '../src/core/plan'
import { executePlan, VerificationError } from '../src/unreal/executor'
import { UnrealCallError, type ToolCaller } from '../src/unreal/mcp-client'
import { DEMO_ENDURANCE, DEMO_WEIGHT } from '../src/renderer/src/fixtures/mechanics'

/** Faux serveur Unreal : garde les valeurs par défaut en mémoire, comme l'éditeur. */
function fakeUnreal(
  options: { failOn?: string; ignoreDefaults?: boolean; forgetFunction?: boolean } = {}
): ToolCaller & {
  calls: string[]
} {
  const values = new Map<string, Record<string, number>>()
  const calls: string[] = []
  return {
    calls,
    async callTool(toolset, tool, args) {
      calls.push(tool)
      if (options.failOn === tool) throw new UnrealCallError('Function not found', toolset, tool)
      switch (tool) {
        case 'create':
          return { refPath: `${args.folder_path}/${args.asset_name}.${args.asset_name}` }
        case 'add_variable':
        case 'set_variable_instance_editable':
        case 'compile_blueprint':
          return null
        case 'set_properties': {
          // L'éditeur renvoie false pour set_properties même quand la valeur est appliquée.
          if (!options.ignoreDefaults) {
            const instance = (args.instance as { refPath: string }).refPath
            values.set(instance, { ...values.get(instance), ...JSON.parse(String(args.values)) })
          }
          return false
        }
        case 'get_properties': {
          const instance = (args.instance as { refPath: string }).refPath
          const stored = values.get(instance) ?? {}
          const names = args.properties as string[]
          return JSON.stringify(Object.fromEntries(names.map((n) => [n, stored[n] ?? 0])))
        }
        case 'save_assets':
          return true
        case 'add_event_dispatcher':
        case 'add_function_graph':
        case 'add_function_param':
        case 'write_graph_dsl':
          return null
        case 'list_functions':
          return options.forgetFunction ? [] : [{ name: 'TryDodge' }]
        case 'list_event_dispatchers':
          return ['OnEnduranceChanged', 'OnExhausted', 'OnDodgeRefused']
        case 'read_graph_dsl': {
          const graph = (args.graph as { refPath: string }).refPath
          return graph.endsWith(':TryDodge')
            ? '(fn TryDodge () (Default|CallOnDodgeRefused))'
            : '(event EventTick (DeltaSeconds) (Default|CallOnEnduranceChanged))'
        }
        default:
          throw new Error(`outil inconnu : ${tool}`)
      }
    }
  }
}

describe('exécuteur de plan', () => {
  const plan = compilePlan([DEMO_ENDURANCE, DEMO_WEIGHT])

  it('applique le plan approuvé et relit chaque valeur', async () => {
    const report = await executePlan(plan, plan.planHash, fakeUnreal())
    expect(report.status).toBe('succeeded')
    expect(report.steps.every((s) => s.status === 'ok')).toBe(true)
    expect(report.steps.length).toBe(plan.operations.length)
  })

  it("refuse un plan dont l'approbation ne correspond pas, avant tout appel", async () => {
    const tools = fakeUnreal()
    await expect(executePlan(plan, 'f'.repeat(64), tools)).rejects.toThrow(VerificationError)
    expect(tools.calls).toEqual([])
  })

  it('refuse un plan modifié après calcul de son empreinte', async () => {
    const tampered = { ...plan, operations: plan.operations.slice(1) }
    const tools = fakeUnreal()
    await expect(executePlan(tampered, plan.planHash, tools)).rejects.toThrow(/altéré/)
    expect(tools.calls).toEqual([])
  })

  it("s'arrête à la première erreur d'appel", async () => {
    const tools = fakeUnreal({ failOn: 'add_variable' })
    const report = await executePlan(plan, plan.planHash, tools)
    expect(report.status).toBe('failed')
    expect(report.steps.at(-1)?.status).toBe('failed')
    expect(report.steps.at(-1)?.detail).toContain('appel Unreal')
    expect(tools.calls.filter((t) => t === 'save_assets')).toEqual([])
  })

  it('détecte une valeur qui ne correspond pas à la relecture', async () => {
    const report = await executePlan(plan, plan.planHash, fakeUnreal({ ignoreDefaults: true }))
    expect(report.status).toBe('failed')
    expect(report.steps.at(-1)?.detail).toMatch(/attendu [0-9.]+, relu 0/)
  })
})
