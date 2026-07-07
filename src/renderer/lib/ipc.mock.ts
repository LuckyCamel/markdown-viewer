import type { FileEntry, FileContent, SearchProgress, FileChangeEvent } from '../../shared/types'

/**
 * E2E 测试用的 mock IPC 实现。
 * 通过 window.__E2E__ 全局对象与测试代码交互。
 */

// 标记：此模块被加载时设置一个全局变量，用于检测 alias 是否生效
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
      searchResults: SearchProgress | null
      fileChangeListeners: Map<string, (event: FileChangeEvent, content: string | null) => void>
      eventListeners: Map<string, (...args: unknown[]) => void>
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
      searchResults: null,
      fileChangeListeners: new Map(),
      eventListeners: new Map(),
    }
  }
  return window.__E2E__
}

export async function listDirectory(dirPath: string): Promise<FileEntry[]> {
  ensureE2E()
  return window.__E2E__.directoryTree.get(dirPath) || []
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

export async function invalidateFilter(): Promise<void> {}

export async function searchContent(dirPath: string, query: string): Promise<void> {
  ensureE2E()
  const results = window.__E2E__.searchResults
  if (results) {
    const cb = window.__E2E__.eventListeners.get('search-result')
    if (cb) cb(results)
  }
}

export function onSearchResult(callback: (result: SearchProgress) => void): () => void {
  ensureE2E()
  window.__E2E__.eventListeners.set('search-result', callback as (...args: unknown[]) => void)
  return () => window.__E2E__.eventListeners.delete('search-result')
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
  window.__E2E__.eventListeners.set('file-change', callback as (...args: unknown[]) => void)
  return () => window.__E2E__.eventListeners.delete('file-change')
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

export function onIpcEvent(channel: string, callback: (...args: unknown[]) => void): () => void {
  ensureE2E()
  window.__E2E__.eventListeners.set(channel, callback)
  return () => window.__E2E__.eventListeners.delete(channel)
}

export async function emitIpcEvent(channel: string, ...args: unknown[]): Promise<void> {
  ensureE2E()
  const cb = window.__E2E__.eventListeners.get(channel)
  if (cb) cb(...args)
}

export const ipc = {
  files: {
    listDirectory,
    readFile,
    getFileInfo,
    invalidateFilter,
  },
  search: {
    searchContent,
    onResult: onSearchResult,
    offResult: (_cb: (result: SearchProgress) => void) => {},
  },
  watcher: {
    watchFile,
    unwatchFile,
    onChange: onFileChange,
    offChange: () => {},
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
  },
  ipc: {
    on: onIpcEvent,
    off: () => {},
  },
}
