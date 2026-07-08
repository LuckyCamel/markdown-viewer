/** 与 Rust SettingsState 默认配置保持一致 */
export const DEFAULT_IGNORE_LIST = ['.git', 'node_modules', '__pycache__', '.DS_Store']

export const DEFAULT_MARKDOWN_EXTENSIONS = ['md', 'markdown']

/** 文件树可见条目：目录或 Markdown 文件 */
export function isVisibleFileEntry(entry: { isDirectory: boolean; isMarkdown?: boolean }): boolean {
  return entry.isDirectory || entry.isMarkdown === true
}
