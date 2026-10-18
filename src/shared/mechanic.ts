import { z } from 'zod'

/** Statut d'une règle : distingue faits observés, documentés, hypothèses et choix de conception. */
export const RuleStatusSchema = z.enum(['observed', 'documented', 'hypothesis', 'design_choice'])
export type RuleStatus = z.infer<typeof RuleStatusSchema>

export const ConfidenceSchema = z.enum(['high', 'medium', 'low'])
export type Confidence = z.infer<typeof ConfidenceSchema>

export const RuleSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  status: RuleStatusSchema,
  confidence: ConfidenceSchema,
  sourceIds: z.array(z.string()),
  /** true si l'utilisateur a corrigé la règle */
  editedByUser: z.boolean()
})
export type Rule = z.infer<typeof RuleSchema>

export const ParameterSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  value: z.number(),
  unit: z.string(),
  min: z.number(),
  max: z.number()
})
export type Parameter = z.infer<typeof ParameterSchema>

/** Contrat versionné d'une mécanique (sous-ensemble v1 de docs/ARCHITECTURE.md §3.2). */
export const MECHANIC_SCHEMA_VERSION = 'mechanic.v1'

export const MechanicSchema = z
  .object({
    schemaVersion: z.literal(MECHANIC_SCHEMA_VERSION),
    id: z.string().regex(/^mech\.[a-z0-9_.]+$/),
    name: z.string().min(1),
    description: z.string(),
    category: z.enum(['resource', 'movement', 'inventory', 'interaction', 'combat']),
    parameters: z.array(ParameterSchema),
    rules: z.array(RuleSchema)
  })
  .superRefine((mechanic, ctx) => {
    const keys = mechanic.parameters.map((p) => p.key)
    keys.forEach((key, index) => {
      if (keys.indexOf(key) !== index) {
        ctx.addIssue({
          code: 'custom',
          message: `Paramètre dupliqué : ${key}`,
          path: ['parameters', index]
        })
      }
    })
    mechanic.parameters.forEach((p, index) => {
      if (p.value < p.min || p.value > p.max) {
        ctx.addIssue({
          code: 'custom',
          message: `Valeur hors bornes : ${p.key}`,
          path: ['parameters', index]
        })
      }
    })
  })
export type Mechanic = z.infer<typeof MechanicSchema>
