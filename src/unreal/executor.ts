import { hashOf, type MergePlan } from '../core/plan'
import {
  assetShortName,
  RESOURCE_POOL_TEMPLATE_ID,
  resourcePoolDispatchers,
  tickDsl,
  tryDodgeDsl
} from '../core/templates/resource-pool'
import type { UnrealOperation } from '../shared/unreal-operation'
import { UnrealCallError, type ToolCaller } from './mcp-client'

const BLUEPRINT = 'editor_toolset.toolsets.blueprint.BlueprintTools'
const OBJECT = 'editor_toolset.toolsets.object.ObjectTools'
const ASSET = 'editor_toolset.toolsets.asset.AssetTools'
const EPSILON = 1e-6

export interface StepRecord {
  index: number
  op: UnrealOperation['op']
  asset?: string
  status: 'ok' | 'failed'
  detail: string
}

export interface ExecutionReport {
  planHash: string
  status: 'succeeded' | 'failed'
  steps: StepRecord[]
}

/** Erreur de vérification : le plan a été appliqué partiellement ou une valeur ne correspond pas. */
export class VerificationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VerificationError'
  }
}

/** Chemin de classe d'un Blueprint : /Game/Forge/X/BP_AC_X -> /Game/Forge/X/BP_AC_X.BP_AC_X */
function objectPath(assetPath: string): string {
  const name = assetPath.split('/').pop()!
  return `${assetPath}.${name}`
}

/** Objet par défaut (CDO) : BP_AC_X -> ...BP_AC_X.Default__BP_AC_X_C */
function defaultObjectPath(assetPath: string): string {
  const name = assetPath.split('/').pop()!
  return `${assetPath}.Default__${name}_C`
}

/**
 * Exécute un plan approuvé. Vérifie d'abord que le plan correspond exactement à l'approbation,
 * puis applique les opérations une à une, en relisant chaque résultat. S'arrête à la première erreur.
 */
export async function executePlan(
  plan: MergePlan,
  approvedHash: string,
  tools: ToolCaller
): Promise<ExecutionReport> {
  const { planHash, ...body } = plan
  if (hashOf(body) !== planHash) throw new VerificationError('Plan altéré : empreinte incohérente')
  if (approvedHash !== planHash)
    throw new VerificationError('Le plan a changé depuis son approbation')

  const steps: StepRecord[] = []
  // Variables déclarées par asset, avec leur valeur attendue, pour contrôle final.
  const expected = new Map<string, Map<string, number>>()

  const record = (
    index: number,
    op: UnrealOperation,
    status: 'ok' | 'failed',
    detail: string
  ): void => {
    steps.push({ index, op: op.op, asset: 'asset' in op ? op.asset : undefined, status, detail })
  }

  for (let index = 0; index < plan.operations.length; index++) {
    const op = plan.operations[index]
    try {
      switch (op.op) {
        case 'CreateBlueprint': {
          const folder = op.path.slice(0, op.path.lastIndexOf('/'))
          const name = op.path.split('/').pop()!
          const created = await tools.callTool(BLUEPRINT, 'create', {
            folder_path: folder,
            asset_name: name,
            asset_type: { refPath: '/Script/Engine.ActorComponent' }
          })
          if (!created) throw new VerificationError(`Création sans chemin retourné : ${op.path}`)
          expected.set(op.path, new Map())
          record(index, op, 'ok', `créé ${op.path}`)
          break
        }
        case 'AddVariable': {
          const bp = { refPath: objectPath(op.asset) }
          await tools.callTool(BLUEPRINT, 'add_variable', {
            blueprint: bp,
            name: op.name,
            type_name: op.type
          })
          if (op.editable) {
            await tools.callTool(BLUEPRINT, 'set_variable_instance_editable', {
              blueprint: bp,
              variable_name: op.name,
              instance_editable: true
            })
          }
          if (typeof op.defaultValue === 'number')
            expected.get(op.asset)?.set(op.name, op.defaultValue)
          record(index, op, 'ok', `${op.name} ajouté`)
          break
        }
        case 'Compile': {
          const bp = { refPath: objectPath(op.asset) }
          await tools.callTool(BLUEPRINT, 'compile_blueprint', { blueprint: bp })
          // Les valeurs par défaut ne peuvent être posées qu'après compilation de la classe.
          const defaults = expected.get(op.asset) ?? new Map<string, number>()
          const nonZero = [...defaults].filter(([, value]) => value !== 0)
          if (nonZero.length > 0) {
            const values = Object.fromEntries(nonZero)
            await tools.callTool(OBJECT, 'set_properties', {
              instance: { refPath: defaultObjectPath(op.asset) },
              values: JSON.stringify(values)
            })
            await tools.callTool(BLUEPRINT, 'compile_blueprint', { blueprint: bp })
          }
          // Relecture : chaque valeur doit correspondre à ce que le plan demande.
          const readRaw = await tools.callTool(OBJECT, 'get_properties', {
            instance: { refPath: defaultObjectPath(op.asset) },
            properties: [...defaults.keys()]
          })
          const actual = JSON.parse(String(readRaw)) as Record<string, number>
          for (const [name, value] of defaults) {
            if (typeof actual[name] !== 'number' || Math.abs(actual[name] - value) > EPSILON) {
              throw new VerificationError(
                `${op.asset}.${name} : attendu ${value}, relu ${actual[name]}`
              )
            }
          }
          record(index, op, 'ok', `compilé, ${defaults.size} valeurs relues`)
          break
        }
        case 'Save': {
          const saved = await tools.callTool(ASSET, 'save_assets', { asset_paths: [op.asset] })
          if (saved !== true) throw new VerificationError(`Sauvegarde non confirmée : ${op.asset}`)
          record(index, op, 'ok', `sauvegardé ${op.asset}`)
          break
        }
        case 'ApplyTemplate': {
          if (op.templateId !== RESOURCE_POOL_TEMPLATE_ID) {
            throw new VerificationError(`Modèle non implémenté : ${op.templateId}`)
          }
          await applyResourcePool(tools, op.asset)
          record(
            index,
            op,
            'ok',
            `${op.templateId} : fonction TryDodge, régénération, 3 événements`
          )
          break
        }
        case 'AddFunction':
          throw new VerificationError(`Opération non implémentée dans l'exécuteur : ${op.op}`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const kind = error instanceof UnrealCallError ? 'appel Unreal' : 'vérification'
      record(index, op, 'failed', `${kind} : ${message}`)
      return { planHash, status: 'failed', steps }
    }
  }

  return { planHash, status: 'succeeded', steps }
}

/**
 * Applique le modèle component.resource_pool.v1 à un Blueprint existant, puis relit le résultat :
 * les dispatchers, la fonction et les deux graphes doivent exister dans l'éditeur.
 */
async function applyResourcePool(tools: ToolCaller, asset: string): Promise<void> {
  const bp = { refPath: objectPath(asset) }
  const fn = { refPath: `${objectPath(asset)}:TryDodge` }
  const graph = { refPath: `${objectPath(asset)}:EventGraph` }

  const short = assetShortName(asset.split('/').pop() ?? asset)
  const dispatchers = resourcePoolDispatchers(short)
  for (const dispatcher of dispatchers) {
    await tools.callTool(BLUEPRINT, 'add_event_dispatcher', {
      blueprint: bp,
      name: dispatcher.name
    })
    for (const param of dispatcher.params) {
      await tools.callTool(BLUEPRINT, 'add_function_param', {
        graph: { refPath: `${objectPath(asset)}:${dispatcher.name}` },
        param_name: param.name,
        param_type: param.type,
        input_param: true,
        container_type: null
      })
    }
  }

  await tools.callTool(BLUEPRINT, 'add_function_graph', { blueprint: bp, graph_name: 'TryDodge' })
  await tools.callTool(BLUEPRINT, 'add_function_param', {
    graph: fn,
    param_name: 'ReturnValue',
    param_type: 'bool',
    input_param: false,
    container_type: null
  })
  await tools.callTool(BLUEPRINT, 'write_graph_dsl', { graph: fn, code: tryDodgeDsl(short) })
  await tools.callTool(BLUEPRINT, 'write_graph_dsl', { graph, code: tickDsl(short) })
  await tools.callTool(BLUEPRINT, 'compile_blueprint', { blueprint: bp })

  // Relecture : tout ce qui a été écrit doit être présent dans l'éditeur.
  const functions = (await tools.callTool(BLUEPRINT, 'list_functions', { blueprint: bp })) as {
    name?: string
  }[]
  if (!functions.some((f) => f.name === 'TryDodge'))
    throw new VerificationError('TryDodge absente après écriture')
  const found = (await tools.callTool(BLUEPRINT, 'list_event_dispatchers', {
    blueprint: bp
  })) as unknown[]
  if (found.length < dispatchers.length) {
    throw new VerificationError(`dispatchers : ${found.length} sur ${dispatchers.length}`)
  }
  const dodge = String(await tools.callTool(BLUEPRINT, 'read_graph_dsl', { graph: fn }))
  if (!dodge.includes('CallOnDodgeRefused'))
    throw new VerificationError('TryDodge relu sans refus d’esquive')
  const tick = String(await tools.callTool(BLUEPRINT, 'read_graph_dsl', { graph }))
  if (!tick.includes('EventTick') || !tick.includes('CallOnEnduranceChanged')) {
    throw new VerificationError('EventTick relu sans régénération')
  }
}
