import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEditorPersistence } from './useEditorPersistence'

const mockSaveFile = vi.fn()
const mockGetMtime = vi.fn()
const mockReadFile = vi.fn()

vi.mock('../../lib/ipc', () => ({
  ipc: {
    files: {
      saveFile: (...args: unknown[]) => mockSaveFile(...args),
      getMtime: (...args: unknown[]) => mockGetMtime(...args),
      readFile: (...args: unknown[]) => mockReadFile(...args),
    },
  },
}))

describe('useEditorPersistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should reset state when reset is called without seed', () => {
    const { result } = renderHook(() => useEditorPersistence('/test.md', 'content'))

    act(() => {
      result.current.reset()
    })

    expect(result.current.status).toBe('saved')
    expect(result.current.lastSavedTime).toBeNull()
  })

  it('should seed content as saved without auto-save', () => {
    mockGetMtime.mockResolvedValue(1000)
    mockSaveFile.mockResolvedValue(2000)

    const { result } = renderHook(() => useEditorPersistence('/test.md', 'hello'))

    act(() => {
      result.current.reset({ content: 'hello', mtime: 1000 })
    })

    expect(result.current.status).toBe('saved')

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(mockSaveFile).not.toHaveBeenCalled()
  })

  it('should have dirty status when content differs from last saved', () => {
    const { result } = renderHook(() => useEditorPersistence('/test.md', 'initial'))

    expect(result.current.status).toBe('dirty')
  })

  it('should expose save and loadDiskVersion functions', () => {
    const { result } = renderHook(() => useEditorPersistence('/test.md', 'content'))

    expect(typeof result.current.save).toBe('function')
    expect(typeof result.current.loadDiskVersion).toBe('function')
    expect(typeof result.current.reset).toBe('function')
  })

  it('should detect mtime conflict when disk file was modified externally', async () => {
    mockGetMtime.mockResolvedValue(2000)
    mockSaveFile.mockResolvedValue(3000)

    const { result } = renderHook(() => useEditorPersistence('/test.md', 'content'))

    await act(async () => {
      await result.current.save()
    })

    mockGetMtime.mockResolvedValue(4000)

    await act(async () => {
      await result.current.save()
    })

    expect(result.current.status).toBe('conflict')
    expect(mockSaveFile).toHaveBeenCalledTimes(1)
  })

  it('should save successfully when no conflict', async () => {
    mockGetMtime.mockResolvedValue(1000)
    mockSaveFile.mockResolvedValue(2000)

    const { result } = renderHook(() => useEditorPersistence('/test.md', 'content'))

    await act(async () => {
      await result.current.save()
    })

    expect(mockGetMtime).toHaveBeenCalledWith('/test.md')
    expect(mockSaveFile).toHaveBeenCalledWith('/test.md', 'content')
    expect(result.current.status).toBe('saved')
    expect(result.current.lastSavedTime).not.toBeNull()
  })

  it('should set error status when save fails', async () => {
    mockGetMtime.mockResolvedValue(1000)
    mockSaveFile.mockRejectedValue(new Error('save failed'))

    const { result } = renderHook(() => useEditorPersistence('/test.md', 'content'))

    await act(async () => {
      await result.current.save()
    })

    expect(result.current.status).toBe('error')
  })

  it('should load disk version and update state', async () => {
    mockReadFile.mockResolvedValue({ path: '/test.md', content: 'disk content' })
    mockGetMtime.mockResolvedValue(3000)

    const { result } = renderHook(({ content }) => useEditorPersistence('/test.md', content), {
      initialProps: { content: 'disk content' },
    })

    let loadedContent: string | null = null
    await act(async () => {
      loadedContent = await result.current.loadDiskVersion()
    })

    expect(mockReadFile).toHaveBeenCalledWith('/test.md')
    expect(mockGetMtime).toHaveBeenCalledWith('/test.md')
    expect(loadedContent).toBe('disk content')
    expect(result.current.status).toBe('saved')
  })

  it('should not auto-save when content is empty', () => {
    renderHook(() => useEditorPersistence('/test.md', ''))

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(mockGetMtime).not.toHaveBeenCalled()
    expect(mockSaveFile).not.toHaveBeenCalled()
  })

  it('should not auto-save when filePath is null', () => {
    renderHook(() => useEditorPersistence(null, 'content'))

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(mockGetMtime).not.toHaveBeenCalled()
    expect(mockSaveFile).not.toHaveBeenCalled()
  })

  it('should not auto-save when content equals last saved content', () => {
    mockGetMtime.mockResolvedValue(1000)
    mockSaveFile.mockResolvedValue(2000)

    const { result } = renderHook(() => useEditorPersistence('/test.md', 'content'))

    act(() => {
      result.current.reset({ content: 'content', mtime: 1000 })
    })

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(mockSaveFile).not.toHaveBeenCalled()
  })

  it('should auto-save after 1.5s debounce when content changes', async () => {
    mockGetMtime.mockResolvedValue(1000)
    mockSaveFile.mockResolvedValue(2000)

    const { result, rerender } = renderHook(
      ({ content }) => useEditorPersistence('/test.md', content),
      { initialProps: { content: 'hello' } },
    )

    act(() => {
      result.current.reset({ content: 'hello', mtime: 1000 })
    })

    expect(mockSaveFile).not.toHaveBeenCalled()

    rerender({ content: 'hello world' })

    await act(async () => {
      vi.advanceTimersByTime(1499)
    })
    expect(mockSaveFile).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(1)
    })

    expect(mockGetMtime).toHaveBeenCalledWith('/test.md')
    expect(mockSaveFile).toHaveBeenCalledWith('/test.md', 'hello world')
    expect(result.current.status).toBe('saved')
  })
})
