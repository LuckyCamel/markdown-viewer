import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import App from './App'
import { useTabStore } from './features/tabs/useTabStore'
import { useUIStore } from './stores/useUIStore'
import { useFileStore } from './features/file-tree/useFileStore'

const mockIpc = vi.hoisted(() => ({
  store: { get: vi.fn(), set: vi.fn(), del: vi.fn() },
  files: { listDirectory: vi.fn(), readFile: vi.fn(), getFileInfo: vi.fn() },
  search: { searchContent: vi.fn(), onResult: vi.fn(), offResult: vi.fn() },
  watcher: { watchFile: vi.fn(), unwatchFile: vi.fn(), onChange: vi.fn(), offChange: vi.fn() },
  dialog: { openDirectory: vi.fn(), openFile: vi.fn() },
  shell: { openExternal: vi.fn() },
  ipc: { on: vi.fn(), off: vi.fn() },
}))

vi.mock('./lib/ipc', () => ({ ipc: mockIpc }))

describe('App', () => {
  beforeEach(() => {
    useTabStore.setState({ openFiles: [], activeFile: null })
    useUIStore.setState({ sidebarVisible: true, outlineVisible: true, searchPanel: 'none' })
    useFileStore.setState({ entries: {}, expanded: new Set(), loading: new Set(), rootPath: null })
    vi.clearAllMocks()
    mockIpc.store.get.mockResolvedValue(undefined)
    mockIpc.store.set.mockResolvedValue(undefined)
    mockIpc.files.listDirectory.mockResolvedValue([])
    mockIpc.files.readFile.mockResolvedValue({ path: '', content: '' })
  })

  it('should show WelcomePage when no workspace', () => {
    render(<App />)
    expect(screen.getByText('Markdown Viewer')).toBeDefined()
  })

  it('should restore workspace from electron-store on mount', async () => {
    mockIpc.store.get.mockImplementation(async (key: string) => {
      if (key === 'lastWorkspace') return '/test/workspace'
      return undefined
    })

    await act(async () => {
      render(<App />)
    })

    expect(screen.getByText('workspace')).toBeDefined()
  })

  it('should respond to menu IPC events', async () => {
    const handlers = new Map<string, (...args: unknown[]) => void>()
    mockIpc.ipc.on.mockImplementation((channel: string, cb: (...args: unknown[]) => void) => {
      handlers.set(channel, cb)
    })
    mockIpc.store.get.mockImplementation(async () => undefined)

    render(<App />)

    act(() => {
      handlers.get('menu:toggleFileTree')!()
    })
    expect(useUIStore.getState().sidebarVisible).toBe(false)

    act(() => {
      handlers.get('menu:toggleOutline')!()
    })
    expect(useUIStore.getState().outlineVisible).toBe(false)

    act(() => {
      handlers.get('menu:fileSearch')!()
    })
    expect(useUIStore.getState().searchPanel).toBe('file')

    act(() => {
      handlers.get('menu:contentSearch')!()
    })
    expect(useUIStore.getState().searchPanel).toBe('content')
  })

  it('should handle menu:closeTab', async () => {
    mockIpc.store.get.mockImplementation(async () => undefined)
    mockIpc.files.readFile.mockImplementation(async () => ({ path: '/test/a.md', content: 'a' }))
    mockIpc.files.listDirectory.mockImplementation(async () => [
      { name: 'a.md', path: '/test/a.md', isDirectory: false, isHidden: false },
    ])

    const handlers = new Map<string, (...args: unknown[]) => void>()
    mockIpc.ipc.on.mockImplementation((channel: string, cb: (...args: unknown[]) => void) => {
      handlers.set(channel, cb)
    })

    await act(async () => {
      render(<App />)
    })

    await act(async () => {
      useTabStore.getState().openFile('/test/a.md')
    })
    expect(useTabStore.getState().openFiles).toHaveLength(1)

    act(() => {
      handlers.get('menu:closeTab')!()
    })
    expect(useTabStore.getState().openFiles).toHaveLength(0)
  })
})
