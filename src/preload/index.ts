import { contextBridge, ipcRenderer } from 'electron'
import type {
  ElectronAPI,
  FileContent,
  FileEntry,
  FileChangeEvent,
  SearchProgress,
} from '../shared/types'

type ListenerKey = string
const listenerMap = new Map<ListenerKey, (...args: unknown[]) => void>()
function key(channel: string, callback: (...args: unknown[]) => void): ListenerKey {
  return `${channel}\0${callback.name || callback.toString().slice(0, 40)}`
}

const api: ElectronAPI = {
  files: {
    listDirectory: (dirPath: string) =>
      ipcRenderer.invoke('files:listDirectory', dirPath) as Promise<FileEntry[]>,
    readFile: (filePath: string) =>
      ipcRenderer.invoke('files:readFile', filePath) as Promise<FileContent>,
    getFileInfo: (filePath: string) =>
      ipcRenderer.invoke('files:getFileInfo', filePath) as Promise<FileEntry>,
  },
  search: {
    searchContent: (dirPath: string, query: string) => {
      ipcRenderer.send('files:searchContent', dirPath, query)
    },
    onResult: (callback: (result: SearchProgress) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, result: SearchProgress) =>
        callback(result)
      listenerMap.set(key('search:result', callback), handler)
      ipcRenderer.on('search:result', handler as (...args: unknown[]) => void)
    },
    offResult: (callback: (result: SearchProgress) => void) => {
      const k = key('search:result', callback)
      const handler = listenerMap.get(k) as (...args: unknown[]) => void
      if (handler) {
        ipcRenderer.removeListener('search:result', handler)
        listenerMap.delete(k)
      }
    },
  },
  watcher: {
    watchFile: (filePath: string) => ipcRenderer.send('watcher:watchFile', filePath),
    unwatchFile: (filePath: string) => ipcRenderer.send('watcher:unwatchFile', filePath),
    onChange: (callback: (event: FileChangeEvent, content: string | null) => void) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        event: FileChangeEvent,
        content: string | null,
      ) => callback(event, content)
      listenerMap.set(key('watcher:fileChanged', callback), handler)
      ipcRenderer.on('watcher:fileChanged', handler as (...args: unknown[]) => void)
    },
    offChange: (callback: (event: FileChangeEvent, content: string | null) => void) => {
      const k = key('watcher:fileChanged', callback)
      const handler = listenerMap.get(k) as (...args: unknown[]) => void
      if (handler) {
        ipcRenderer.removeListener('watcher:fileChanged', handler)
        listenerMap.delete(k)
      }
    },
  },
  store: {
    get: <T>(key: string) => ipcRenderer.invoke('store:get', key) as Promise<T | undefined>,
    set: (key: string, value: unknown) =>
      ipcRenderer.invoke('store:set', key, value) as Promise<void>,
    delete: (key: string) => ipcRenderer.invoke('store:delete', key) as Promise<void>,
  },
  dialog: {
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory') as Promise<string | null>,
    openFile: () => ipcRenderer.invoke('dialog:openFile') as Promise<string | null>,
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url) as Promise<void>,
  },
  ipc: {
    on: (channel: string, callback: (...args: unknown[]) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args)
      listenerMap.set(key(channel, callback), handler)
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
