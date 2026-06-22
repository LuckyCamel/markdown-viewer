import { describe, it, expect, vi } from 'vitest'

describe('createAppMenu', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('should create menu without throwing', async () => {
    const { createAppMenu } = await import('./menu')
    expect(() => createAppMenu({ webContents: { send: vi.fn() } } as any)).not.toThrow()
  })

  it('should build menu template', async () => {
    const electron = await import('electron')
    const { createAppMenu } = await import('./menu')
    createAppMenu({ webContents: { send: vi.fn() } } as any)
    expect(electron.Menu.buildFromTemplate).toHaveBeenCalled()
  })
})
