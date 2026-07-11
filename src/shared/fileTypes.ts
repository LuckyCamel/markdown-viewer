/**
 * 文件扩展名到 highlight.js 语言名的映射
 * 覆盖 25+ 种主流编程语言和配置格式
 */
export const CODE_EXTENSIONS: Record<string, string> = {
  // JavaScript / TypeScript
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',

  // Python
  py: 'python',
  pyw: 'python',
  pyi: 'python',

  // Shell / Bash
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',

  // JSON / 数据格式
  json: 'json',
  jsonc: 'json',

  // Markdown
  md: 'markdown',
  markdown: 'markdown',
  mkd: 'markdown',

  // HTML / XML
  html: 'xml',
  htm: 'xml',
  xml: 'xml',
  svg: 'xml',
  vue: 'xml',

  // CSS / 样式
  css: 'css',
  scss: 'scss',
  less: 'less',

  // YAML / TOML / INI
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'ini',
  ini: 'ini',
  cfg: 'ini',

  // SQL
  sql: 'sql',

  // Go
  go: 'go',

  // Rust
  rs: 'rust',
  rust: 'rust',

  // Java
  java: 'java',

  // C / C++
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  hh: 'cpp',

  // C#
  cs: 'csharp',
  csx: 'csharp',

  // PHP
  php: 'php',
  phtml: 'php',

  // Ruby
  rb: 'ruby',
  ruby: 'ruby',

  // Swift
  swift: 'swift',

  // Kotlin
  kt: 'kotlin',
  kts: 'kotlin',

  // Dart
  dart: 'dart',

  // Docker
  dockerfile: 'dockerfile',

  // Makefile
  mk: 'makefile',
  mak: 'makefile',

  // Lua
  lua: 'lua',

  // Perl
  pl: 'perl',
  pm: 'perl',

  // R
  r: 'r',
  R: 'r',

  // Scala
  scala: 'scala',

  // Haskell
  hs: 'haskell',
  lhs: 'haskell',

  // 纯文本
  txt: 'plaintext',
}

/** 无扩展名但可识别的文件名映射 */
export const CODE_FILENAMES: Record<string, string> = {
  Makefile: 'makefile',
  makefile: 'makefile',
  Dockerfile: 'dockerfile',
  '.dockerignore': 'plaintext',
  '.gitignore': 'plaintext',
  '.env': 'plaintext',
  LICENSE: 'plaintext',
  README: 'markdown',
}

/** Markdown 文件扩展名列表 */
export const MARKDOWN_EXTS = ['md', 'markdown', 'mkd']

/**
 * 从文件路径中提取扩展名（不含点，小写）
 */
export function getExtension(path: string): string {
  const basename = path.split(/[\\/]/).pop() ?? ''
  const idx = basename.lastIndexOf('.')
  return idx > 0 ? basename.slice(idx + 1).toLowerCase() : ''
}

/**
 * 从文件路径中提取基础文件名（不含目录）
 */
export function getBasename(path: string): string {
  return path.split(/[\\/]/).pop() ?? ''
}

/**
 * 判断是否为 Markdown 文件
 */
export function isMarkdownFile(path: string): boolean {
  const ext = getExtension(path)
  if (MARKDOWN_EXTS.includes(ext)) return true
  const basename = getBasename(path)
  return CODE_FILENAMES[basename] === 'markdown'
}

/**
 * 获取文件对应的 highlight.js 语言名
 * 返回 null 表示未知/不支持的文件类型
 */
export function getHighlightLanguage(path: string): string | null {
  const ext = getExtension(path)
  if (ext && ext in CODE_EXTENSIONS) {
    return CODE_EXTENSIONS[ext]
  }
  const basename = getBasename(path)
  if (basename in CODE_FILENAMES) {
    return CODE_FILENAMES[basename]
  }
  return null
}

/**
 * 判断是否为可高亮的代码/文本文件
 */
export function isCodeFile(path: string): boolean {
  return getHighlightLanguage(path) !== null
}

/**
 * 判断是否为文本文件（可在应用中打开浏览）
 * 包含 Markdown 文件和所有代码文件
 */
export function isTextFile(path: string): boolean {
  return isMarkdownFile(path) || isCodeFile(path)
}
