import { describe, it, expect, beforeEach } from 'vitest'
import { useTabStore } from './useTabStore'

describe('useTabStore', () => {
  beforeEach(() => {
    useTabStore.setState({ openFiles: [], activeFile: null, dirtyFiles: new Set() })
  })

  describe('openFile', () => {
    it('追加新文件并设为 activeFile', () => {
      useTabStore.getState().openFile('/a.md')
      const s = useTabStore.getState()
      expect(s.openFiles).toEqual(['/a.md'])
      expect(s.activeFile).toBe('/a.md')
    })

    it('重复文件只更新 activeFile 不追加', () => {
      useTabStore.getState().openFile('/a.md')
      useTabStore.getState().openFile('/b.md')
      useTabStore.getState().openFile('/a.md')
      const s = useTabStore.getState()
      expect(s.openFiles).toEqual(['/a.md', '/b.md'])
      expect(s.activeFile).toBe('/a.md')
    })
  })

  describe('closeFile', () => {
    it('关闭激活文件 → 激活相邻文件', () => {
      useTabStore.setState({ openFiles: ['/a.md', '/b.md', '/c.md'], activeFile: '/b.md' })
      useTabStore.getState().closeFile('/b.md')
      const s = useTabStore.getState()
      expect(s.openFiles).toEqual(['/a.md', '/c.md'])
      expect(s.activeFile).toBe('/c.md')
    })

    it('关闭最后一个文件 → activeFile 为 null', () => {
      useTabStore.setState({ openFiles: ['/a.md'], activeFile: '/a.md' })
      useTabStore.getState().closeFile('/a.md')
      const s = useTabStore.getState()
      expect(s.openFiles).toEqual([])
      expect(s.activeFile).toBeNull()
    })

    it('关闭非激活文件 → activeFile 不变', () => {
      useTabStore.setState({ openFiles: ['/a.md', '/b.md'], activeFile: '/a.md' })
      useTabStore.getState().closeFile('/b.md')
      expect(useTabStore.getState().activeFile).toBe('/a.md')
    })

    it('关闭文件后清除该文件的 dirty 标记', () => {
      useTabStore.setState({
        openFiles: ['/a.md', '/b.md'],
        activeFile: '/a.md',
        dirtyFiles: new Set(['/a.md', '/b.md']),
      })
      useTabStore.getState().closeFile('/b.md')
      expect(useTabStore.getState().isDirty('/b.md')).toBe(false)
      expect(useTabStore.getState().isDirty('/a.md')).toBe(true)
    })
  })

  describe('closeOthers', () => {
    it('只保留指定文件', () => {
      useTabStore.setState({
        openFiles: ['/a.md', '/b.md', '/c.md'],
        activeFile: '/a.md',
      })
      useTabStore.getState().closeOthers('/b.md')
      const s = useTabStore.getState()
      expect(s.openFiles).toEqual(['/b.md'])
      expect(s.activeFile).toBe('/b.md')
    })
  })

  describe('closeAll', () => {
    it('清空 openFiles 和 activeFile', () => {
      useTabStore.setState({ openFiles: ['/a.md'], activeFile: '/a.md' })
      useTabStore.getState().closeAll()
      const s = useTabStore.getState()
      expect(s.openFiles).toEqual([])
      expect(s.activeFile).toBeNull()
    })
  })

  describe('dirtyFiles', () => {
    it('markDirty 后 isDirty 返回 true', () => {
      useTabStore.getState().markDirty('/a.md')
      expect(useTabStore.getState().isDirty('/a.md')).toBe(true)
    })

    it('clearDirty 后 isDirty 返回 false', () => {
      useTabStore.setState({ dirtyFiles: new Set(['/a.md', '/b.md']) })
      expect(useTabStore.getState().isDirty('/a.md')).toBe(true)
      useTabStore.getState().clearDirty('/a.md')
      expect(useTabStore.getState().isDirty('/a.md')).toBe(false)
      expect(useTabStore.getState().isDirty('/b.md')).toBe(true)
    })

    it('markDirty 不影响其他标记', () => {
      useTabStore.setState({ dirtyFiles: new Set(['/a.md']) })
      useTabStore.getState().markDirty('/b.md')
      expect(useTabStore.getState().isDirty('/a.md')).toBe(true)
      expect(useTabStore.getState().isDirty('/b.md')).toBe(true)
    })
  })

  describe('setActive', () => {
    it('切换激活文件', () => {
      useTabStore.setState({ openFiles: ['/a.md', '/b.md'], activeFile: '/a.md' })
      useTabStore.getState().setActive('/b.md')
      expect(useTabStore.getState().activeFile).toBe('/b.md')
    })
  })
})
