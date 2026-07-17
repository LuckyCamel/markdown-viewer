import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useTabStore } from './useTabStore'

describe('useTabStore viewModes', () => {
  beforeEach(() => {
    act(() => {
      useTabStore.getState().closeAll()
    })
  })

  it('openFile 时默认 viewMode 为 read', () => {
    act(() => {
      useTabStore.getState().openFile('/test/file.md')
    })
    expect(useTabStore.getState().getViewMode('/test/file.md')).toBe('read')
  })

  it('setViewMode 设置指定文件的视图模式', () => {
    act(() => {
      useTabStore.getState().openFile('/test/file.md')
      useTabStore.getState().setViewMode('/test/file.md', 'edit')
    })
    expect(useTabStore.getState().getViewMode('/test/file.md')).toBe('edit')
  })

  it('toggleViewMode 在 read 和 edit 之间切换', () => {
    act(() => {
      useTabStore.getState().openFile('/test/file.md')
    })
    expect(useTabStore.getState().getViewMode('/test/file.md')).toBe('read')

    act(() => {
      useTabStore.getState().toggleViewMode('/test/file.md')
    })
    expect(useTabStore.getState().getViewMode('/test/file.md')).toBe('edit')

    act(() => {
      useTabStore.getState().toggleViewMode('/test/file.md')
    })
    expect(useTabStore.getState().getViewMode('/test/file.md')).toBe('read')
  })

  it('不同文件的 viewMode 独立', () => {
    act(() => {
      useTabStore.getState().openFile('/test/a.md')
      useTabStore.getState().openFile('/test/b.md')
      useTabStore.getState().setViewMode('/test/a.md', 'edit')
    })
    expect(useTabStore.getState().getViewMode('/test/a.md')).toBe('edit')
    expect(useTabStore.getState().getViewMode('/test/b.md')).toBe('read')
  })

  it('closeFile 时清理 viewMode', () => {
    act(() => {
      useTabStore.getState().openFile('/test/file.md')
      useTabStore.getState().setViewMode('/test/file.md', 'edit')
      useTabStore.getState().closeFile('/test/file.md')
    })
    expect(useTabStore.getState().viewModes['/test/file.md']).toBeUndefined()
  })

  it('renameFile 时迁移 viewMode', () => {
    act(() => {
      useTabStore.getState().openFile('/test/old.md')
      useTabStore.getState().setViewMode('/test/old.md', 'edit')
      useTabStore.getState().renameFile('/test/old.md', '/test/new.md')
    })
    expect(useTabStore.getState().viewModes['/test/old.md']).toBeUndefined()
    expect(useTabStore.getState().getViewMode('/test/new.md')).toBe('edit')
  })

  it('closeAll 时清空所有 viewModes', () => {
    act(() => {
      useTabStore.getState().openFile('/test/a.md')
      useTabStore.getState().openFile('/test/b.md')
      useTabStore.getState().setViewMode('/test/a.md', 'edit')
      useTabStore.getState().closeAll()
    })
    expect(Object.keys(useTabStore.getState().viewModes).length).toBe(0)
  })

  it('closeOthers 时只保留目标文件的 viewMode', () => {
    act(() => {
      useTabStore.getState().openFile('/test/a.md')
      useTabStore.getState().openFile('/test/b.md')
      useTabStore.getState().openFile('/test/c.md')
      useTabStore.getState().setViewMode('/test/a.md', 'edit')
      useTabStore.getState().setViewMode('/test/b.md', 'edit')
      useTabStore.getState().closeOthers('/test/a.md')
    })
    expect(useTabStore.getState().getViewMode('/test/a.md')).toBe('edit')
    expect(useTabStore.getState().viewModes['/test/b.md']).toBeUndefined()
    expect(useTabStore.getState().viewModes['/test/c.md']).toBeUndefined()
  })

  it('getViewMode 对不存在的文件返回 read', () => {
    expect(useTabStore.getState().getViewMode('/nonexistent.md')).toBe('read')
  })
})
