import { z } from 'zod'

/**
 * Liste blanche des opérations que la Forge peut demander à Unreal (docs/ARCHITECTURE.md §5.3).
 * Toute opération hors de cette union est refusée à la validation : l'IA ne produit jamais
 * d'opération Blueprint libre.
 */
const AssetPath = z.string().regex(/^\/Game\/Forge\/[\w/]+$/, 'Chemin hors de /Game/Forge/')

export const UnrealOperationSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('CreateBlueprint'),
    parent: z.literal('ActorComponent'),
    path: AssetPath
  }),
  z.object({
    op: z.literal('AddVariable'),
    asset: AssetPath,
    name: z.string().regex(/^[A-Za-z]\w*$/),
    type: z.enum(['float', 'int', 'bool']),
    defaultValue: z.union([z.number(), z.boolean()]),
    editable: z.boolean()
  }),
  z.object({
    op: z.literal('AddFunction'),
    asset: AssetPath,
    name: z.string().regex(/^[A-Za-z]\w*$/)
  }),
  z.object({
    op: z.literal('ApplyTemplate'),
    asset: AssetPath,
    templateId: z.string().regex(/^component\.[a-z_]+\.v\d+$/),
    params: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()]))
  }),
  z.object({
    op: z.literal('Compile'),
    asset: AssetPath
  }),
  z.object({
    op: z.literal('Save'),
    asset: AssetPath
  })
])

export type UnrealOperation = z.infer<typeof UnrealOperationSchema>
