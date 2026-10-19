import { describe, expect, it } from 'vitest'
import { isSandboxCommandLine } from '../src/unreal/sandbox'

describe('garde sandbox', () => {
  it('accepte la copie de test lancée par son .uproject', () => {
    const line = String.raw`"E:\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor.exe" "C:\Users\selra\Documents\Unreal Projects\Fayel_Forge_Clean\Fayel.uproject" -ExecCmds="ModelContextProtocol.StartServer 8002"`
    expect(isSandboxCommandLine(line)).toBe(true)
  })

  it('refuse le projet original', () => {
    const line = String.raw`"UnrealEditor.exe" "C:\Users\selra\Documents\Unreal Projects\Fayel\Fayel.uproject"`
    expect(isSandboxCommandLine(line)).toBe(false)
  })

  it('refuse la copie précédente Fayel_Forge', () => {
    const line = String.raw`"UnrealEditor.exe" "C:\Users\selra\Documents\Unreal Projects\Fayel_Forge\Fayel.uproject"`
    expect(isSandboxCommandLine(line)).toBe(false)
  })

  it('accepte les séparateurs slash', () => {
    const line =
      '"UnrealEditor.exe" "C:/Users/selra/Documents/Unreal Projects/Fayel_Forge_Clean/Fayel.uproject"'
    expect(isSandboxCommandLine(line)).toBe(true)
  })
})
