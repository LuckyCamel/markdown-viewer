import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useMenuEvents } from './useMenuEvents'

const mockListen = vi.fn()
const mockCloseFile = vi.fn()

vi.mock('@tauri-apps/api/event', () => ({
  listen: (...args: unknown[]) => mockListen(...args),
}))

vi.mock('../features/tabs/useTabStore', () => ({
  useTabStore: {
    getState: () => ({
      activeFile: '/a.md',
      closeFile: mockCloseFile,
    }),
  },
}))

describe('useMenuEvents', () => {
  const handlers = {
    onOpenFolder: vi.fn(),
    onOpenFile: vi.fn(),
    onToggleSidebar: vi.fn(),
    onToggleOutline: vi.fn(),
    onOpenFileSearch: vi.fn(),
    onOpenContentSearch: vi.fn(),
    onToggleSettings: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockListen.mockResolvedValue(vi.fn())
  })

  it('注册 menu-action 监听器', () => {
    renderHook(() => useMenuEvents(handlers))
    expect(mockListen).toHaveBeenCalledWith('menu-action', expect.any(Function))
  })

  it('分发菜单 ID 到对应处理器', async () => {
    let callback: ((event: { payload: string }) => void) | undefined
    mockListen.mockImplementation(async (_channel, cb) => {
      callback = cb
      return vi.fn()
    })

    renderHook(() => useMenuEvents(handlers))
    expect(callback).toBeDefined()
    callback!({ payload: 'menu_toggle_sidebar' })
    expect(handlers.onToggleSidebar).toHaveBeenCalled()
  })
})
