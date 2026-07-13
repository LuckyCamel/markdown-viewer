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

export async function updateSettings(
  _ignoreList: string[],
  _markdownExtensions: string[],
): Promise<void> {}

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

export async function searchContent(
  _dirPath: string,
  _query: string,
  _searchId: string,
): Promise<void> {
  ensureE2E()
  const results = window.__E2E__.searchResults
  if (results) {
    for (const cb of window.__E2E__.searchResultListeners) {
      cb(results)
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

export async function grantFsScope(_paths: string[]): Promise<void> {}

export async function ensureStoreMigrated(): Promise<void> {}

export const ipc = {
  app: {
    getLaunchPaths,
  },
  scope: {
    grantFsScope,
  },
  files: {
    listDirectory,
    readFile,
    getFileInfo,
    updateSettings,
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
