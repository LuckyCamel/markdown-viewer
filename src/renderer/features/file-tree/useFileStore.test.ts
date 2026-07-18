import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useFileStore, clearDirectoryCache } from './useFileStore'
import type { FileEntry } from '../../../shared/types'

const mockListDirectory = vi.fn()
const mockCreateFile = vi.fn()
const mockCreateDirectory = vi.fn()
const mockRename = vi.fn()
const mockMoveToTrash = vi.fn()
const mockStoreGet = vi.fn()
const mockStoreSet = vi.fn()

vi.mock('../../lib/ipc', () => ({
  ipc: {
    files: {
      listDirectory: (...args: unknown[]) => mockListDirectory(...args),
      createFile: (...args: unknown[]) => mockCreateFile(...args),
      createDirectory: (...args: unknown[]) => mockCreateDirectory(...args),
      rename: (...args: unknown[]) => mockRename(...args),
      moveToTrash: (...args: unknown[]) => mockMoveToTrash(...args),
    },
    store: {
      get: (...args: unknown[]) => mockStoreGet(...args),
      set: (...args: unknown[]) => mockStoreSet(...args),
    },
  },
}))

function entry(name: string, isDir = false, parent = '/root'): FileEntry {
  return {
    name,
    path: `${parent}/${name}`,
    isDirectory: isDir,
    isHidden: name.startsWith('.'),
  }
}

describe('useFileStore', () => {
  beforeEach(() => {
    clearDirectoryCache()
    useFileStore.setState({
      entries: {},
      expanded: {},
      loading: {},
      rootPath: null,
      rootPaths: [],
      sortMode: 'name',
      sortDirection: 'asc',
    })
    vi.clearAllMocks()
    mockStoreGet.mockResolvedValue(undefined)
    mockStoreSet.mockResolvedValue(undefined)
  })

  describe('setRoot', () => {
    it('设置 rootPath 并自动 loadChildren', async () => {
      mockListDirectory.mockResolvedValue([entry('a.md'), entry('sub', true)])
      useFileStore.getState().setRoot('/root')
      expect(useFileStore.getState().rootPath).toBe('/root')
      await vi.waitFor(() => {
        expect(useFileStore.getState().entries['/root']).toHaveLength(2)
      })
    })
  })

  describe('loadChildren', () => {
    it('加载条目并写入 entries', async () => {
      mockListDirectory.mockResolvedValue([entry('readme.md')])
      await useFileStore.getState().loadChildren('/root')
      expect(useFileStore.getState().entries['/root']).toHaveLength(1)
    })

    it('加载完成后清除 loading 标记', async () => {
      mockListDirectory.mockResolvedValue([])
      await useFileStore.getState().loadChildren('/root')
      expect(useFileStore.getState().loading['/root']).toBeUndefined()
    })

    it('正在加载时重复调用不触发第二次 fetch', async () => {
      let resolve!: (v: FileEntry[]) => void
      mockListDirectory.mockReturnValue(
        new Promise((r) => {
          resolve = r
        }),
      )

      useFileStore.getState().loadChildren('/root')
      useFileStore.getState().loadChildren('/root')
      resolve([])

      await vi.waitFor(() => {
        expect(useFileStore.getState().loading['/root']).toBeUndefined()
      })
      expect(mockListDirectory).toHaveBeenCalledTimes(1)
    })
  })

  describe('toggleExpand', () => {
    it('未展开 → loadChildren → 标记 expanded', async () => {
      mockListDirectory.mockResolvedValue([entry('a.md')])
      await useFileStore.getState().toggleExpand('/sub')
      expect(useFileStore.getState().expanded['/sub']).toBe(true)
    })

    it('已展开 → 移除 expanded 标记，不加载', async () => {
      useFileStore.setState({ expanded: { '/sub': true } })
      await useFileStore.getState().toggleExpand('/sub')
      expect(useFileStore.getState().expanded['/sub']).toBeUndefined()
      expect(mockListDirectory).not.toHaveBeenCalled()
    })
  })

  describe('createFile', () => {
    it('新建文件成功后添加到父目录 entries', async () => {
      mockListDirectory.mockResolvedValue([entry('a.md')])
      await useFileStore.getState().loadChildren('/root')
      const newFile = entry('new.md')
      mockCreateFile.mockResolvedValue(newFile)

      await useFileStore.getState().createFile('/root', 'new.md')

      expect(mockCreateFile).toHaveBeenCalledWith('/root', 'new.md')
      const entries = useFileStore.getState().entries['/root']
      expect(entries).toHaveLength(2)
      expect(entries.find((e) => e.name === 'new.md')).toBeDefined()
    })
  })

  describe('createDirectory', () => {
    it('新建文件夹成功后添加到父目录 entries', async () => {
      mockListDirectory.mockResolvedValue([entry('a.md')])
      await useFileStore.getState().loadChildren('/root')
      const newDir = entry('newdir', true)
      mockCreateDirectory.mockResolvedValue(newDir)

      await useFileStore.getState().createDirectory('/root', 'newdir')

      expect(mockCreateDirectory).toHaveBeenCalledWith('/root', 'newdir')
      const entries = useFileStore.getState().entries['/root']
      expect(entries).toHaveLength(2)
      expect(entries.find((e) => e.name === 'newdir' && e.isDirectory)).toBeDefined()
    })
  })

  describe('renameEntry', () => {
    it('重命名文件后更新 entries 中的路径和名称', async () => {
      mockListDirectory.mockResolvedValue([entry('old.md')])
      await useFileStore.getState().loadChildren('/root')
      const renamed = entry('new.md')
      mockRename.mockResolvedValue(renamed)

      await useFileStore.getState().renameEntry('/root/old.md', 'new.md')

      expect(mockRename).toHaveBeenCalledWith('/root/old.md', 'new.md')
      const entries = useFileStore.getState().entries['/root']
      expect(entries.find((e) => e.name === 'old.md')).toBeUndefined()
      expect(entries.find((e) => e.name === 'new.md')).toBeDefined()
    })
  })

  describe('deleteEntry', () => {
    it('删除文件后从 entries 中移除', async () => {
      mockListDirectory.mockResolvedValue([entry('a.md'), entry('b.md')])
      await useFileStore.getState().loadChildren('/root')
      mockMoveToTrash.mockResolvedValue(undefined)

      await useFileStore.getState().deleteEntry('/root/a.md')

      expect(mockMoveToTrash).toHaveBeenCalledWith('/root/a.md')
      const entries = useFileStore.getState().entries['/root']
      expect(entries).toHaveLength(1)
      expect(entries.find((e) => e.name === 'a.md')).toBeUndefined()
    })
  })

  describe('refreshDirectory', () => {
    it('刷新目录重新加载子条目', async () => {
      mockListDirectory.mockResolvedValue([entry('a.md')])
      await useFileStore.getState().loadChildren('/root')
      expect(useFileStore.getState().entries['/root']).toHaveLength(1)

      mockListDirectory.mockResolvedValue([entry('a.md'), entry('b.md'), entry('c.md')])
      await useFileStore.getState().refreshDirectory('/root')

      expect(mockListDirectory).toHaveBeenCalledTimes(2)
      expect(useFileStore.getState().entries['/root']).toHaveLength(3)
    })

    it('刷新时保持目录展开状态', async () => {
      mockListDirectory.mockResolvedValue([])
      useFileStore.setState({ expanded: { '/root': true } })
      await useFileStore.getState().refreshDirectory('/root')
      expect(useFileStore.getState().expanded['/root']).toBe(true)
    })
  })

  describe('sortMode', () => {
    it('默认排序方式为 name 升序', () => {
      expect(useFileStore.getState().sortMode).toBe('name')
      expect(useFileStore.getState().sortDirection).toBe('asc')
    })

    it('setSort 应更新排序方式', () => {
      useFileStore.getState().setSort('modified', 'desc')
      expect(useFileStore.getState().sortMode).toBe('modified')
      expect(useFileStore.getState().sortDirection).toBe('desc')
    })

    it('加载目录后应按当前排序方式返回条目', async () => {
      const entries = [entry('b.md'), entry('a.md'), entry('sub', true), entry('c.md')]
      mockListDirectory.mockResolvedValue(entries)
      useFileStore.getState().setSort('name', 'asc')

      await useFileStore.getState().loadChildren('/root')
      const result = useFileStore.getState().getSortedEntries('/root')

      expect(result.map((e) => e.name)).toEqual(['sub', 'a.md', 'b.md', 'c.md'])
    })

    it('切换排序方式后 getSortedEntries 返回新顺序', async () => {
      const entries = [
        { ...entry('old.md'), modified: 1000 },
        { ...entry('new.md'), modified: 3000 },
        { ...entry('mid.md'), modified: 2000 },
      ]
      mockListDirectory.mockResolvedValue(entries)
      await useFileStore.getState().loadChildren('/root')

      useFileStore.getState().setSort('modified', 'desc')
      const result = useFileStore.getState().getSortedEntries('/root')
      expect(result.map((e) => e.name)).toEqual(['new.md', 'mid.md', 'old.md'])
    })
  })

  describe('多根目录', () => {
    it('默认 rootPaths 为空数组', () => {
      expect(useFileStore.getState().rootPaths).toEqual([])
    })

    it('setRoot 会替换 rootPaths 为单元素', async () => {
      mockListDirectory.mockResolvedValue([entry('a.md')])
      useFileStore.getState().setRoot('/workspace1')
      expect(useFileStore.getState().rootPaths).toEqual(['/workspace1'])
      expect(useFileStore.getState().rootPath).toBe('/workspace1')
    })

    it('addRoot 追加根目录', async () => {
      mockListDirectory.mockResolvedValue([entry('a.md')])
      useFileStore.getState().setRoot('/workspace1')
      mockListDirectory.mockResolvedValue([entry('b.md')])
      await useFileStore.getState().addRoot('/workspace2')
      expect(useFileStore.getState().rootPaths).toEqual(['/workspace1', '/workspace2'])
    })

    it('addRoot 已存在的路径不重复添加', async () => {
      mockListDirectory.mockResolvedValue([entry('a.md')])
      useFileStore.getState().setRoot('/workspace1')
      await useFileStore.getState().addRoot('/workspace1')
      expect(useFileStore.getState().rootPaths).toEqual(['/workspace1'])
    })

    it('removeRoot 移除指定根目录', async () => {
      mockListDirectory.mockResolvedValue([])
      useFileStore.getState().setRoot('/workspace1')
      await useFileStore.getState().addRoot('/workspace2')
      useFileStore.getState().removeRoot('/workspace1')
      expect(useFileStore.getState().rootPaths).toEqual(['/workspace2'])
      expect(useFileStore.getState().rootPath).toBe('/workspace2')
    })

    it('removeRoot 最后一个根目录时 rootPath 为 null', () => {
      mockListDirectory.mockResolvedValue([])
      useFileStore.getState().setRoot('/workspace1')
      useFileStore.getState().removeRoot('/workspace1')
      expect(useFileStore.getState().rootPaths).toEqual([])
      expect(useFileStore.getState().rootPath).toBeNull()
    })

    it('isRoot 判断路径是否为根目录', () => {
      mockListDirectory.mockResolvedValue([])
      useFileStore.getState().setRoot('/workspace1')
      expect(useFileStore.getState().isRoot('/workspace1')).toBe(true)
      expect(useFileStore.getState().isRoot('/other')).toBe(false)
    })
  })

  /**
   * 目录缓存行为测试：验证缓存命中时不触发 IPC，以及 refreshDirectory 清缓存后重新加载
   */
  describe('directory cache', () => {
    it('命中缓存时不触发 IPC 调用', async () => {
      mockListDirectory.mockResolvedValue([entry('a.md')])
      await useFileStore.getState().loadChildren('/cached')
      expect(mockListDirectory).toHaveBeenCalledTimes(1)

      useFileStore.setState({ entries: {} })
      await useFileStore.getState().loadChildren('/cached')
      expect(mockListDirectory).toHaveBeenCalledTimes(1)
      expect(useFileStore.getState().entries['/cached']).toHaveLength(1)
    })

    it('refreshDirectory 清除缓存后重新加载', async () => {
      mockListDirectory.mockResolvedValue([entry('a.md')])
      await useFileStore.getState().loadChildren('/refresh-test')
      expect(mockListDirectory).toHaveBeenCalledTimes(1)

      mockListDirectory.mockResolvedValue([entry('a.md'), entry('b.md')])
      await useFileStore.getState().refreshDirectory('/refresh-test')
      expect(mockListDirectory).toHaveBeenCalledTimes(2)
      expect(useFileStore.getState().entries['/refresh-test']).toHaveLength(2)
    })

    it('refreshDirectory 同时清除子目录缓存', async () => {
      mockListDirectory.mockResolvedValue([entry('sub', true)])
      await useFileStore.getState().loadChildren('/root')
      mockListDirectory.mockResolvedValue([entry('file.md')])
      await useFileStore.getState().loadChildren('/root/sub')
      expect(mockListDirectory).toHaveBeenCalledTimes(2)

      mockListDirectory.mockResolvedValue([entry('sub', true)])
      await useFileStore.getState().refreshDirectory('/root')
      expect(mockListDirectory).toHaveBeenCalledTimes(3)
      expect(useFileStore.getState().entries['/root/sub']).toBeUndefined()
    })

    it('createFile 后父目录缓存失效', async () => {
      mockListDirectory.mockResolvedValue([entry('a.md')])
      await useFileStore.getState().loadChildren('/root')
      expect(mockListDirectory).toHaveBeenCalledTimes(1)

      const newFile = entry('new.md')
      mockCreateFile.mockResolvedValue(newFile)
      await useFileStore.getState().createFile('/root', 'new.md')

      useFileStore.setState({ entries: {} })

      await useFileStore.getState().loadChildren('/root')
      expect(mockListDirectory).toHaveBeenCalledTimes(2)
    })

    it('renameEntry 后父目录缓存失效', async () => {
      mockListDirectory.mockResolvedValue([entry('old.md')])
      await useFileStore.getState().loadChildren('/root')
      expect(mockListDirectory).toHaveBeenCalledTimes(1)

      const renamed = entry('new.md')
      mockRename.mockResolvedValue(renamed)
      await useFileStore.getState().renameEntry('/root/old.md', 'new.md')

      useFileStore.setState({ entries: {} })

      await useFileStore.getState().loadChildren('/root')
      expect(mockListDirectory).toHaveBeenCalledTimes(2)
    })

    it('deleteEntry 后父目录缓存失效', async () => {
      mockListDirectory.mockResolvedValue([entry('a.md')])
      await useFileStore.getState().loadChildren('/root')
      expect(mockListDirectory).toHaveBeenCalledTimes(1)

      mockMoveToTrash.mockResolvedValue(undefined)
      await useFileStore.getState().deleteEntry('/root/a.md')

      useFileStore.setState({ entries: {} })

      await useFileStore.getState().loadChildren('/root')
      expect(mockListDirectory).toHaveBeenCalledTimes(2)
    })

    it('多级目录缓存失效正确传播', async () => {
      mockListDirectory.mockResolvedValue([entry('sub', true)])
      await useFileStore.getState().loadChildren('/root')
      mockListDirectory.mockResolvedValue([entry('deep', true)])
      await useFileStore.getState().loadChildren('/root/sub')
      mockListDirectory.mockResolvedValue([entry('file.md')])
      await useFileStore.getState().loadChildren('/root/sub/deep')
      expect(mockListDirectory).toHaveBeenCalledTimes(3)

      const newFile = entry('file.md')
      mockCreateFile.mockResolvedValue(newFile)
      await useFileStore.getState().createFile('/root/sub/deep', 'file.md')

      useFileStore.setState({ entries: {} })

      await useFileStore.getState().loadChildren('/root')
      await useFileStore.getState().loadChildren('/root/sub')
      await useFileStore.getState().loadChildren('/root/sub/deep')
      expect(mockListDirectory).toHaveBeenCalledTimes(6)
    })
  })
})
