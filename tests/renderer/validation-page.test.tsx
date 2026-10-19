// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/renderer/src/App'
import { compilePlan } from '../../src/core/plan'
import { DEMO_MECHANICS } from '../../src/renderer/src/fixtures/mechanics'

afterEach(() => cleanup())

function installForge(
  execute = vi.fn().mockResolvedValue({ ok: false, error: 'refus de test' })
): void {
  window.forge = {
    getAppInfo: vi.fn().mockResolvedValue({
      schemaVersion: 'app-info.v1',
      name: 'Forge',
      version: '0.1.0',
      electron: '44',
      chrome: '1',
      node: '24'
    }),
    compilePlan: vi.fn(async (mechanics) => ({
      ok: true,
      plan: compilePlan(mechanics as typeof DEMO_MECHANICS)
    })),
    executePlan: execute
  } as unknown as typeof window.forge
}

async function openValidation(): Promise<void> {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Validation' }))
  await screen.findByRole('button', { name: 'Préparer et approuver un run' })
}

describe('page Validation', () => {
  it('prépare un run avec un suffixe neuf, jamais les noms de base', async () => {
    installForge()
    await openValidation()
    fireEvent.click(screen.getByRole('button', { name: 'Préparer et approuver un run' }))
    await screen.findByText(/approuvé/)
    const [sent] =
      (window.forge.compilePlan as unknown as { mock: { calls: unknown[][] } }).mock.calls.at(-1) ??
      []
    const ids = (sent as { id: string }[]).map((m) => m.id)
    expect(ids.every((id) => /_r\d{14}\./.test(id))).toBe(true)
  })

  it("n'exécute rien sans confirmation distincte", async () => {
    const execute = vi.fn().mockResolvedValue({ ok: false, error: 'refus de test' })
    installForge(execute)
    await openValidation()
    fireEvent.click(screen.getByRole('button', { name: 'Préparer et approuver un run' }))
    fireEvent.click(
      await screen.findByRole('button', { name: 'Exécuter le run sur la copie de test…' })
    )
    expect(execute).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’exécution' }))
    await waitFor(() => expect(execute).toHaveBeenCalledTimes(1))
  })

  it("une approbation ne sert qu'une fois", async () => {
    const execute = vi.fn().mockResolvedValue({ ok: false, error: 'refus de test' })
    installForge(execute)
    await openValidation()
    fireEvent.click(screen.getByRole('button', { name: 'Préparer et approuver un run' }))
    fireEvent.click(
      await screen.findByRole('button', { name: 'Exécuter le run sur la copie de test…' })
    )
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’exécution' }))
    await waitFor(() => expect(execute).toHaveBeenCalledTimes(1))
    expect(
      screen.queryByRole('button', { name: 'Exécuter le run sur la copie de test…' })
    ).toBeNull()
    expect(screen.getByRole('button', { name: 'Préparer et approuver un run' })).toBeTruthy()
  })

  it('affiche le refus de la garde sandbox', async () => {
    installForge(
      vi
        .fn()
        .mockResolvedValue({ ok: false, error: "Le port 8002 n'appartient pas à la copie de test" })
    )
    await openValidation()
    fireEvent.click(screen.getByRole('button', { name: 'Préparer et approuver un run' }))
    fireEvent.click(
      await screen.findByRole('button', { name: 'Exécuter le run sur la copie de test…' })
    )
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’exécution' }))
    await waitFor(() =>
      expect(screen.getByText(/n'appartient pas à la copie de test/)).toBeTruthy()
    )
  })
})
