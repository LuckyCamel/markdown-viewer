import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('preload API shape', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('should expose all required namespaces', async () => {
    const mod = await import('../preload/index')
    const electron = await import('electron')
    expect(electron.contextBridge.exposeInMainWorld).toHaveBeenCalledWith('api', expect.any(Object))
    const api = (electron.contextBridge.exposeInMainWorld as any).mock.calls[0][1]
    expect(api).toHaveProperty('files')
    expect(api).toHaveProperty('search')
    expect(api).toHaveProperty('watcher')
    expect(api).toHaveProperty('store')
    expect(api).toHaveProperty('dialog')
    expect(api).toHaveProperty('shell')
    expect(api).toHaveProperty('ipc')
  })

  it('should have correct function signatures on files', async () => {
    const electron = await import('electron')
    await import('../preload/index')
    const api = (electron.contextBridge.exposeInMainWorld as any).mock.calls[0][1]
    expect(typeof api.files.listDirectory).toBe('function')
    expect(typeof api.files.readFile).toBe('function')
    expect(typeof api.files.getFileInfo).toBe('function')
  })

  it('should have correct function signatures on ipc', async () => {
    const electron = await import('electron')
    await import('../preload/index')
    const api = (electron.contextBridge.exposeInMainWorld as any).mock.calls[0][1]
    expect(typeof api.ipc.on).toBe('function')
    expect(typeof api.ipc.off).toBe('function')
    expect(api.ipc.on.length).toBe(2)
    expect(api.ipc.off.length).toBe(2)
  })
})
