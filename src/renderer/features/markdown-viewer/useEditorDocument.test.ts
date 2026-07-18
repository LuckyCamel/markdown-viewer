import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEditorDocument } from './useEditorDocument'
import { useEditorStore } from './useEditorStore'

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

describe('useEditorDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    useEditorStore.setState({ contents: {}, loading: {}, errors: {} })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const seedAndSave = async (
    result: { current: ReturnType<typeof useEditorDocument> },
    content: string,
  ) => {
    act(() => {
      result.current.setContent(content)
    })
    await act(async () => {
      await result.current.forceSave()
    })
  }

  it('初始状态为 saved，content 为空', () => {
    const { result } = renderHook(() => useEditorDocument('/test.md'))

    expect(result.current.saveStatus).toBe('saved')
    expect(result.current.content).toBe('')
    expect(result.current.lastSavedTime).toBeNull()
  })

  it('文件加载后内容变化触发编辑，状态变为 dirty', async () => {
    mockGetMtime.mockResolvedValue(1000)
    mockSaveFile.mockResolvedValue(2000)

    const { result } = renderHook(() => useEditorDocument('/test.md'))

    await seedAndSave(result, 'initial content')

    expect(result.current.saveStatus).toBe('saved')
    expect(result.current.content).toBe('initial content')

    act(() => {
      result.current.setContent('edited content')
    })

    expect(result.current.content).toBe('edited content')
    expect(result.current.saveStatus).toBe('dirty')
  })

  it('1500ms debounce 后自动保存', async () => {
    mockGetMtime.mockResolvedValue(1000)
    mockSaveFile.mockResolvedValue(2000)

    const { result } = renderHook(() => useEditorDocument('/test.md'))

    await seedAndSave(result, 'initial')

    expect(mockSaveFile).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.setContent('hello world')
    })

    expect(result.current.saveStatus).toBe('dirty')

    await act(async () => {
      vi.advanceTimersByTime(1499)
    })
    expect(mockSaveFile).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(1)
    })

    expect(mockGetMtime).toHaveBeenCalledWith('/test.md')
    expect(mockSaveFile).toHaveBeenCalledWith('/test.md', 'hello world')
    expect(result.current.saveStatus).toBe('saved')
    expect(result.current.lastSavedTime).not.toBeNull()
  })

  it('手动保存 forceSave 立即执行', async () => {
    mockGetMtime.mockResolvedValue(1000)
    mockSaveFile.mockResolvedValue(2000)

    const { result } = renderHook(() => useEditorDocument('/test.md'))

    await seedAndSave(result, 'initial')

    act(() => {
      result.current.setContent('hello')
    })

    expect(result.current.saveStatus).toBe('dirty')

    await act(async () => {
      await result.current.forceSave()
    })

    expect(mockSaveFile).toHaveBeenCalledWith('/test.md', 'hello')
    expect(result.current.saveStatus).toBe('saved')
  })

  it('保存时检测到 mtime 冲突应进入 conflict 状态', async () => {
    mockGetMtime.mockResolvedValue(1000)
    mockSaveFile.mockResolvedValue(2000)
    mockReadFile.mockResolvedValue({ path: '/test.md', content: 'disk version' })

    const { result } = renderHook(() => useEditorDocument('/test.md'))

    act(() => {
      result.current.setContent('local version')
    })

    await act(async () => {
      await result.current.forceSave()
    })

    expect(result.current.saveStatus).toBe('saved')

    mockGetMtime.mockResolvedValue(3000)

    await act(async () => {
      await result.current.forceSave()
    })

    expect(result.current.saveStatus).toBe('conflict')
    expect(mockSaveFile).toHaveBeenCalledTimes(1)
  })

  it('conflict 状态下 loadDisk 加载磁盘版本并清除冲突', async () => {
    mockGetMtime.mockResolvedValue(1000)
    mockSaveFile.mockResolvedValue(2000)
    mockReadFile.mockResolvedValue({ path: '/test.md', content: 'disk version' })

    const { result } = renderHook(() => useEditorDocument('/test.md'))

    act(() => {
      result.current.setContent('local version')
    })

    await act(async () => {
      await result.current.forceSave()
    })

    mockGetMtime.mockResolvedValue(3000)
    mockReadFile.mockResolvedValue({ path: '/test.md', content: 'new disk content' })

    await act(async () => {
      await result.current.forceSave()
    })

    expect(result.current.saveStatus).toBe('conflict')

    mockGetMtime.mockResolvedValue(3000)
    mockReadFile.mockResolvedValue({ path: '/test.md', content: 'new disk content' })

    await act(async () => {
      await result.current.loadDisk()
    })

    expect(result.current.saveStatus).toBe('saved')
    expect(result.current.content).toBe('new disk content')
  })

  it('conflict 状态下 keepMine 强制保存并清除冲突', async () => {
    mockGetMtime.mockResolvedValue(1000)
    mockSaveFile.mockResolvedValue(2000)
    mockReadFile.mockResolvedValue({ path: '/test.md', content: 'disk version' })

    const { result } = renderHook(() => useEditorDocument('/test.md'))

    act(() => {
      result.current.setContent('local version')
    })

    await act(async () => {
      await result.current.forceSave()
    })

    expect(result.current.saveStatus).toBe('saved')
    expect(mockSaveFile).toHaveBeenCalledTimes(1)

    mockGetMtime.mockResolvedValue(3000)

    await act(async () => {
      await result.current.forceSave()
    })

    expect(result.current.saveStatus).toBe('conflict')

    mockGetMtime.mockResolvedValue(3000)
    mockSaveFile.mockResolvedValue(4000)

    await act(async () => {
      await result.current.keepMine()
    })

    expect(mockSaveFile).toHaveBeenCalledTimes(2)
    expect(result.current.saveStatus).toBe('saved')
  })

  it('handleExternalChange: saved 状态下直接更新内容', async () => {
    mockGetMtime.mockResolvedValue(1000)
    mockSaveFile.mockResolvedValue(2000)

    const { result } = renderHook(() => useEditorDocument('/test.md'))

    await seedAndSave(result, 'initial content')

    expect(result.current.saveStatus).toBe('saved')

    act(() => {
      result.current.handleExternalChange('external content', 2000)
    })

    expect(result.current.saveStatus).toBe('saved')
    expect(result.current.content).toBe('external content')
  })

  it('handleExternalChange: saved 状态下内容相同则忽略', async () => {
    mockGetMtime.mockResolvedValue(1000)
    mockSaveFile.mockResolvedValue(2000)

    const { result } = renderHook(() => useEditorDocument('/test.md'))

    await seedAndSave(result, 'same content')

    expect(result.current.saveStatus).toBe('saved')

    act(() => {
      result.current.handleExternalChange('same content', 2000)
    })

    expect(result.current.saveStatus).toBe('saved')
  })

  it('handleExternalChange: dirty 状态下进入 conflict', async () => {
    mockGetMtime.mockResolvedValue(1000)
    mockSaveFile.mockResolvedValue(2000)

    const { result } = renderHook(() => useEditorDocument('/test.md'))

    await seedAndSave(result, 'initial')

    act(() => {
      result.current.setContent('local edit')
    })

    expect(result.current.saveStatus).toBe('dirty')

    act(() => {
      result.current.handleExternalChange('external change', 2000)
    })

    expect(result.current.saveStatus).toBe('conflict')
    expect(result.current.content).toBe('local edit')
  })

  it('handleExternalChange: conflict 状态下更新磁盘快照，保持 conflict', async () => {
    mockGetMtime.mockResolvedValue(1000)
    mockSaveFile.mockResolvedValue(2000)

    const { result } = renderHook(() => useEditorDocument('/test.md'))

    await seedAndSave(result, 'initial')

    act(() => {
      result.current.setContent('local edit')
    })

    act(() => {
      result.current.handleExternalChange('external v1', 2000)
    })

    expect(result.current.saveStatus).toBe('conflict')

    act(() => {
      result.current.handleExternalChange('external v2', 3000)
    })

    expect(result.current.saveStatus).toBe('conflict')
  })

  it('路径切换时重置状态', async () => {
    mockGetMtime.mockResolvedValue(1000)
    mockSaveFile.mockResolvedValue(2000)

    const { result, rerender } = renderHook(({ filePath }) => useEditorDocument(filePath), {
      initialProps: { filePath: '/a.md' as string | null },
    })

    act(() => {
      result.current.setContent('content a')
    })

    await act(async () => {
      await result.current.forceSave()
    })

    expect(result.current.saveStatus).toBe('saved')
    expect(result.current.content).toBe('content a')

    rerender({ filePath: '/b.md' })

    expect(result.current.saveStatus).toBe('saved')
    expect(result.current.content).toBe('')
    expect(result.current.lastSavedTime).toBeNull()
  })

  it('保存失败时状态变为 error', async () => {
    mockGetMtime.mockResolvedValue(1000)
    mockSaveFile.mockRejectedValue(new Error('save failed'))

    const { result } = renderHook(() => useEditorDocument('/test.md'))

    act(() => {
      result.current.setContent('hello')
    })

    await act(async () => {
      await result.current.forceSave()
    })

    expect(result.current.saveStatus).toBe('error')
  })

  it('暴露完整的 API 接口', () => {
    const { result } = renderHook(() => useEditorDocument('/test.md'))

    expect(typeof result.current.content).toBe('string')
    expect(typeof result.current.saveStatus).toBe('string')
    expect(
      result.current.lastSavedTime === null || typeof result.current.lastSavedTime === 'number',
    ).toBe(true)
    expect(typeof result.current.setContent).toBe('function')
    expect(typeof result.current.forceSave).toBe('function')
    expect(typeof result.current.loadDisk).toBe('function')
    expect(typeof result.current.keepMine).toBe('function')
    expect(typeof result.current.handleExternalChange).toBe('function')
  })
})
