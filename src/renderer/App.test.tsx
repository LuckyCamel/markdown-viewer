import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import App from './App'
import { useTabStore } from './features/tabs/useTabStore'
import { useUIStore } from './stores/useUIStore'

describe('App', () => {
  beforeEach(() => {
    useTabStore.setState({ openFiles: [], activeFile: null })
    useUIStore.setState({ sidebarVisible: true, outlineVisible: true, searchPanel: 'none' })
  })

  it('should show WelcomePage when no workspace', () => {
    render(<App />)
    expect(screen.getByText('Markdown Viewer')).toBeDefined()
  })

  it('should restore workspace from electron-store on mount', async () => {
    window.api.store.get = vi.fn(async (key: string) => {
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
    window.api.store.get = vi.fn(async () => undefined)
    window.api.ipc.on = vi.fn((channel: string, cb: (...args: unknown[]) => void) => {
      handlers.set(channel, cb)
    })

    render(<App />)

    act(() => { handlers.get('menu:toggleFileTree')!() })
    expect(useUIStore.getState().sidebarVisible).toBe(false)

    act(() => { handlers.get('menu:toggleOutline')!() })
    expect(useUIStore.getState().outlineVisible).toBe(false)

    act(() => { handlers.get('menu:fileSearch')!() })
    expect(useUIStore.getState().searchPanel).toBe('file')

    act(() => { handlers.get('menu:contentSearch')!() })
    expect(useUIStore.getState().searchPanel).toBe('content')
  })

  it('should handle menu:closeTab', async () => {
    window.api.store.get = vi.fn(async () => undefined)
    window.api.files.readFile = vi.fn(async () => ({ path: '/test/a.md', content: 'a' }))
    window.api.files.listDirectory = vi.fn(async () => [
      { name: 'a.md', path: '/test/a.md', isDirectory: false, isHidden: false },
    ])

    const handlers = new Map<string, (...args: unknown[]) => void>()
    window.api.ipc.on = vi.fn((channel: string, cb: (...args: unknown[]) => void) => {
      handlers.set(channel, cb)
    })

    await act(async () => {
      render(<App />)
    })

    await act(async () => {
      useTabStore.getState().openFile('/test/a.md')
    })
    expect(useTabStore.getState().openFiles).toHaveLength(1)

    act(() => { handlers.get('menu:closeTab')!() })
    expect(useTabStore.getState().openFiles).toHaveLength(0)
  })
})
