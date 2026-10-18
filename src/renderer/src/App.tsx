import { useState } from 'react'
import { PageView } from './pages/pages'
import { PAGES, type PageId } from './pages/registry'

export default function App(): React.JSX.Element {
  const [current, setCurrent] = useState<PageId>('dashboard')

  return (
    <div className="forge-layout">
      <nav aria-label="Navigation principale">
        <h1>Forge</h1>
        <ul>
          {PAGES.map((page) => (
            <li key={page.id}>
              <button
                type="button"
                aria-current={current === page.id ? 'page' : undefined}
                onClick={() => setCurrent(page.id)}
              >
                {page.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <main>
        <PageView id={current} />
      </main>
    </div>
  )
}
