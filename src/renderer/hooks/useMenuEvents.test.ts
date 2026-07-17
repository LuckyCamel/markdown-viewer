import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useMenuEvents } from './useMenuEvents'
import { commandRegistry } from '../features/commands/commands'

const mockListen = vi.fn()

vi.mock('@tauri-apps/api/event', () => ({
  listen: (...args: unknown[]) => mockListen(...args),
}))

vi.mock('../features/tabs/useTabStore', () => ({
  useTabStore: {
    getState: () => ({
      activeFile: '/a.md',
      closeFile: vi.fn(),
    }),
  },
}))

vi.mock('../stores/useUIStore', () => ({
  useUIStore: {
    getState: () => ({
      toggleSidebar: vi.fn(),
      toggleOutline: vi.fn(),
      openSearch: vi.fn(),
    }),
  },
}))

vi.mock('../stores/useCommandStore', () => ({
  useCommandStore: {
    getState: () => ({
      show: vi.fn(),
    }),
  },
}))

describe('useMenuEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListen.mockResolvedValue(vi.fn())
  })

  it('注册 menu-action 监听器', () => {
    renderHook(() => useMenuEvents())
    expect(mockListen).toHaveBeenCalledWith('menu-action', expect.any(Function))
  })

  it('分发菜单 ID 到 commandRegistry', async () => {
    let callback: ((event: { payload: string }) => void) | undefined
    mockListen.mockImplementation(async (_channel, cb) => {
      callback = cb
      return vi.fn()
    })

    const mockExecute = vi.spyOn(commandRegistry, 'execute').mockReturnValue(true)

    renderHook(() => useMenuEvents())
    expect(callback).toBeDefined()
    callback!({ payload: 'menu_toggle_sidebar' })
    expect(mockExecute).toHaveBeenCalledWith('view.toggleSidebar')

    mockExecute.mockRestore()
  })
})
