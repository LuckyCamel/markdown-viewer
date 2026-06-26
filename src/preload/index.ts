import { contextBridge, ipcRenderer } from 'electron'
import type {
  ElectronAPI,
  FileContent,
  FileEntry,
  FileChangeEvent,
  SearchProgress,
} from '../shared/types'
import { IPC_CHANNELS } from '../shared/types'

type ListenerKey = string
const listenerMap = new Map<ListenerKey, (...args: unknown[]) => void>()
function key(channel: string, callback: (...args: unknown[]) => void): ListenerKey {
  return `${channel}\0${callback.name || callback.toString().slice(0, 40)}`
}

const api: ElectronAPI = {
  files: {
    listDirectory: (dirPath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.FILES_LIST_DIRECTORY, dirPath) as Promise<FileEntry[]>,
    readFile: (filePath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.FILES_READ_FILE, filePath) as Promise<FileContent>,
    getFileInfo: (filePath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.FILES_GET_FILE_INFO, filePath) as Promise<FileEntry>,
    invalidateFilter: () =>
      ipcRenderer.invoke(IPC_CHANNELS.FILE_FILTER_INVALIDATE) as Promise<void>,
  },
  search: {
    searchContent: (dirPath: string, query: string) => {
      ipcRenderer.send(IPC_CHANNELS.FILES_SEARCH_CONTENT, dirPath, query)
    },
    onResult: (callback: (result: SearchProgress) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, result: SearchProgress) =>
        callback(result)
      listenerMap.set(
        key(IPC_CHANNELS.SEARCH_RESULT, callback as (...args: unknown[]) => void),
        handler as (...args: unknown[]) => void,
      )
      ipcRenderer.on(IPC_CHANNELS.SEARCH_RESULT, handler as (...args: unknown[]) => void)
    },
    offResult: (callback: (result: SearchProgress) => void) => {
      const k = key(IPC_CHANNELS.SEARCH_RESULT, callback as (...args: unknown[]) => void)
      const handler = listenerMap.get(k) as (...args: unknown[]) => void
      if (handler) {
        ipcRenderer.removeListener(IPC_CHANNELS.SEARCH_RESULT, handler)
        listenerMap.delete(k)
      }
    },
  },
  watcher: {
    watchFile: (filePath: string) => ipcRenderer.send(IPC_CHANNELS.WATCHER_WATCH_FILE, filePath),
    unwatchFile: (filePath: string) =>
      ipcRenderer.send(IPC_CHANNELS.WATCHER_UNWATCH_FILE, filePath),
    onChange: (callback: (event: FileChangeEvent, content: string | null) => void) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        event: FileChangeEvent,
        content: string | null,
      ) => callback(event, content)
      listenerMap.set(
        key(IPC_CHANNELS.WATCHER_FILE_CHANGED, callback as (...args: unknown[]) => void),
        handler as (...args: unknown[]) => void,
      )
      ipcRenderer.on(IPC_CHANNELS.WATCHER_FILE_CHANGED, handler as (...args: unknown[]) => void)
    },
    offChange: (callback: (event: FileChangeEvent, content: string | null) => void) => {
      const k = key(IPC_CHANNELS.WATCHER_FILE_CHANGED, callback as (...args: unknown[]) => void)
      const handler = listenerMap.get(k) as (...args: unknown[]) => void
      if (handler) {
        ipcRenderer.removeListener(IPC_CHANNELS.WATCHER_FILE_CHANGED, handler)
        listenerMap.delete(k)
      }
    },
  },
  store: {
    get: <T>(key: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.STORE_GET, key) as Promise<T | undefined>,
    set: (key: string, value: unknown) =>
      ipcRenderer.invoke(IPC_CHANNELS.STORE_SET, key, value) as Promise<void>,
    delete: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.STORE_DELETE, key) as Promise<void>,
  },
  dialog: {
    openDirectory: () =>
      ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_DIRECTORY) as Promise<string | null>,
    openFile: () => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_FILE) as Promise<string | null>,
  },
  shell: {
    openExternal: (url: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SHELL_OPEN_EXTERNAL, url) as Promise<void>,
  },
  ipc: {
    on: (channel: string, callback: (...args: unknown[]) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args)
      listenerMap.set(key(channel, callback), handler as (...args: unknown[]) => void)
      ipcRenderer.on(channel, handler as (...args: unknown[]) => void)
    },
    off: (channel: string, callback: (...args: unknown[]) => void) => {
      const k = key(channel, callback)
      const handler = listenerMap.get(k) as (...args: unknown[]) => void
      if (handler) {
        ipcRenderer.removeListener(channel, handler)
        listenerMap.delete(k)
      }
    },
  },
}

contextBridge.exposeInMainWorld('api', api)
