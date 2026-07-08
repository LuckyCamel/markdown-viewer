import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import App from './App'
import { useTabStore } from './features/tabs/useTabStore'
import { useUIStore } from './stores/useUIStore'
import { useFileStore } from './features/file-tree/useFileStore'

const mockIpc = vi.hoisted(() => ({
  app: { getLaunchPaths: vi.fn() },
  scope: { grantFsScope: vi.fn().mockResolvedValue(undefined) },
  store: { get: vi.fn(), set: vi.fn(), del: vi.fn() },
  files: {
    listDirectory: vi.fn(),
    readFile: vi.fn(),
    getFileInfo: vi.fn(),
    updateSettings: vi.fn(),
  },
  search: { searchContent: vi.fn(), cancelSearch: vi.fn(), onResult: vi.fn(), offResult: vi.fn() },
  watcher: {
    watchFile: vi.fn(),
    unwatchFile: vi.fn(),
    onChange: vi.fn(() => vi.fn()),
    offChange: vi.fn(),
  },
  dialog: { openDirectory: vi.fn(), openFile: vi.fn() },
  shell: { openExternal: vi.fn() },
}))

vi.mock('./lib/ipc', () => ({
  ensureStoreMigrated: vi.fn().mockResolvedValue(undefined),
  ipc: mockIpc,
}))

describe('App', () => {
  beforeEach(() => {
    useTabStore.setState({ openFiles: [], activeFile: null })
    useUIStore.setState({
      sidebarVisible: true,
      outlineVisible: true,
      sidebarWidth: 256,
      outlineWidth: 224,
      searchPanel: 'none',
    })
    useFileStore.setState({ entries: {}, expanded: {}, loading: {}, rootPath: null })
    vi.clearAllMocks()
    mockIpc.store.get.mockResolvedValue(undefined)
    mockIpc.store.set.mockResolvedValue(undefined)
    mockIpc.files.listDirectory.mockResolvedValue([])
    mockIpc.files.readFile.mockResolvedValue({ path: '', content: '' })
    mockIpc.files.updateSettings.mockResolvedValue(undefined)
    mockIpc.app.getLaunchPaths.mockResolvedValue([])
  })

  it('should show WelcomePage when no workspace', () => {
    render(<App />)
    expect(screen.getByText('Markdown-Viewer')).toBeDefined()
  })

  it('should restore workspace from store on mount', async () => {
    mockIpc.store.get.mockImplementation(async (key: string) => {
      if (key === 'lastWorkspace') return '/test/workspace'
      return undefined
    })

    await act(async () => {
      render(<App />)
    })

    expect(screen.getByText('workspace')).toBeDefined()
  })

  it('should restore panel widths from store on mount', async () => {
    mockIpc.store.get.mockImplementation(async (key: string) => {
      if (key === 'sidebarWidth') return 300
      if (key === 'outlineWidth') return 350
      return undefined
    })

    await act(async () => {
      render(<App />)
    })

    expect(useUIStore.getState().sidebarWidth).toBe(300)
    expect(useUIStore.getState().outlineWidth).toBe(350)
  })
})
