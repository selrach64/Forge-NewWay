import { useEffect, useState, type ReactElement } from 'react'
import type { AppInfo } from '../../../shared/app-info'
import { MechanicSchema, type Mechanic, type RuleStatus } from '../../../shared/mechanic'
import { DEMO_MECHANICS } from '../fixtures/mechanics'
import type { CompileResult } from '../../../shared/ipc'
import type { UnrealOperation } from '../../../shared/unreal-operation'
import type { PageId } from './registry'

export type { PageId }

/** Bandeau affiché sur toute page qui n'utilise que des données fictives. */
function DemoBanner(): ReactElement {
  return (
    <p className="demo-banner" role="note">
      DONNÉES DE DÉMONSTRATION — ces valeurs ne sont pas réelles.
    </p>
  )
}

function Page({ title, children }: { title: string; children: React.ReactNode }): ReactElement {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function Dashboard(): ReactElement {
  return (
    <Page title="Tableau de bord">
      <DemoBanner />
      <ul>
        <li>Mécaniques suivies : {DEMO_MECHANICS.length}</li>
        <li>Projet Unreal sélectionné : Fayel_Forge (démonstration)</li>
        <li>Dernière génération : aucune</li>
      </ul>
    </Page>
  )
}

function Projects(): ReactElement {
  return (
    <Page title="Projets Unreal">
      <DemoBanner />
      <table>
        <thead>
          <tr>
            <th>Projet</th>
            <th>Moteur déclaré</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Fayel_Forge</td>
            <td>5.7 (conversion non enregistrée)</td>
            <td>Copie de test</td>
          </tr>
        </tbody>
      </table>
    </Page>
  )
}

function Search(): ReactElement {
  return (
    <Page title="Recherche de jeux et de mécaniques">
      <DemoBanner />
      <p>La recherche sur sources publiques arrive en phase 5 (intégration IA et budget).</p>
    </Page>
  )
}

function Catalog(): ReactElement {
  return (
    <Page title="Catalogue">
      <DemoBanner />
      <ul>
        {DEMO_MECHANICS.map((m) => (
          <li key={m.id}>
            {m.name} <small>({m.category})</small>
          </li>
        ))}
      </ul>
    </Page>
  )
}

function Compare(): ReactElement {
  return (
    <Page title="Comparaison">
      <DemoBanner />
      <p>Sélection de deux mécaniques pour comparer leurs paramètres et règles (à venir).</p>
    </Page>
  )
}

const STATUS_LABELS: Record<RuleStatus, string> = {
  observed: 'Observé',
  documented: 'Documenté',
  hypothesis: 'Hypothèse',
  design_choice: 'Choix de conception'
}

/** Éditeur de fiche : modifie les paramètres et les statuts, valide le contrat à chaque changement. */
export function MechanicEditor({ initial }: { initial: Mechanic }): ReactElement {
  const [mechanic, setMechanic] = useState<Mechanic>(initial)

  const result = MechanicSchema.safeParse(mechanic)
  const errors = result.success ? [] : result.error.issues.map((issue) => issue.message)

  return (
    <form onSubmit={(event) => event.preventDefault()} aria-label="Éditeur de fiche">
      <h3>{mechanic.name}</h3>
      <fieldset>
        <legend>Paramètres</legend>
        {mechanic.parameters.map((p, index) => (
          <label key={p.key} className="field">
            {p.label} ({p.unit})
            <input
              type="number"
              value={p.value}
              onChange={(event) => {
                const value = event.target.valueAsNumber
                setMechanic((current) => ({
                  ...current,
                  parameters: current.parameters.map((param, i) =>
                    i === index
                      ? { ...param, value: Number.isNaN(value) ? param.min : value }
                      : param
                  )
                }))
              }}
            />
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Règles</legend>
        {mechanic.rules.map((rule, index) => (
          <div key={rule.id} className="rule">
            <p>{rule.text}</p>
            <label>
              Statut
              <select
                value={rule.status}
                onChange={(event) =>
                  setMechanic((current) => ({
                    ...current,
                    rules: current.rules.map((r, i) =>
                      i === index
                        ? { ...r, status: event.target.value as RuleStatus, editedByUser: true }
                        : r
                    )
                  }))
                }
              >
                {(Object.keys(STATUS_LABELS) as RuleStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ))}
      </fieldset>

      {errors.length > 0 && (
        <ul role="alert" className="errors">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
      <p>{result.success ? 'Fiche valide.' : 'Fiche invalide : corrigez les erreurs.'}</p>
    </form>
  )
}

function Editor(): ReactElement {
  return (
    <Page title="Éditeur de fiche">
      <DemoBanner />
      <MechanicEditor initial={DEMO_MECHANICS[0]} />
    </Page>
  )
}

/** Charge le plan calculé par le cœur métier (processus principal) pour les mécaniques de démonstration. */
function usePlan(): { result: CompileResult | null; error: string | null } {
  const [result, setResult] = useState<CompileResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.forge
      .compilePlan(DEMO_MECHANICS)
      .then(setResult)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [])

  return { result, error }
}

function Dependencies(): ReactElement {
  const { result, error } = usePlan()
  return (
    <Page title="Dépendances et conflits">
      <DemoBanner />
      {error && <p role="alert">Erreur : {error}</p>}
      {!result && !error && <p>Calcul en cours…</p>}
      {result && (
        <>
          <h3>Ordre de génération</h3>
          <ol>
            {(result.ok ? result.plan.mechanicIds : []).map((id) => (
              <li key={id}>{id}</li>
            ))}
          </ol>
          <h3>Dépendances</h3>
          {result.ok && result.plan.graph.edges.length === 0 && <p>Aucune dépendance.</p>}
          <ul>
            {(result.ok ? result.plan.graph.edges : []).map((e) => (
              <li key={`${e.from}-${e.to}-${e.resource}`}>
                {e.from} → {e.to} <small>({e.resource})</small>
              </li>
            ))}
          </ul>
          <h3>Conflits et manques</h3>
          {result.ok ? (
            <p>Aucun conflit ni dépendance manquante.</p>
          ) : (
            <p role="alert">{result.error}</p>
          )}
        </>
      )}
    </Page>
  )
}

function MergePlan(): ReactElement {
  const { result, error } = usePlan()
  return (
    <Page title="Plan de fusion">
      <DemoBanner />
      {error && <p role="alert">Erreur : {error}</p>}
      {!result && !error && <p>Calcul en cours…</p>}
      {result && !result.ok && <p role="alert">Fusion refusée : {result.error}</p>}
      {result && result.ok && (
        <>
          <p>
            Empreinte du plan : <code>{result.plan.planHash.slice(0, 16)}…</code>
          </p>
          <p>{result.plan.operations.length} opérations, dans l’ordre :</p>
          <ol className="operations">
            {result.plan.operations.map((op, index) => (
              <li key={index}>
                <code>{describeOperation(op)}</code>
              </li>
            ))}
          </ol>
          <p className="phase-note">
            Le plan n’est pas encore approuvable : l’approbation arrive avec la phase 6.
          </p>
        </>
      )}
    </Page>
  )
}

function describeOperation(op: UnrealOperation): string {
  switch (op.op) {
    case 'CreateBlueprint':
      return `CreateBlueprint ${op.path}`
    case 'AddVariable':
      return `AddVariable ${op.asset.split('/').pop()}.${op.name} = ${op.defaultValue}`
    case 'AddFunction':
      return `AddFunction ${op.name}`
    case 'ApplyTemplate':
      return `ApplyTemplate ${op.templateId}`
    case 'Compile':
    case 'Save':
      return `${op.op} ${op.asset}`
  }
}

function Validation(): ReactElement {
  return (
    <Page title="Validation des modifications">
      <DemoBanner />
      <p>Aucune modification en attente d’approbation.</p>
    </Page>
  )
}

function History(): ReactElement {
  return (
    <Page title="Historique et tests">
      <DemoBanner />
      <p>Aucune génération enregistrée.</p>
    </Page>
  )
}

function Settings({ appInfo }: { appInfo: AppInfo | null }): ReactElement {
  return (
    <Page title="Réglages">
      <p className="phase-note">Les réglages IA, MCP et budget sont prévus en phase 5.</p>
      {appInfo ? (
        <dl>
          <dt>Application</dt>
          <dd>{appInfo.name}</dd>
          <dt>Version</dt>
          <dd>{appInfo.version}</dd>
          <dt>Electron</dt>
          <dd>{appInfo.electron}</dd>
          <dt>Node</dt>
          <dd>{appInfo.node}</dd>
        </dl>
      ) : (
        <p>Chargement des informations…</p>
      )}
    </Page>
  )
}

export function PageView({ id }: { id: PageId }): ReactElement {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)

  useEffect(() => {
    if (id !== 'settings') return
    window.forge
      .getAppInfo()
      .then(setAppInfo)
      .catch(() => setAppInfo(null))
  }, [id])

  switch (id) {
    case 'dashboard':
      return <Dashboard />
    case 'projects':
      return <Projects />
    case 'search':
      return <Search />
    case 'catalog':
      return <Catalog />
    case 'compare':
      return <Compare />
    case 'editor':
      return <Editor />
    case 'dependencies':
      return <Dependencies />
    case 'mergePlan':
      return <MergePlan />
    case 'validation':
      return <Validation />
    case 'history':
      return <History />
    case 'settings':
      return <Settings appInfo={appInfo} />
  }
}
