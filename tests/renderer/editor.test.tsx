// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MechanicEditor } from '../../src/renderer/src/pages/pages'
import { DEMO_ENDURANCE } from '../../src/renderer/src/fixtures/mechanics'

afterEach(() => cleanup())

describe('éditeur de fiche', () => {
  it('affiche la fiche valide au départ', () => {
    render(<MechanicEditor initial={DEMO_ENDURANCE} />)
    expect(screen.getByText('Fiche valide.')).toBeTruthy()
  })

  it('signale une valeur hors bornes', () => {
    render(<MechanicEditor initial={DEMO_ENDURANCE} />)
    const cost = screen.getByLabelText(/Coût d'une esquive/)
    fireEvent.change(cost, { target: { value: '500' } })
    expect(screen.getByRole('alert').textContent).toContain('DodgeCost')
    expect(screen.getByText('Fiche invalide : corrigez les erreurs.')).toBeTruthy()
  })

  it("change le statut d'une règle", () => {
    render(<MechanicEditor initial={DEMO_ENDURANCE} />)
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[2], { target: { value: 'documented' } })
    expect((selects[2] as HTMLSelectElement).value).toBe('documented')
  })
})
