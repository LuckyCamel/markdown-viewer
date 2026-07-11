/** 与 Rust SettingsState 默认配置保持一致 */
export const DEFAULT_IGNORE_LIST = ['.git', 'node_modules', '__pycache__', '.DS_Store']

export const DEFAULT_MARKDOWN_EXTENSIONS = ['md', 'markdown']

/**
 * 文件树可见条目：目录或文本文件（Markdown + 代码文件）
 * 兼容旧字段 isMarkdown，同时支持新字段 isTextFile
 */
export function isVisibleFileEntry(entry: {
  isDirectory: boolean
  isMarkdown?: boolean
  isTextFile?: boolean
}): boolean {
  if (entry.isDirectory) return true
  if (entry.isTextFile !== undefined) return entry.isTextFile
  return entry.isMarkdown === true
}
