import type { FileEntry, FileContent, SearchProgress, FileChangeEvent } from '../../shared/types'

/**
 * 与 Rust SettingsState 默认规则一致，供 mock listDirectory 补全 isMarkdown
 */
function isMarkdownFileName(name: string): boolean {
  if (/\.(md|markdown)$/i.test(name)) return true
  return !name.includes('.')
}

/**
 * 补全目录条目上的 isMarkdown 标记
 */
function enrichFileEntry(entry: FileEntry): FileEntry {
  if (entry.isDirectory || entry.isMarkdown === true) return entry
  return { ...entry, isMarkdown: isMarkdownFileName(entry.name) }
}

/**
 * E2E 测试用的 mock IPC 实现。
 * 通过 window.__E2E__ 全局对象与测试代码交互。
 */
;(function () {
  if (typeof window !== 'undefined') {
    ;(window as any).__IPC_MOCK_LOADED__ = true
  }
})()

declare global {
  interface Window {
    __E2E__: {
      files: Map<string, string>
      directoryTree: Map<string, FileEntry[]>
      dialogResult: string | null
      openExternalCalls: string[]
      revealPathCalls: string[]
      searchResults: SearchProgress | null
      fileChangeListeners: Map<string, (event: FileChangeEvent, content: string | null) => void>
      searchResultListeners: Set<(result: SearchProgress) => void>
      fileChangeCallbacks: Set<(event: FileChangeEvent, content: string | null) => void>
      eventListeners: Map<string, Set<(...args: unknown[]) => void>>
    }
  }
}

function ensureE2E() {
  if (!window.__E2E__) {
    window.__E2E__ = {
      files: new Map(),
      directoryTree: new Map(),
      dialogResult: null,
      openExternalCalls: [],
      revealPathCalls: [],
      searchResults: null,
      fileChangeListeners: new Map(),
      searchResultListeners: new Set(),
      fileChangeCallbacks: new Set(),
      eventListeners: new Map(),
    }
  }
  return window.__E2E__
}

export async function listDirectory(dirPath: string): Promise<FileEntry[]> {
  ensureE2E()
  const entries = window.__E2E__.directoryTree.get(dirPath) || []
  return entries.map(enrichFileEntry)
}

export async function readFile(filePath: string): Promise<FileContent> {
  ensureE2E()
  const content = window.__E2E__.files.get(filePath) || ''
  return { path: filePath, content }
}

export async function getFileInfo(filePath: string): Promise<FileEntry> {
  ensureE2E()
  const entries = window.__E2E__.directoryTree.get(filePath)
  const name = filePath.split(/[\\/]/).pop() || filePath
  return {
    name,
    path: filePath,
    isDirectory: !!entries,
    isHidden: name.startsWith('.'),
  }
}

/**
 * 批量检查文件/目录是否存在（mock 实现，默认全部视为存在）
 */
export async function checkExists(paths: string[]): Promise<boolean[]> {
  return paths.map(() => true)
}

/**
 * 新建文件（mock 实现）
 */
export async function createFile(dirPath: string, name: string): Promise<FileEntry> {
  ensureE2E()
  const path = `${dirPath}/${name}`
  const isMarkdown = /\.(md|markdown)$/i.test(name) || !name.includes('.')
  const entry: FileEntry = {
    name,
    path,
    isDirectory: false,
    isHidden: name.startsWith('.'),
    isMarkdown,
  }
  const entries = window.__E2E__.directoryTree.get(dirPath) || []
  window.__E2E__.directoryTree.set(dirPath, [...entries, entry])
  window.__E2E__.files.set(path, '')
  return entry
}

/**
 * 新建文件夹（mock 实现）
 */
export async function createDirectory(dirPath: string, name: string): Promise<FileEntry> {
  ensureE2E()
  const path = `${dirPath}/${name}`
  const entry: FileEntry = {
    name,
    path,
    isDirectory: true,
    isHidden: name.startsWith('.'),
  }
  const entries = window.__E2E__.directoryTree.get(dirPath) || []
  window.__E2E__.directoryTree.set(dirPath, [...entries, entry])
  window.__E2E__.directoryTree.set(path, [])
  return entry
}

/**
 * 重命名文件/文件夹（mock 实现）
 */
export async function renameEntry(oldPath: string, newName: string): Promise<FileEntry> {
  ensureE2E()
  const parts = oldPath.split('/')
  const oldName = parts.pop() || ''
  const dirPath = parts.join('/')
  const newPath = `${dirPath}/${newName}`

  const entries = window.__E2E__.directoryTree.get(dirPath) || []
  const oldEntry = entries.find((e) => e.path === oldPath)
  const isDir = oldEntry?.isDirectory ?? false

  const newEntry: FileEntry = {
    ...(oldEntry || {}),
    name: newName,
    path: newPath,
    isDirectory: isDir,
    isHidden: newName.startsWith('.'),
  } as FileEntry

  const newEntries = entries.map((e) => (e.path === oldPath ? newEntry : e))
  window.__E2E__.directoryTree.set(dirPath, newEntries)

  if (!isDir) {
    const content = window.__E2E__.files.get(oldPath)
    if (content !== undefined) {
      window.__E2E__.files.set(newPath, content)
      window.__E2E__.files.delete(oldPath)
    }
  } else {
    const children = window.__E2E__.directoryTree.get(oldPath)
    if (children) {
      window.__E2E__.directoryTree.set(newPath, children)
      window.__E2E__.directoryTree.delete(oldPath)
    }
  }

  return newEntry
}

/**
 * 移至回收站（mock 实现）
 */
export async function moveToTrash(path: string): Promise<void> {
  ensureE2E()
  const parts = path.split('/')
  const name = parts.pop() || ''
  const dirPath = parts.join('/')

  const entries = window.__E2E__.directoryTree.get(dirPath) || []
  const entry = entries.find((e) => e.path === path)
  const isDir = entry?.isDirectory ?? false

  const newEntries = entries.filter((e) => e.path !== path)
  window.__E2E__.directoryTree.set(dirPath, newEntries)

  if (!isDir) {
    window.__E2E__.files.delete(path)
  } else {
    window.__E2E__.directoryTree.delete(path)
  }
}

export async function searchContent(
  _rootPaths: string[],
  _query: string,
  searchId: string,
  _isRegex: boolean = false,
): Promise<void> {
  ensureE2E()
  const results = window.__E2E__.searchResults
  if (results) {
    // 用传入的 searchId 替换 mock 数据中的 searchId，
    // 使 ContentSearch 的 handleResult 能匹配并 appendResults
    const adjusted: SearchProgress = { ...results, searchId }
    for (const cb of window.__E2E__.searchResultListeners) {
      cb(adjusted)
    }
  }
}

export async function cancelSearch(_searchId: string): Promise<void> {}

export function onSearchResult(callback: (result: SearchProgress) => void): () => void {
  ensureE2E()
  window.__E2E__.searchResultListeners.add(callback)
  return () => window.__E2E__.searchResultListeners.delete(callback)
}

export function offSearchResult(callback: (result: SearchProgress) => void): void {
  ensureE2E()
  window.__E2E__.searchResultListeners.delete(callback)
}

export async function watchFile(filePath: string): Promise<void> {
  ensureE2E()
  window.__E2E__.fileChangeListeners.set(filePath, () => {})
}

export async function unwatchFile(filePath: string): Promise<void> {
  ensureE2E()
  window.__E2E__.fileChangeListeners.delete(filePath)
}

export function onFileChange(
  callback: (event: FileChangeEvent, content: string | null) => void,
): () => void {
  ensureE2E()
  window.__E2E__.fileChangeCallbacks.add(callback)
  return () => window.__E2E__.fileChangeCallbacks.delete(callback)
}

export function offFileChange(
  callback: (event: FileChangeEvent, content: string | null) => void,
): void {
  ensureE2E()
  window.__E2E__.fileChangeCallbacks.delete(callback)
}

export async function storeGet<T>(key: string): Promise<T | undefined> {
  const stored = localStorage.getItem(key)
  if (stored) {
    try {
      return JSON.parse(stored) as T
    } catch {
      return stored as unknown as T
    }
  }
  return undefined
}

export async function storeSet(key: string, value: unknown): Promise<void> {
  localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
}

export async function storeDelete(key: string): Promise<void> {
  localStorage.removeItem(key)
}

export async function openDirectory(): Promise<string | null> {
  ensureE2E()
  return window.__E2E__.dialogResult
}

export async function openFile(): Promise<string | null> {
  ensureE2E()
  return window.__E2E__.dialogResult
}

export async function openExternal(url: string): Promise<void> {
  ensureE2E()
  window.__E2E__.openExternalCalls.push(url)
}

/**
 * 在系统文件管理器中显示指定文件或目录所在位置（mock 实现）
 */
export async function revealPathInDir(path: string): Promise<void> {
  ensureE2E()
  window.__E2E__.revealPathCalls.push(path)
}

export function onIpcEvent(channel: string, callback: (...args: unknown[]) => void): () => void {
  ensureE2E()
  if (!window.__E2E__.eventListeners.has(channel)) {
    window.__E2E__.eventListeners.set(channel, new Set())
  }
  window.__E2E__.eventListeners.get(channel)!.add(callback)
  return () => window.__E2E__.eventListeners.get(channel)?.delete(callback)
}

export function offIpcEvent(channel: string, callback: (...args: unknown[]) => void): void {
  ensureE2E()
  window.__E2E__.eventListeners.get(channel)?.delete(callback)
}

export async function emitIpcEvent(channel: string, ...args: unknown[]): Promise<void> {
  ensureE2E()
  const listeners = window.__E2E__.eventListeners.get(channel)
  if (listeners) {
    for (const cb of listeners) cb(...args)
  }
}

export async function getLaunchPaths(): Promise<string[]> {
  return []
}

export async function grantWorkspace(_paths: string[]): Promise<void> {}

export async function ensureStoreMigrated(): Promise<void> {}

export async function saveFile(filePath: string, content: string): Promise<number> {
  ensureE2E()
  window.__E2E__.files.set(filePath, content)
  return Date.now()
}

export async function getMtime(filePath: string): Promise<number> {
  ensureE2E()
  return window.__E2E__.files.has(filePath) ? Date.now() : 0
}

export const ipc = {
  app: {
    getLaunchPaths,
  },
  workspace: {
    grant: grantWorkspace,
  },
  files: {
    listDirectory,
    readFile,
    getFileInfo,
    checkExists,
    createFile,
    createDirectory,
    rename: renameEntry,
    moveToTrash,
    saveFile,
    getMtime,
  },
  search: {
    searchContent,
    cancelSearch,
    onResult: onSearchResult,
    offResult: offSearchResult,
  },
  watcher: {
    watchFile,
    unwatchFile,
    onChange: onFileChange,
    offChange: offFileChange,
  },
  store: {
    get: storeGet,
    set: storeSet,
    del: storeDelete,
  },
  dialog: {
    openDirectory,
    openFile,
  },
  shell: {
    openExternal,
    revealPathInDir,
  },
  ipc: {
    on: onIpcEvent,
    off: offIpcEvent,
  },
}
