import { readTextFile, stat } from '@tauri-apps/plugin-fs'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { open as shellOpen } from '@tauri-apps/plugin-shell'
import { emit, listen, type UnlistenFn } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { basename } from '../../shared/utils'
import type { FileEntry, FileContent, SearchProgress, FileChangeEvent } from '../../shared/types'

export async function listDirectory(dirPath: string): Promise<FileEntry[]> {
  return invoke('list_directory', { dirPath })
}

export async function updateSettings(
  ignoreList: string[],
  markdownExtensions: string[],
): Promise<void> {
  await invoke('update_settings', { ignoreList, markdownExtensions })
}

export async function readFile(filePath: string): Promise<FileContent> {
  const content = await readTextFile(filePath)
  return { path: filePath, content }
}

/**
 * 获取文件或目录的基本信息
 */
export async function getFileInfo(filePath: string): Promise<FileEntry> {
  const info = await stat(filePath)
  const name = basename(filePath)
  return {
    name,
    path: filePath,
    isDirectory: info.isDirectory,
    isHidden: name.startsWith('.'),
  }
}

/**
 * 批量检查文件/目录是否存在
 */
export async function checkExists(paths: string[]): Promise<boolean[]> {
  return invoke<boolean[]>('check_files_exist', { paths })
}

export async function searchContent(
  dirPath: string,
  query: string,
  searchId: string,
  isRegex: boolean = false,
): Promise<void> {
  await invoke('search_content', { dirPath, query, searchId, isRegex })
}

export async function cancelSearch(searchId: string): Promise<void> {
  await invoke('cancel_search', { searchId })
}

export async function getLaunchPaths(): Promise<string[]> {
  return invoke('get_launch_paths')
}

/**
 * 为 plugin-fs 动态授权路径（目录递归、文件及其父目录）
 */
export async function grantFsScope(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  await invoke('grant_fs_scope', { paths })
}

const STORE_MIGRATED_KEY = 'storeMigrated'

/**
 * 首次启动时将 localStorage 设置批量导入 Rust store
 */
export async function ensureStoreMigrated(): Promise<void> {
  const migrated = await invoke<boolean | null>('get_setting', { key: STORE_MIGRATED_KEY })
  if (migrated) return

  const entries: Record<string, unknown> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key || key === STORE_MIGRATED_KEY) continue
    const raw = localStorage.getItem(key)
    if (raw === null) continue
    try {
      entries[key] = JSON.parse(raw) as unknown
    } catch {
      entries[key] = raw
    }
  }

  if (Object.keys(entries).length > 0) {
    await invoke('migrate_settings', { entries })
  }
  await invoke('set_setting', { key: STORE_MIGRATED_KEY, value: true })
  localStorage.setItem(STORE_MIGRATED_KEY, '1')
}

const searchResultListeners = new Set<(result: SearchProgress) => void>()
let searchUnlisten: UnlistenFn | null = null

/**
 * 确保 search-result 全局监听器已注册
 */
async function ensureSearchListener(): Promise<void> {
  if (searchUnlisten) return
  searchUnlisten = await listen('search-result', (event) => {
    const payload = event.payload as SearchProgress
    for (const cb of searchResultListeners) {
      cb(payload)
    }
  })
}

export function onSearchResult(callback: (result: SearchProgress) => void): () => void {
  searchResultListeners.add(callback)
  ensureSearchListener().catch(() => {
    searchResultListeners.delete(callback)
  })
  return () => {
    searchResultListeners.delete(callback)
    if (searchResultListeners.size === 0 && searchUnlisten) {
      searchUnlisten()
      searchUnlisten = null
    }
  }
}

export function offSearchResult(callback: (result: SearchProgress) => void): void {
  searchResultListeners.delete(callback)
  if (searchResultListeners.size === 0 && searchUnlisten) {
    searchUnlisten()
    searchUnlisten = null
  }
}

export async function watchFile(filePath: string): Promise<void> {
  await invoke('watch_file', { filePath })
}

export async function unwatchFile(filePath: string): Promise<void> {
  await invoke('unwatch_file', { filePath })
}

const fileChangeListeners = new Set<(event: FileChangeEvent, content: string | null) => void>()
let fileChangeUnlisten: UnlistenFn | null = null

/**
 * 确保 file-change 全局监听器已注册
 */
async function ensureFileChangeListener(): Promise<void> {
  if (fileChangeUnlisten) return
  fileChangeUnlisten = await listen('file-change', (event) => {
    const payload = event.payload as { path: string; changeType: string; content: string | null }
    let eventType: 'change' | 'rename' | 'delete' = 'change'
    if (payload.changeType === 'delete') {
      eventType = 'delete'
    } else if (payload.changeType === 'create') {
      eventType = 'rename'
    }
    const fileEvent: FileChangeEvent = { path: payload.path, type: eventType }
    for (const cb of fileChangeListeners) {
      cb(fileEvent, payload.content)
    }
  })
}

export function onFileChange(
  callback: (event: FileChangeEvent, content: string | null) => void,
): () => void {
  fileChangeListeners.add(callback)
  ensureFileChangeListener().catch(() => {
    fileChangeListeners.delete(callback)
  })
  return () => {
    fileChangeListeners.delete(callback)
    if (fileChangeListeners.size === 0 && fileChangeUnlisten) {
      fileChangeUnlisten()
      fileChangeUnlisten = null
    }
  }
}

export function offFileChange(
  callback: (event: FileChangeEvent, content: string | null) => void,
): void {
  fileChangeListeners.delete(callback)
  if (fileChangeListeners.size === 0 && fileChangeUnlisten) {
    fileChangeUnlisten()
    fileChangeUnlisten = null
  }
}

export async function storeGet<T>(key: string): Promise<T | undefined> {
  const value = await invoke<unknown | null>('get_setting', { key })
  if (value === null || value === undefined) return undefined
  return value as T
}

export async function storeSet(key: string, value: unknown): Promise<void> {
  await invoke('set_setting', { key, value })
}

export async function storeDelete(key: string): Promise<void> {
  await invoke('set_setting', { key, value: null })
}

export async function openDirectory(): Promise<string | null> {
  const result = await openDialog({ directory: true })
  return result as string | null
}

export async function openFile(): Promise<string | null> {
  const result = await openDialog({
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
  })
  return result as string | null
}

export async function openExternal(url: string): Promise<void> {
  await shellOpen(url)
}

/**
 * 在系统文件管理器中显示指定文件或目录所在位置
 */
export async function revealPathInDir(path: string): Promise<void> {
  await invoke('reveal_path', { path })
}

const ipcEventListeners = new Map<string, Set<(...args: unknown[]) => void>>()
const ipcEventUnlisteners = new Map<string, UnlistenFn>()

/**
 * 确保指定 channel 的全局监听器已注册
 */
async function ensureIpcEventListener(channel: string): Promise<void> {
  if (ipcEventUnlisteners.has(channel)) return
  const unlisten = await listen(channel, (event) => {
    const listeners = ipcEventListeners.get(channel)
    if (!listeners) return
    for (const cb of listeners) {
      cb(event.payload)
    }
  })
  ipcEventUnlisteners.set(channel, unlisten)
}

export function onIpcEvent(channel: string, callback: (...args: unknown[]) => void): () => void {
  if (!ipcEventListeners.has(channel)) {
    ipcEventListeners.set(channel, new Set())
  }
  ipcEventListeners.get(channel)!.add(callback)
  ensureIpcEventListener(channel).catch(() => {
    ipcEventListeners.get(channel)?.delete(callback)
  })
  return () => {
    ipcEventListeners.get(channel)?.delete(callback)
    const listeners = ipcEventListeners.get(channel)
    if (listeners && listeners.size === 0) {
      ipcEventListeners.delete(channel)
      const unlisten = ipcEventUnlisteners.get(channel)
      if (unlisten) {
        unlisten()
        ipcEventUnlisteners.delete(channel)
      }
    }
  }
}

export function offIpcEvent(channel: string, callback: (...args: unknown[]) => void): void {
  ipcEventListeners.get(channel)?.delete(callback)
  const listeners = ipcEventListeners.get(channel)
  if (listeners && listeners.size === 0) {
    ipcEventListeners.delete(channel)
    const unlisten = ipcEventUnlisteners.get(channel)
    if (unlisten) {
      unlisten()
      ipcEventUnlisteners.delete(channel)
    }
  }
}

export async function emitIpcEvent(channel: string, ...args: unknown[]): Promise<void> {
  await emit(channel, args.length === 1 ? args[0] : args)
}

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
    checkExists,
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
