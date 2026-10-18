// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/renderer/src/App'
import { compilePlan } from '../../src/core/plan'
import { DEMO_ENDURANCE, DEMO_MECHANICS } from '../../src/renderer/src/fixtures/mechanics'

afterEach(() => cleanup())

function installForge(compilePlanImpl: (mechanics: unknown[]) => Promise<unknown>): void {
  window.forge = {
    getAppInfo: vi.fn().mockResolvedValue({
      schemaVersion: 'app-info.v1',
      name: 'Forge',
      version: '0.1.0',
      electron: '44',
      chrome: '1',
      node: '24'
    }),
    compilePlan: vi.fn(compilePlanImpl)
  } as unknown as typeof window.forge
}

describe('page Plan de fusion', () => {
  it('affiche les opérations du plan validé', async () => {
    installForge(async (mechanics) => ({
      ok: true,
      plan: compilePlan(mechanics as typeof DEMO_MECHANICS)
    }))
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Plan de fusion' }))
    await waitFor(() => expect(screen.getByText(/opérations, dans l’ordre/)).toBeTruthy())
    expect(
      screen.getByText(/CreateBlueprint \/Game\/Forge\/Inventory\/BP_AC_Inventory/)
    ).toBeTruthy()
    expect(screen.getByText(/AddVariable BP_AC_Endurance.MaxEndurance = 100/)).toBeTruthy()
  })

  it('affiche le refus du cœur métier sans le masquer', async () => {
    installForge(async () => ({
      ok: false,
      error: 'Fusion refusée : dépendance manquante : mech.endurance.core lit Inventory.TotalWeight'
    }))
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Plan de fusion' }))
    await waitFor(() =>
      expect(screen.getByText(/Fusion refusée : dépendance manquante/)).toBeTruthy()
    )
  })

  it('signale une erreur de communication', async () => {
    installForge(async () => {
      throw new Error('Appel IPC refusé')
    })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Dépendances' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Appel IPC refusé'))
  })

  it('envoie les mécaniques de démonstration au cœur métier', async () => {
    installForge(async (mechanics) => ({
      ok: true,
      plan: compilePlan(mechanics as typeof DEMO_MECHANICS)
    }))
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Dépendances' }))
    await waitFor(() =>
      expect(window.forge.compilePlan).toHaveBeenCalledWith([DEMO_ENDURANCE, DEMO_MECHANICS[1]])
    )
  })
})
