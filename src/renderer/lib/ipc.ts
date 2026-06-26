import type { FileEntry, FileContent, FileChangeEvent, SearchProgress } from '../../shared/types'

export const ipc = {
  files: {
    listDirectory: (dirPath: string): Promise<FileEntry[]> =>
      window.api.files.listDirectory(dirPath),
    readFile: (filePath: string): Promise<FileContent> => window.api.files.readFile(filePath),
    getFileInfo: (filePath: string): Promise<FileEntry> => window.api.files.getFileInfo(filePath),
  },
  search: {
    searchContent: (dirPath: string, query: string): void =>
      window.api.search.searchContent(dirPath, query),
    onResult: (cb: (result: SearchProgress) => void): void => window.api.search.onResult(cb),
    offResult: (cb: (result: SearchProgress) => void): void => window.api.search.offResult(cb),
  },
  watcher: {
    watchFile: (filePath: string): void => window.api.watcher.watchFile(filePath),
    unwatchFile: (filePath: string): void => window.api.watcher.unwatchFile(filePath),
    onChange: (cb: (event: FileChangeEvent, content: string | null) => void): void =>
      window.api.watcher.onChange(cb),
    offChange: (cb: (event: FileChangeEvent, content: string | null) => void): void =>
      window.api.watcher.offChange(cb),
  },
  store: {
    get: <T>(key: string): Promise<T | undefined> => window.api.store.get<T>(key),
    set: (key: string, value: unknown): Promise<void> => window.api.store.set(key, value),
    del: (key: string): Promise<void> => window.api.store.delete(key),
  },
  dialog: {
    openDirectory: (): Promise<string | null> => window.api.dialog.openDirectory(),
    openFile: (): Promise<string | null> => window.api.dialog.openFile(),
  },
  shell: {
    openExternal: (url: string): Promise<void> => window.api.shell.openExternal(url),
  },
  ipc: {
    on: (channel: string, cb: (...args: unknown[]) => void): void => window.api.ipc.on(channel, cb),
    off: (channel: string, cb: (...args: unknown[]) => void): void =>
      window.api.ipc.off(channel, cb),
  },
}
