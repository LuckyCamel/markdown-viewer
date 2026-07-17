export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  isHidden: boolean
  isMarkdown?: boolean
  isTextFile?: boolean
  modified?: number
  size?: number
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
  newMatches?: SearchMatch[]
  isComplete: boolean
  cancelled?: boolean
  truncated?: boolean
  matchLimit?: number
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
  readingPositions: Record<string, { render: number; source: number }>
  lastWorkspace: string | null
  windowBounds: { x?: number; y?: number; width: number; height: number }
  openFiles: string[]
  activeFile: string | null
  sidebarWidth: number
  outlineWidth: number
  /** 大纲折叠状态：filePath -> 已折叠 headingId 数组 */
  outlineCollapsed: Record<string, string[]>
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

export type ViewMode = 'read' | 'edit'

/**
 * 阅读设置：控制 Markdown 渲染区域的字体、行高、宽度等
 */
export interface ReadingSettings {
  /** 正文字体大小（px），范围 12-24，默认 14 */
  fontSize: number
  /** 行高，范围 1.0-2.5，默认 1.6 */
  lineHeight: number
  /** 内容区域最大宽度（px），null 表示无限制 */
  contentMaxWidth: number | null
  /** 正文字体（空字符串表示系统默认） */
  fontFamily: string
  /** 代码字体（空字符串表示系统等宽） */
  codeFontFamily: string
}
