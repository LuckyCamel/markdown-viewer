import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEditorSession } from './useEditorSession'

const mockSaveFile = vi.fn()
const mockGetMtime = vi.fn()
const mockReadFile = vi.fn()
const mockSetContent = vi.fn()

vi.mock('../../lib/ipc', () => ({
  ipc: {
    files: {
      saveFile: (...args: unknown[]) => mockSaveFile(...args),
      getMtime: (...args: unknown[]) => mockGetMtime(...args),
      readFile: (...args: unknown[]) => mockReadFile(...args),
    },
  },
}))

vi.mock('./useEditorStore', () => ({
  useEditorStore: {
    getState: () => ({
      setContent: mockSetContent,
    }),
  },
}))

describe('useEditorSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockGetMtime.mockResolvedValue(1000)
    mockSaveFile.mockResolvedValue(2000)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should seed loaded content as saved and not auto-save', () => {
    const { result } = renderHook(({ path, content }) => useEditorSession(path, content), {
      initialProps: { path: '/a.md', content: 'file a' },
    })

    expect(result.current.saveStatus).toBe('saved')

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(mockSaveFile).not.toHaveBeenCalled()
  })

  it('should mark dirty and auto-save after edit', async () => {
    const { result, rerender } = renderHook(
      ({ path, content }) => useEditorSession(path, content),
      { initialProps: { path: '/a.md', content: 'file a' } },
    )

    rerender({ path: '/a.md', content: 'file a edited' })
    expect(result.current.saveStatus).toBe('dirty')

    await act(async () => {
      vi.advanceTimersByTime(1500)
    })

    expect(mockSaveFile).toHaveBeenCalledWith('/a.md', 'file a edited')
    expect(result.current.saveStatus).toBe('saved')
  })

  it('should reset session when path changes', async () => {
    const { result, rerender } = renderHook(
      ({ path, content }) => useEditorSession(path, content),
      { initialProps: { path: '/a.md', content: 'file a' } },
    )

    rerender({ path: '/a.md', content: 'edited a' })
    expect(result.current.saveStatus).toBe('dirty')

    rerender({ path: '/b.md', content: 'file b' })

    expect(result.current.saveStatus).toBe('saved')

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    expect(mockSaveFile).not.toHaveBeenCalled()
  })

  it('loadDisk should write store and stay saved', async () => {
    mockReadFile.mockResolvedValue({ path: '/a.md', content: 'from disk' })
    mockGetMtime.mockResolvedValue(5000)

    const { result, rerender } = renderHook(({ content }) => useEditorSession('/a.md', content), {
      initialProps: { content: 'local' },
    })

    await act(async () => {
      await result.current.loadDisk()
    })

    expect(mockSetContent).toHaveBeenCalledWith('/a.md', 'from disk')
    // 模拟 store 回写后 content props 更新
    rerender({ content: 'from disk' })
    expect(result.current.saveStatus).toBe('saved')
  })

  it('keepMine should force save', async () => {
    const { result } = renderHook(() => useEditorSession('/a.md', 'mine'))

    await act(async () => {
      result.current.keepMine()
    })

    expect(mockSaveFile).toHaveBeenCalledWith('/a.md', 'mine')
  })
})
