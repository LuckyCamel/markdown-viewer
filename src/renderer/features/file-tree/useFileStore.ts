import { create } from 'zustand'
import type { FileEntry } from '../../../shared/types'
import { ipc } from '../../lib/ipc'
import { logError } from '../../logger'
import { sortFileEntries, type SortMode, type SortDirection } from '../../../shared/fileSort'
import { useTabStore } from '../tabs/useTabStore'
import { useFavoritesStore } from './useFavoritesStore'

const CACHE_TTL = 5 * 60 * 1000

interface DirectoryCacheEntry {
  entries: FileEntry[]
  timestamp: number
}

const directoryCache = new Map<string, DirectoryCacheEntry>()

function getCachedEntries(path: string): FileEntry[] | null {
  const entry = directoryCache.get(path)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    directoryCache.delete(path)
    return null
  }
  return entry.entries
}

function setCachedEntries(path: string, entries: FileEntry[]) {
  directoryCache.set(path, { entries, timestamp: Date.now() })
}

function invalidateCache(path: string, invalidateParent = false): Set<string> {
  const affectedPaths = new Set<string>()
  affectedPaths.add(path)
  directoryCache.forEach((_, key) => {
    if (key.startsWith(path)) {
      affectedPaths.add(key)
      directoryCache.delete(key)
    }
  })
  directoryCache.delete(path)
  if (invalidateParent) {
    const parent = getParentDir(path)
    if (parent !== path) {
      const parentAffected = invalidateCache(parent, true)
      parentAffected.forEach((p) => affectedPaths.add(p))
    }
  }
  return affectedPaths
}

export function clearDirectoryCache() {
  directoryCache.clear()
}

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
  loadSortSettings: () => Promise<void>
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
    const { loading, entries } = get()
    if (loading[dirPath]) return
    const cached = getCachedEntries(dirPath)
    if (cached) {
      set((s) => ({ entries: { ...s.entries, [dirPath]: cached } }))
      return
    }
    if (entries[dirPath]) {
      return
    }
    set((s) => ({ loading: { ...s.loading, [dirPath]: true } }))
    try {
      const loadedEntries = await ipc.files.listDirectory(dirPath)
      setCachedEntries(dirPath, loadedEntries)
      set((s) => {
        const next = { ...s.loading }
        delete next[dirPath]
        return {
          entries: { ...s.entries, [dirPath]: loadedEntries },
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
      const affected = invalidateCache(dirPath, true)
      set((s) => {
        const nextEntries = { ...s.entries }
        affected.forEach((path) => delete nextEntries[path])
        const existing = s.entries[dirPath] || []
        return {
          entries: { ...nextEntries, [dirPath]: [...existing, newEntry] },
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
      const affected = invalidateCache(dirPath, true)
      set((s) => {
        const nextEntries = { ...s.entries }
        affected.forEach((path) => delete nextEntries[path])
        const existing = s.entries[dirPath] || []
        return {
          entries: { ...nextEntries, [dirPath]: [...existing, newEntry] },
        }
      })
    } catch (err) {
      logError('useFileStore:createDirectory', err)
      throw err
    }
  },

  /**
   * 重命名文件/文件夹
   *
   * 成功后通知 tabStore 更新已打开标签页的路径，保持编辑状态。
   */
  renameEntry: async (oldPath, newName) => {
    try {
      const newEntry = await ipc.files.rename(oldPath, newName)
      const parentDir = getParentDir(oldPath)
      const affected = invalidateCache(parentDir, true)
      invalidateCache(oldPath)
      set((s) => {
        const nextEntries = { ...s.entries }
        affected.forEach((path) => delete nextEntries[path])
        const existing = s.entries[parentDir] || []
        const updated = existing.map((e) => (e.path === oldPath ? newEntry : e))
        return {
          entries: { ...nextEntries, [parentDir]: updated },
        }
      })
      useTabStore.getState().renameFile(oldPath, newEntry.path)
    } catch (err) {
      logError('useFileStore:renameEntry', err)
      throw err
    }
  },

  /**
   * 删除文件/文件夹（移至回收站）
   *
   * 成功后关闭对应标签页并从收藏夹移除，避免引用失效路径。
   */
  deleteEntry: async (path) => {
    try {
      await ipc.files.moveToTrash(path)
      const parentDir = getParentDir(path)
      const affected = invalidateCache(parentDir, true)
      invalidateCache(path)
      set((s) => {
        const nextEntries = { ...s.entries }
        affected.forEach((p) => delete nextEntries[p])
        const existing = s.entries[parentDir] || []
        const updated = existing.filter((e) => e.path !== path)
        return {
          entries: { ...nextEntries, [parentDir]: updated },
        }
      })
      useTabStore.getState().closeFile(path)
      useFavoritesStore.getState().remove(path)
    } catch (err) {
      logError('useFileStore:deleteEntry', err)
      throw err
    }
  },

  /**
   * 刷新目录
   *
   * 失效该目录及其所有子目录的缓存，重新加载。
   */
  refreshDirectory: async (dirPath) => {
    const { loadChildren } = get()
    const affected = invalidateCache(dirPath)
    set((s) => {
      const nextEntries = { ...s.entries }
      affected.forEach((path) => delete nextEntries[path])
      return { entries: nextEntries }
    })
    await loadChildren(dirPath)
  },

  /**
   * 设置排序方式并持久化到 store
   */
  setSort: (mode, direction) => {
    set((s) => ({
      sortMode: mode,
      sortDirection: direction ?? s.sortDirection,
    }))
    ipc.store.set('fileSortMode', mode).catch((err) => logError('useFileStore:setSort:mode', err))
    if (direction) {
      ipc.store
        .set('fileSortDirection', direction)
        .catch((err) => logError('useFileStore:setSort:direction', err))
    }
  },

  /**
   * 从持久化存储加载排序设置
   */
  loadSortSettings: async () => {
    try {
      const savedMode = await ipc.store.get<SortMode>('fileSortMode')
      const savedDirection = await ipc.store.get<SortDirection>('fileSortDirection')
      if (savedMode) {
        set({ sortMode: savedMode })
      }
      if (savedDirection) {
        set({ sortDirection: savedDirection })
      }
    } catch (err) {
      logError('useFileStore:loadSortSettings', err)
    }
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
