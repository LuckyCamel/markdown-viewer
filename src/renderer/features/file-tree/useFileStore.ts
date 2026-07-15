import { create } from 'zustand'
import type { FileEntry } from '../../../shared/types'
import { ipc } from '../../lib/ipc'
import { logError } from '../../logger'
import { sortFileEntries, type SortMode, type SortDirection } from '../../../shared/fileSort'

/**
 * 获取父目录路径
 */
function getParentDir(path: string): string {
  const parts = path.split(/[\\/]/)
  parts.pop()
  return parts.join('/') || '/'
}

interface FileTreeState {
  entries: Record<string, FileEntry[]>
  expanded: Record<string, boolean>
  loading: Record<string, boolean>
  rootPath: string | null
  rootPaths: string[]
  sortMode: SortMode
  sortDirection: SortDirection
  setRoot: (path: string) => void
  addRoot: (path: string) => Promise<void>
  removeRoot: (path: string) => void
  isRoot: (path: string) => boolean
  toggleExpand: (dirPath: string) => Promise<void>
  loadChildren: (dirPath: string) => Promise<void>
  createFile: (dirPath: string, name: string) => Promise<void>
  createDirectory: (dirPath: string, name: string) => Promise<void>
  renameEntry: (oldPath: string, newName: string) => Promise<void>
  deleteEntry: (path: string) => Promise<void>
  refreshDirectory: (dirPath: string) => Promise<void>
  setSort: (mode: SortMode, direction?: SortDirection) => void
  getSortedEntries: (dirPath: string) => FileEntry[]
}

export const useFileStore = create<FileTreeState>((set, get) => ({
  entries: {},
  expanded: {},
  loading: {},
  rootPath: null,
  rootPaths: [],
  sortMode: 'name',
  sortDirection: 'asc',
  setRoot: (path) => {
    set({ rootPath: path, rootPaths: [path] })
    get().loadChildren(path)
  },
  toggleExpand: async (dirPath) => {
    const { expanded } = get()
    if (expanded[dirPath]) {
      const next = { ...expanded }
      delete next[dirPath]
      set({ expanded: next })
    } else {
      await get().loadChildren(dirPath)
      const next = { ...get().expanded, [dirPath]: true }
      set({ expanded: next })
    }
  },
  loadChildren: async (dirPath) => {
    const { loading } = get()
    if (loading[dirPath]) return
    set((s) => ({ loading: { ...s.loading, [dirPath]: true } }))
    try {
      const entries = await ipc.files.listDirectory(dirPath)
      set((s) => {
        const next = { ...s.loading }
        delete next[dirPath]
        return {
          entries: { ...s.entries, [dirPath]: entries },
          loading: next,
        }
      })
    } catch (err) {
      logError('useFileStore:loadChildren', err)
      set((s) => {
        const next = { ...s.loading }
        delete next[dirPath]
        return { loading: next }
      })
    }
  },

  /**
   * 新建文件
   */
  createFile: async (dirPath, name) => {
    try {
      const newEntry = await ipc.files.createFile(dirPath, name)
      set((s) => {
        const existing = s.entries[dirPath] || []
        return {
          entries: { ...s.entries, [dirPath]: [...existing, newEntry] },
        }
      })
    } catch (err) {
      logError('useFileStore:createFile', err)
      throw err
    }
  },

  /**
   * 新建文件夹
   */
  createDirectory: async (dirPath, name) => {
    try {
      const newEntry = await ipc.files.createDirectory(dirPath, name)
      set((s) => {
        const existing = s.entries[dirPath] || []
        return {
          entries: { ...s.entries, [dirPath]: [...existing, newEntry] },
        }
      })
    } catch (err) {
      logError('useFileStore:createDirectory', err)
      throw err
    }
  },

  /**
   * 重命名文件/文件夹
   */
  renameEntry: async (oldPath, newName) => {
    try {
      const newEntry = await ipc.files.rename(oldPath, newName)
      const parentDir = getParentDir(oldPath)
      set((s) => {
        const existing = s.entries[parentDir] || []
        const updated = existing.map((e) => (e.path === oldPath ? newEntry : e))
        return {
          entries: { ...s.entries, [parentDir]: updated },
        }
      })
    } catch (err) {
      logError('useFileStore:renameEntry', err)
      throw err
    }
  },

  /**
   * 删除文件/文件夹（移至回收站）
   */
  deleteEntry: async (path) => {
    try {
      await ipc.files.moveToTrash(path)
      const parentDir = getParentDir(path)
      set((s) => {
        const existing = s.entries[parentDir] || []
        const updated = existing.filter((e) => e.path !== path)
        return {
          entries: { ...s.entries, [parentDir]: updated },
        }
      })
    } catch (err) {
      logError('useFileStore:deleteEntry', err)
      throw err
    }
  },

  /**
   * 刷新目录
   */
  refreshDirectory: async (dirPath) => {
    const { loadChildren } = get()
    set((s) => {
      const nextEntries = { ...s.entries }
      delete nextEntries[dirPath]
      return { entries: nextEntries }
    })
    await loadChildren(dirPath)
  },

  /**
   * 设置排序方式
   */
  setSort: (mode, direction) => {
    set((s) => ({
      sortMode: mode,
      sortDirection: direction ?? s.sortDirection,
    }))
  },

  /**
   * 获取指定目录已排序的条目
   */
  getSortedEntries: (dirPath) => {
    const { entries, sortMode, sortDirection } = get()
    const dirEntries = entries[dirPath] || []
    return sortFileEntries(dirEntries, sortMode, sortDirection)
  },

  /**
   * 添加工作区根目录
   */
  addRoot: async (path) => {
    const { rootPaths } = get()
    if (rootPaths.includes(path)) return
    const nextPaths = [...rootPaths, path]
    set({
      rootPaths: nextPaths,
      rootPath: nextPaths[0] ?? null,
    })
    await get().loadChildren(path)
  },

  /**
   * 移除工作区根目录
   */
  removeRoot: (path) => {
    const nextPaths = get().rootPaths.filter((p) => p !== path)
    set({
      rootPaths: nextPaths,
      rootPath: nextPaths[0] ?? null,
    })
  },

  /**
   * 判断路径是否为根目录
   */
  isRoot: (path) => {
    return get().rootPaths.includes(path)
  },
}))
