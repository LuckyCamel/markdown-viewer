import { readDir, readTextFile } from '@tauri-apps/plugin-fs'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { open as shellOpen } from '@tauri-apps/plugin-shell'
import { emit, listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
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

export async function getFileInfo(filePath: string): Promise<FileEntry> {
  const entries = await readDir(filePath)
  const name = filePath.split('/').pop() || filePath.split('\\').pop() || filePath
  return {
    name,
    path: filePath,
    isDirectory: entries.length > 0 || filePath.endsWith('/') || filePath.endsWith('\\'),
    isHidden: name.startsWith('.'),
  }
}

export async function searchContent(dirPath: string, query: string): Promise<void> {
  await invoke('search_content', { dirPath, query })
}

export function onSearchResult(callback: (result: SearchProgress) => void): () => void {
  let cleanup: (() => void) | undefined
  listen('search-result', (event) => {
    callback(event.payload as SearchProgress)
  }).then((fn) => {
    cleanup = fn
  })
  return () => cleanup?.()
}

export async function watchFile(filePath: string): Promise<void> {
  await invoke('watch_file', { filePath })
}

export async function unwatchFile(filePath: string): Promise<void> {
  await invoke('unwatch_file', { filePath })
}

export function onFileChange(
  callback: (event: FileChangeEvent, content: string | null) => void,
): () => void {
  let cleanup: (() => void) | undefined
  listen('file-change', (event) => {
    const payload = event.payload as { path: string; changeType: string; content: string | null }
    let eventType: 'change' | 'rename' | 'delete' = 'change'
    if (payload.changeType === 'delete') {
      eventType = 'delete'
    } else if (payload.changeType === 'create') {
      eventType = 'rename'
    }
    callback({ path: payload.path, type: eventType }, payload.content)
  }).then((fn) => {
    cleanup = fn
  })
  return () => cleanup?.()
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

export function onIpcEvent(channel: string, callback: (...args: unknown[]) => void): () => void {
  let cleanup: (() => void) | undefined
  listen(channel, (event) => {
    callback(event.payload)
  }).then((fn) => {
    cleanup = fn
  })
  return () => cleanup?.()
}

export async function emitIpcEvent(channel: string, ...args: unknown[]): Promise<void> {
  await emit(channel, args.length === 1 ? args[0] : args)
}

export const ipc = {
  files: {
    listDirectory,
    readFile,
    getFileInfo,
    updateSettings,
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
