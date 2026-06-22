import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useMenuIpc } from './useMenuIpc'

const onCalls: Array<[string, (...args: unknown[]) => void]> = []
const offCalls: Array<[string, (...args: unknown[]) => void]> = []

const mockOn = vi.fn((channel: string, cb: (...args: unknown[]) => void) => {
  onCalls.push([channel, cb])
})
const mockOff = vi.fn((channel: string, cb: (...args: unknown[]) => void) => {
  offCalls.push([channel, cb])
})

vi.mock('../lib/ipc', () => ({
  ipc: {
    ipc: {
      on: (...args: unknown[]) => mockOn(...args),
      off: (...args: unknown[]) => mockOff(...args),
    },
  },
}))

const mockCloseFile = vi.fn()
const mockSetActive = vi.fn()

vi.mock('../features/tabs/useTabStore', () => ({
  useTabStore: {
    getState: () => ({
      openFiles: ['/a.md', '/b.md', '/c.md'],
      activeFile: '/b.md',
      closeFile: mockCloseFile,
      setActive: mockSetActive,
    }),
  },
}))

const defaultHandlers = {
  onOpenFolder: vi.fn(),
  onToggleSidebar: vi.fn(),
  onToggleOutline: vi.fn(),
  onOpenFileSearch: vi.fn(),
  onOpenContentSearch: vi.fn(),
  onToggleSettings: vi.fn(),
}

describe('useMenuIpc', () => {
  beforeEach(() => {
    onCalls.length = 0
    offCalls.length = 0
    vi.clearAllMocks()
  })

  it('挂载时注册 9 个 IPC 监听', () => {
    renderHook(() => useMenuIpc(defaultHandlers))
    expect(onCalls).toHaveLength(9)
  })

  it('卸载时注销全部监听', () => {
    const { unmount } = renderHook(() => useMenuIpc(defaultHandlers))
    unmount()
    expect(offCalls).toHaveLength(9)
  })

  it('menu:openFolder 调用 onOpenFolder', () => {
    const onOpenFolder = vi.fn()
    renderHook(() => useMenuIpc({ ...defaultHandlers, onOpenFolder }))
    const [, cb] = onCalls.find(([ch]) => ch === 'menu:openFolder')!
    ;(cb as (path: string) => void)('/test')
    expect(onOpenFolder).toHaveBeenCalledWith('/test')
  })

  it('menu:toggleFileTree 调用 onToggleSidebar', () => {
    const onToggle = vi.fn()
    renderHook(() => useMenuIpc({ ...defaultHandlers, onToggleSidebar: onToggle }))
    const [, cb] = onCalls.find(([ch]) => ch === 'menu:toggleFileTree')!
    ;(cb as () => void)()
    expect(onToggle).toHaveBeenCalled()
  })

  it('menu:closeTab 调用 closeFile', () => {
    renderHook(() => useMenuIpc(defaultHandlers))
    const [, cb] = onCalls.find(([ch]) => ch === 'menu:closeTab')!
    ;(cb as () => void)()
    expect(mockCloseFile).toHaveBeenCalledWith('/b.md')
  })

  it('menu:nextTab 循环到下一个', () => {
    renderHook(() => useMenuIpc(defaultHandlers))
    const [, cb] = onCalls.find(([ch]) => ch === 'menu:nextTab')!
    ;(cb as () => void)()
    expect(mockSetActive).toHaveBeenCalledWith('/c.md')
  })

  it('menu:prevTab 循环到上一个', () => {
    renderHook(() => useMenuIpc(defaultHandlers))
    const [, cb] = onCalls.find(([ch]) => ch === 'menu:prevTab')!
    ;(cb as () => void)()
    expect(mockSetActive).toHaveBeenCalledWith('/a.md')
  })

  it('handler 更新后 IPC 事件使用新 handler', () => {
    const oldHandler = vi.fn()
    const newHandler = vi.fn()
    const { rerender } = renderHook(
      ({ handler }) => useMenuIpc({ ...defaultHandlers, onOpenFolder: handler }),
      { initialProps: { handler: oldHandler } },
    )
    rerender({ handler: newHandler })
    const [, cb] = onCalls.find(([ch]) => ch === 'menu:openFolder')!
    ;(cb as (path: string) => void)('/test')
    expect(newHandler).toHaveBeenCalledWith('/test')
    expect(oldHandler).not.toHaveBeenCalled()
  })
})
