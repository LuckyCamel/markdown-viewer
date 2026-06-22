export const IPC_CHANNELS = {
  LIST_DIRECTORY: 'files:listDirectory',
  READ_FILE: 'files:readFile',
  GET_FILE_INFO: 'files:getFileInfo',
  SEARCH_CONTENT: 'search:searchContent',
  SEARCH_RESULT: 'search:searchResult',
  SEARCH_DONE: 'search:searchDone',
  WATCH_FILE: 'watcher:watchFile',
  UNWATCH_FILE: 'watcher:unwatchFile',
  FILE_CHANGED: 'watcher:fileChanged',
  STORE_GET: 'store:get',
  STORE_SET: 'store:set',
  STORE_DELETE: 'store:delete',
  OPEN_DIRECTORY: 'dialog:openDirectory',
  OPEN_FILE: 'dialog:openFile',
  OPEN_EXTERNAL: 'shell:openExternal',
} as const

export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  isHidden: boolean
}

export interface FileContent {
  path: string
  content: string
}

export interface SearchMatch {
  path: string
  line: number
  column: number
  match: string
  lineContent: string
}

export interface SearchProgress {
  totalFiles: number
  searchedFiles: number
  matches: SearchMatch[]
}

export interface AppSettings {
  theme: 'system' | 'light' | 'dark'
  ignoreList: string[]
  recentFiles: RecentEntry[]
  recentDirs: RecentEntry[]
  readingPositions: Record<string, number>
  lastWorkspace: string | null
  windowBounds: { x?: number; y?: number; width: number; height: number }
  openFiles: string[]
  activeFile: string | null
}

export interface RecentEntry {
  path: string
  name: string
  timestamp: number
}

export interface FileChangeEvent {
  path: string
  type: 'change' | 'rename' | 'delete'
}

export type ThemeMode = 'system' | 'light' | 'dark'

export interface ElectronAPI {
  files: {
    listDirectory(dirPath: string): Promise<FileEntry[]>
    readFile(filePath: string): Promise<FileContent>
    getFileInfo(filePath: string): Promise<FileEntry>
  }
  search: {
    searchContent(dirPath: string, query: string): void
    onResult(callback: (result: SearchProgress) => void): void
    offResult(callback: (result: SearchProgress) => void): void
  }
  watcher: {
    watchFile(filePath: string): void
    unwatchFile(filePath: string): void
    onChange(callback: (event: FileChangeEvent, content: string | null) => void): void
    offChange(callback: (event: FileChangeEvent, content: string | null) => void): void
  }
  store: {
    get<T>(key: string): Promise<T | undefined>
    set(key: string, value: unknown): Promise<void>
    delete(key: string): Promise<void>
  }
  dialog: {
    openDirectory(): Promise<string | null>
    openFile(): Promise<string | null>
  }
  shell: {
    openExternal(url: string): Promise<void>
  }
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
