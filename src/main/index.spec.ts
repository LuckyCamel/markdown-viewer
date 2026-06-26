import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./store', () => ({
  appStore: {
    get: vi.fn().mockReturnValue(['.git']),
    set: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
  },
  StoreSchema: {} as any,
}))

vi.mock('./watcher', () => ({
  watchFile: vi.fn(),
  unwatchFile: vi.fn(),
  unwatchAll: vi.fn(),
}))

vi.mock('./logger', () => ({
  logError: vi.fn(),
}))

vi.mock('./window', () => ({
  createWindow: vi.fn().mockReturnValue({
    webContents: { send: vi.fn() },
    on: vi.fn(),
    loadURL: vi.fn(),
  }),
  getMainWindow: vi.fn().mockReturnValue({
    webContents: { send: vi.fn() },
  }),
}))

vi.mock('./handlers', () => ({
  handleListDirectory: vi.fn(),
  handleReadFile: vi.fn(),
  handleGetFileInfo: vi.fn(),
  handleStoreGet: vi.fn(),
  handleStoreSet: vi.fn(),
  handleStoreDelete: vi.fn(),
  handleSearchContent: vi.fn(),
}))

describe('registerIpcHandlers', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  function getIpcMainHandleCalls(ipcMain: any) {
    return ipcMain.handle.mock.calls.map((c: any[]) => c[0])
  }

  function getIpcMainOnCalls(ipcMain: any) {
    return ipcMain.on.mock.calls.map((c: any[]) => c[0])
  }

  it('注册 10 个 ipcMain.handle 调用', async () => {
    const { ipcMain } = await import('electron')
    const { registerIpcHandlers } = await import('./index')
    registerIpcHandlers()
    expect(ipcMain.handle).toHaveBeenCalledTimes(10)
  })

  it('注册 3 个 ipcMain.on 调用', async () => {
    const { ipcMain } = await import('electron')
    const { registerIpcHandlers } = await import('./index')
    registerIpcHandlers()
    expect(ipcMain.on).toHaveBeenCalledTimes(3)
  })

  it('注册 files:listDirectory handler', async () => {
    const { ipcMain } = await import('electron')
    const { registerIpcHandlers } = await import('./index')
    registerIpcHandlers()
    const calls = getIpcMainHandleCalls(ipcMain)
    expect(calls).toContain('files:listDirectory')
  })

  it('注册 store:get handler', async () => {
    const { ipcMain } = await import('electron')
    const { registerIpcHandlers } = await import('./index')
    registerIpcHandlers()
    const calls = getIpcMainHandleCalls(ipcMain)
    expect(calls).toContain('store:get')
  })

  it('注册 dialog:openDirectory handler', async () => {
    const { ipcMain } = await import('electron')
    const { registerIpcHandlers } = await import('./index')
    registerIpcHandlers()
    const calls = getIpcMainHandleCalls(ipcMain)
    expect(calls).toContain('dialog:openDirectory')
  })

  it('注册 watcher:watchFile 和 watcher:unwatchFile 通道', async () => {
    const { ipcMain } = await import('electron')
    const { registerIpcHandlers } = await import('./index')
    registerIpcHandlers()
    const calls = getIpcMainOnCalls(ipcMain)
    expect(calls).toContain('watcher:watchFile')
    expect(calls).toContain('watcher:unwatchFile')
  })

  it('注册 search 通道', async () => {
    const { ipcMain } = await import('electron')
    const { registerIpcHandlers } = await import('./index')
    registerIpcHandlers()
    const calls = getIpcMainOnCalls(ipcMain)
    expect(calls).toContain('files:searchContent')
  })
})
