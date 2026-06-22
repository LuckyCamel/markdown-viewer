import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useFileWatcher } from './useFileWatcher'

const mockWatchFile = vi.fn()
const mockUnwatchFile = vi.fn()
const mockOnChange = vi.fn()
const mockOffChange = vi.fn()

vi.mock('../lib/ipc', () => ({
  ipc: {
    watcher: {
      watchFile: (...args: unknown[]) => mockWatchFile(...args),
      unwatchFile: (...args: unknown[]) => mockUnwatchFile(...args),
      onChange: (...args: unknown[]) => mockOnChange(...args),
      offChange: (...args: unknown[]) => mockOffChange(...args),
    },
  },
}))

const mockSetContent = vi.fn()
const mockMarkDirty = vi.fn()
const mockClearDirty = vi.fn()

vi.mock('../features/markdown-viewer/useEditorStore', () => ({
  useEditorStore: { getState: () => ({ setContent: mockSetContent }) },
}))
vi.mock('../features/tabs/useTabStore', () => ({
  useTabStore: {
    getState: () => ({ markDirty: mockMarkDirty, clearDirty: mockClearDirty }),
  },
}))

describe('useFileWatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('enabled=true 时为每个文件注册 watchFile', () => {
    renderHook(() => useFileWatcher(['/a.md', '/b.md'], true))
    expect(mockWatchFile).toHaveBeenCalledTimes(2)
    expect(mockWatchFile).toHaveBeenCalledWith('/a.md')
    expect(mockWatchFile).toHaveBeenCalledWith('/b.md')
  })

  it('卸载时为每个文件注销 unwatchFile', () => {
    const { unmount } = renderHook(() => useFileWatcher(['/a.md'], true))
    unmount()
    expect(mockUnwatchFile).toHaveBeenCalledWith('/a.md')
  })

  it('enabled=false 时不注册监听', () => {
    renderHook(() => useFileWatcher(['/a.md'], false))
    expect(mockWatchFile).not.toHaveBeenCalled()
  })

  it('openFiles 为空时不注册监听', () => {
    renderHook(() => useFileWatcher([], true))
    expect(mockWatchFile).not.toHaveBeenCalled()
  })

  it('change 事件 → setContent + markDirty + 2s 后 clearDirty', () => {
    renderHook(() => useFileWatcher(['/a.md'], true))
    const onChangeCb = mockOnChange.mock.calls[0][0]
    onChangeCb({ path: '/a.md', type: 'change' }, 'new content')
    expect(mockSetContent).toHaveBeenCalledWith('/a.md', 'new content')
    expect(mockMarkDirty).toHaveBeenCalledWith('/a.md')

    vi.advanceTimersByTime(2000)
    expect(mockClearDirty).toHaveBeenCalledWith('/a.md')
  })

  it('delete 事件不设置 content', () => {
    renderHook(() => useFileWatcher(['/a.md'], true))
    const onChangeCb = mockOnChange.mock.calls[0][0]
    onChangeCb({ path: '/a.md', type: 'delete' }, null)
    expect(mockSetContent).not.toHaveBeenCalled()
  })

  it('openFiles 变化时重新注册监听', () => {
    const { rerender } = renderHook(({ files }) => useFileWatcher(files, true), {
      initialProps: { files: ['/a.md'] },
    })
    rerender({ files: ['/a.md', '/b.md'] })
    expect(mockWatchFile).toHaveBeenCalledWith('/b.md')
  })
})
