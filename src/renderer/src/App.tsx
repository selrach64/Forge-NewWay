import { useEffect, useState } from 'react'
import type { AppInfo } from '../../shared/app-info'

type LoadState =
  { status: 'loading' } | { status: 'ready'; info: AppInfo } | { status: 'error'; message: string }

export default function App(): React.JSX.Element {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    window.forge
      .getAppInfo()
      .then((info) => setState({ status: 'ready', info }))
      .catch((error: unknown) =>
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : String(error)
        })
      )
  }, [])

  return (
    <main className="forge-shell">
      <header>
        <h1>Forge</h1>
        <p className="subtitle">Mécaniques de jeu vers Unreal Engine 5</p>
      </header>

      <section aria-label="Informations de l'application">
        {state.status === 'loading' && <p>Chargement…</p>}
        {state.status === 'error' && <p role="alert">Erreur : {state.message}</p>}
        {state.status === 'ready' && (
          <dl>
            <dt>Application</dt>
            <dd>{state.info.name}</dd>
            <dt>Version</dt>
            <dd>{state.info.version}</dd>
            <dt>Electron</dt>
            <dd>{state.info.electron}</dd>
            <dt>Chromium</dt>
            <dd>{state.info.chrome}</dd>
            <dt>Node</dt>
            <dd>{state.info.node}</dd>
          </dl>
        )}
      </section>

      <p className="phase-note">
        Phase 1 : initialisation. Les pages métier arrivent dans les phases suivantes.
      </p>
    </main>
  )
}
