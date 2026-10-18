// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/renderer/src/App'

beforeEach(() => {
  window.forge = {
    getAppInfo: vi.fn().mockResolvedValue({
      schemaVersion: 'app-info.v1',
      name: 'Forge',
      version: '0.1.0',
      electron: '44',
      chrome: '1',
      node: '24'
    })
  }
})

afterEach(() => cleanup())

describe('navigation', () => {
  it('affiche les 11 pages de la navigation', () => {
    render(<App />)
    expect(screen.getAllByRole('button')).toHaveLength(11)
  })

  it('marque la page active et change de page', () => {
    render(<App />)
    const dashboard = screen.getByRole('button', { name: 'Tableau de bord' })
    expect(dashboard.getAttribute('aria-current')).toBe('page')

    fireEvent.click(screen.getByRole('button', { name: 'Catalogue' }))
    expect(screen.getByRole('button', { name: 'Catalogue' }).getAttribute('aria-current')).toBe(
      'page'
    )
    expect(dashboard.getAttribute('aria-current')).toBeNull()
  })

  it('affiche le bandeau de démonstration sur les pages fictives', () => {
    render(<App />)
    expect(screen.getAllByText(/DONNÉES DE DÉMONSTRATION/).length).toBeGreaterThan(0)
  })
})
