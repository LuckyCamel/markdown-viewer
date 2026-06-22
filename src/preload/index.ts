import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI, FileContent, FileEntry, FileChangeEvent, SearchProgress } from '../shared/types'

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
      ipcRenderer.on('search:result', (_event, result) => callback(result))
    },
    offResult: (callback: (result: SearchProgress) => void) => {
      ipcRenderer.removeListener('search:result', (_event, result) => callback(result))
    },
  },
  watcher: {
    watchFile: (filePath: string) => ipcRenderer.send('watcher:watchFile', filePath),
    unwatchFile: (filePath: string) => ipcRenderer.send('watcher:unwatchFile', filePath),
    onChange: (callback: (event: FileChangeEvent, content: string | null) => void) => {
      ipcRenderer.on('watcher:fileChanged', (_event, event, content) => callback(event, content))
    },
    offChange: (callback: (event: FileChangeEvent, content: string | null) => void) => {
      ipcRenderer.removeListener('watcher:fileChanged', (_event, event, content) => callback(event, content))
    },
  },
  store: {
    get: <T>(key: string) => ipcRenderer.invoke('store:get', key) as Promise<T | undefined>,
    set: (key: string, value: unknown) => ipcRenderer.invoke('store:set', key, value) as Promise<void>,
    delete: (key: string) => ipcRenderer.invoke('store:delete', key) as Promise<void>,
  },
  dialog: {
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory') as Promise<string | null>,
    openFile: () => ipcRenderer.invoke('dialog:openFile') as Promise<string | null>,
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url) as Promise<void>,
  },
}

contextBridge.exposeInMainWorld('api', api)
