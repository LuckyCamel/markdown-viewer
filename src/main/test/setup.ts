import { vi, beforeEach } from 'vitest'

const overrides = new Map<string, unknown>()

beforeEach(() => {
  overrides.clear()
})

vi.mock('electron', () => {
  const mockBrowserWindow = vi.fn().mockImplementation(() => ({
    webContents: { send: vi.fn() },
    loadURL: vi.fn(),
    loadFile: vi.fn(),
    on: vi.fn(),
    close: vi.fn(),
    getSize: vi.fn(() => [1200, 800]),
    getPosition: vi.fn(() => [0, 0]),
    setSize: vi.fn(),
    setPosition: vi.fn(),
    show: vi.fn(),
    isDestroyed: vi.fn(() => false),
  }))

  return {
    app: {
      getPath: vi.fn(() => '/tmp/mock-userdata'),
      getVersion: vi.fn(() => '1.0.0'),
      on: vi.fn(),
      quit: vi.fn(),
    },
    BrowserWindow: mockBrowserWindow,
    ipcMain: { handle: vi.fn(), on: vi.fn() },
    ipcRenderer: { invoke: vi.fn(), on: vi.fn(), send: vi.fn(), removeListener: vi.fn() },
    contextBridge: { exposeInMainWorld: vi.fn() },
    Menu: {
      buildFromTemplate: vi.fn(() => ({})),
      setApplicationMenu: vi.fn(),
    },
    dialog: {
      showOpenDialog: vi.fn(() => Promise.resolve({ canceled: true, filePaths: [] })),
      showMessageBox: vi.fn(),
    },
    shell: { openExternal: vi.fn() },
    protocol: { handle: vi.fn(), registerFileProtocol: vi.fn() },
  }
})

vi.mock('electron-store', () => {
  return {
    default: class MockStore {
      private defaults = new Map<string, unknown>()

      constructor(opts?: { defaults?: Record<string, unknown> }) {
        if (opts?.defaults) {
          for (const [k, v] of Object.entries(opts.defaults)) {
            this.defaults.set(k, v)
          }
        }
      }
      get(key: string) {
        return overrides.has(key) ? overrides.get(key) : this.defaults.get(key)
      }
      set(key: string, value: unknown) {
        overrides.set(key, value)
      }
      delete(key: string) {
        overrides.delete(key)
      }
      clear() {
        overrides.clear()
      }
    },
  }
})
