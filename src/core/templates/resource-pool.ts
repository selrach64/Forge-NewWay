/**
 * Modèle component.resource_pool.v1 : une réserve qui se consomme (esquive) et se régénère
 * après un délai. Les noms de variables sont fixes : le plan doit les déclarer.
 *
 * Les dispatchers portent un suffixe propre à chaque asset (ex. OnEnduranceChangedEnduranceV3) :
 * deux composants du même projet ne peuvent pas partager le même nom, sinon l'éditeur lie
 * les appels au dispatcher d'un autre Blueprint. Le DSL est celui de BlueprintTools (UE 5.8.3).
 */
export const RESOURCE_POOL_TEMPLATE_ID = 'component.resource_pool.v1'

export const RESOURCE_POOL_REQUIRED_VARIABLES = [
  'MaxEndurance',
  'DodgeCost',
  'RegenRate',
  'RegenDelay',
  'CurrentEndurance',
  'TimeSinceSpend'
] as const

/**
 * Nom court d'un asset, au format que l'éditeur utilise pour ses nœuds :
 * BP_AC_Endurance_v3 -> EnduranceV3 (underscores retirés, segments en majuscule).
 */
export function assetShortName(assetName: string): string {
  return assetName
    .replace(/^BP_AC_/, '')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

/** Dispatchers du modèle, nommés pour un asset donné. */
export function resourcePoolDispatchers(
  short: string
): { name: string; params: { name: string; type: 'float' }[] }[] {
  return [
    {
      name: `OnEnduranceChanged${short}`,
      params: [
        { name: 'Current', type: 'float' },
        { name: 'Max', type: 'float' }
      ]
    },
    { name: `OnExhausted${short}`, params: [] },
    { name: `OnDodgeRefused${short}`, params: [] }
  ]
}

/** Esquive : retire le coût si possible, renvoie vrai ou faux. */
export function tryDodgeDsl(short: string): string {
  return `(fn TryDodge ()
  (bind cur (Variables|Default|GetCurrentEndurance))
  (bind cost (Variables|Default|GetDodgeCost))
  (bind maxE (Variables|Default|GetMaxEndurance))
  (if (>= cur cost)
    (bind newCur (- cur cost))
    (Variables|Default|SetCurrentEndurance newCur)
    (Variables|Default|SetTimeSinceSpend 0.0)
    (Default|CallOnEnduranceChanged${short} :self self :Current newCur :Max maxE)
    (if (<= newCur 0.0)
      (Default|CallOnExhausted${short} :self self))
    (return true)
    (else
      (Default|CallOnDodgeRefused${short} :self self)
      (return false))))`
}

/** Régénération à chaque tick, après le délai depuis la dernière dépense. */
export function tickDsl(short: string): string {
  return `(event EventTick (DeltaSeconds)
  (bind tsp (Variables|Default|GetTimeSinceSpend))
  (bind delay (Variables|Default|GetRegenDelay))
  (bind cur (Variables|Default|GetCurrentEndurance))
  (bind maxE (Variables|Default|GetMaxEndurance))
  (bind rate (Variables|Default|GetRegenRate))
  (bind newTsp (+ tsp DeltaSeconds))
  (Variables|Default|SetTimeSinceSpend newTsp)
  (if (and (>= newTsp delay) (< cur maxE))
    (bind newVal (select (> (+ cur (* rate DeltaSeconds)) maxE) maxE (+ cur (* rate DeltaSeconds))))
    (Variables|Default|SetCurrentEndurance newVal)
    (Default|CallOnEnduranceChanged${short} :self self :Current newVal :Max maxE)))`
}
