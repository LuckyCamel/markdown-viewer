export const IPC_CHANNELS = {
  FILES_LIST_DIRECTORY: 'files:listDirectory',
  FILES_READ_FILE: 'files:readFile',
  FILES_GET_FILE_INFO: 'files:getFileInfo',
  FILES_SEARCH_CONTENT: 'files:searchContent',
  SEARCH_RESULT: 'search:result',
  WATCHER_WATCH_FILE: 'watcher:watchFile',
  WATCHER_UNWATCH_FILE: 'watcher:unwatchFile',
  WATCHER_FILE_CHANGED: 'watcher:fileChanged',
  STORE_GET: 'store:get',
  STORE_SET: 'store:set',
  STORE_DELETE: 'store:delete',
  DIALOG_OPEN_DIRECTORY: 'dialog:openDirectory',
  DIALOG_OPEN_FILE: 'dialog:openFile',
  SHELL_OPEN_EXTERNAL: 'shell:openExternal',
  MENU_OPEN_FOLDER: 'menu:openFolder',
  MENU_CLOSE_TAB: 'menu:closeTab',
  MENU_TOGGLE_FILE_TREE: 'menu:toggleFileTree',
  MENU_TOGGLE_OUTLINE: 'menu:toggleOutline',
  MENU_FILE_SEARCH: 'menu:fileSearch',
  MENU_CONTENT_SEARCH: 'menu:contentSearch',
  MENU_OPEN_SETTINGS: 'menu:openSettings',
  MENU_NEXT_TAB: 'menu:nextTab',
  MENU_PREV_TAB: 'menu:prevTab',
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
  ipc: {
    on(channel: string, callback: (...args: unknown[]) => void): void
    off(channel: string, callback: (...args: unknown[]) => void): void
  }
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
