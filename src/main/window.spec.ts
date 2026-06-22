import { describe, it, expect, vi } from 'vitest'

describe('createWindow', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('should create a BrowserWindow', async () => {
    const { createWindow } = await import('./window')
    const win = await createWindow()
    expect(win).toBeDefined()
    expect(win.webContents).toBeDefined()
  })

  it('should restore saved window bounds', async () => {
    const { appStore } = await import('./store')
    appStore.set('windowBounds', { x: 100, y: 200, width: 800, height: 600 })
    const { createWindow } = await import('./window')
    const win = await createWindow()
    expect(win).toBeDefined()
  })

  it('should save bounds on resize', async () => {
    const { createWindow } = await import('./window')
    const win = await createWindow()
    const onCall = (win.on as any).mock.calls.find((c: any[]) => c[0] === 'resize')
    expect(onCall).toBeDefined()
  })
})
