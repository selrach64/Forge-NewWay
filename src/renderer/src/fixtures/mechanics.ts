// DONNÉES DE DÉMONSTRATION — ne pas confondre avec des données réelles.
// Ces valeurs viennent de la mission (endurance) et de propositions de conception (poids).
import { MECHANIC_SCHEMA_VERSION, type Mechanic } from '../../../shared/mechanic'

export const DEMO_ENDURANCE: Mechanic = {
  schemaVersion: MECHANIC_SCHEMA_VERSION,
  id: 'mech.endurance.core',
  name: 'Endurance',
  description: "Réserve d'endurance consommée par l'esquive et régénérée après un délai.",
  category: 'resource',
  parameters: [
    {
      key: 'MaxEndurance',
      label: 'Endurance maximale',
      value: 100,
      unit: 'pts',
      min: 1,
      max: 1000
    },
    { key: 'DodgeCost', label: "Coût d'une esquive", value: 25, unit: 'pts', min: 0, max: 100 },
    { key: 'RegenRate', label: 'Régénération', value: 15, unit: 'pts/s', min: 0, max: 100 },
    { key: 'RegenDelay', label: 'Délai avant régénération', value: 1, unit: 's', min: 0, max: 10 }
  ],
  rules: [
    {
      id: 'rule.dodge_refused',
      text: "L'esquive est refusée si l'endurance est inférieure au coût.",
      status: 'design_choice',
      confidence: 'high',
      sourceIds: [],
      editedByUser: false
    },
    {
      id: 'rule.regen_delay',
      text: 'La régénération reprend après le délai, à partir de la dernière dépense.',
      status: 'design_choice',
      confidence: 'high',
      sourceIds: [],
      editedByUser: false
    },
    {
      id: 'rule.stamina_drain_observed',
      text: "Dans le jeu de référence, l'endurance se vide pendant l'escalade.",
      status: 'hypothesis',
      confidence: 'low',
      sourceIds: [],
      editedByUser: false
    }
  ]
}

export const DEMO_MECHANICS: Mechanic[] = [DEMO_ENDURANCE]
