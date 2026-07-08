export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  isHidden: boolean
  isMarkdown?: boolean
}

export interface FileContent {
  path: string
  content: string
}

export interface SearchMatch {
  path: string
  line: number
  column: number
  matchText: string
  lineContent: string
}

export interface SearchProgress {
  searchId: string
  totalFiles: number
  searchedFiles: number
  matches: SearchMatch[]
  isComplete: boolean
  cancelled?: boolean
}

export interface ContentJumpTarget {
  path: string
  line: number
  lineContent: string
}

export interface AnchorJumpTarget {
  path: string
  anchor: string
}

export interface AppSettings {
  theme: 'system' | 'light' | 'dark'
  ignoreList: string[]
  markdownExtensions: string[]
  recentFiles: RecentEntry[]
  recentDirs: RecentEntry[]
  readingPositions: Record<string, number>
  lastWorkspace: string | null
  windowBounds: { x?: number; y?: number; width: number; height: number }
  openFiles: string[]
  activeFile: string | null
  sidebarWidth: number
  outlineWidth: number
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
