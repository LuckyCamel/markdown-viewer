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

describe('useFileWatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOnChange.mockReturnValue(vi.fn())
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

  it('change 事件且有 content 时调用 onExternalChange', () => {
    const onExternalChange = vi.fn()
    renderHook(() => useFileWatcher(['/a.md'], true, { onExternalChange }))
    const onChangeCb = mockOnChange.mock.calls[0][0]
    onChangeCb({ path: '/a.md', type: 'change' }, 'new content')
    expect(onExternalChange).toHaveBeenCalledWith('/a.md', 'new content', 0)
  })

  it('delete 事件不调用 onExternalChange', () => {
    const onExternalChange = vi.fn()
    renderHook(() => useFileWatcher(['/a.md'], true, { onExternalChange }))
    const onChangeCb = mockOnChange.mock.calls[0][0]
    onChangeCb({ path: '/a.md', type: 'delete' }, null)
    expect(onExternalChange).not.toHaveBeenCalled()
  })

  it('change 事件但 content 为 null 时不调用 onExternalChange', () => {
    const onExternalChange = vi.fn()
    renderHook(() => useFileWatcher(['/a.md'], true, { onExternalChange }))
    const onChangeCb = mockOnChange.mock.calls[0][0]
    onChangeCb({ path: '/a.md', type: 'change' }, null)
    expect(onExternalChange).not.toHaveBeenCalled()
  })

  it('openFiles 变化时重新注册监听', () => {
    const { rerender } = renderHook(({ files }) => useFileWatcher(files, true), {
      initialProps: { files: ['/a.md'] },
    })
    rerender({ files: ['/a.md', '/b.md'] })
    expect(mockWatchFile).toHaveBeenCalledWith('/b.md')
  })
})
