/**
 * 性能度量测试数据生成器
 *
 * 生成不同规模的数据集用于批次 0 性能基线度量：
 * - 大 Markdown 文档（1000/5000/10000 行，含代码块/表格/KaTeX/Mermaid）
 * - 大文件目录（1000/5000 个文件）
 *
 * 数据集不写入磁盘，由测试运行时通过 window.__E2E__ 注入 mock IPC。
 */

import type { FileEntry } from '../../../../src/shared/types'

/**
 * 生成指定行数的 Markdown 文档
 *
 * 内容混合：段落 / 标题 / 代码块 / 表格 / KaTeX 公式，模拟真实笔记库。
 * 每 10 行循环一次基础结构，保证规模可控且包含多种渲染路径。
 *
 * @param lines 目标行数
 * @returns Markdown 字符串
 */
export function generateLargeMarkdown(lines: number): string {
  const parts: string[] = []
  // 头部固定一个 H1 + 摘要，避免空文档场景
  parts.push(`# Large Markdown Benchmark (${lines} lines)`)
  parts.push('')
  parts.push(`> 生成于 ${new Date().toISOString()}，用于度量首屏渲染时间。`)
  parts.push('')

  const block = [
    '## Section',
    '',
    '这是一个段落，包含普通文字与 **加粗**、*斜体*、`行内代码`、[链接](https://example.com)。',
    '',
    '- 列表项 1',
    '- 列表项 2',
    '- 列表项 3',
    '',
    '```typescript',
    'function add(a: number, b: number): number {',
    '  return a + b',
    '}',
    'const result = add(1, 2)',
    '```',
    '',
    '| Col1 | Col2 | Col3 |',
    '|------|------|------|',
    '| A    | B    | C    |',
    '| D    | E    | F    |',
    '| G    | H    | I    |',
    '',
    '行内公式 $E = mc^2$ 与块公式：',
    '',
    '$$\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$',
    '',
    '---',
    '',
  ]

  const blockLines = block.length
  const fullBlocks = Math.floor((lines - parts.length - 1) / blockLines)
  for (let i = 0; i < fullBlocks; i++) {
    // 替换 Section 标题以制造结构变化
    const blockWithIndex = block.map((line, idx) => (idx === 0 ? `## Section ${i + 1}` : line))
    parts.push(...blockWithIndex)
  }

  // 补齐到目标行数
  while (parts.length < lines) {
    parts.push(`补齐行 ${parts.length}：普通段落内容。`)
  }

  return parts.slice(0, lines).join('\n')
}

/**
 * 生成指定数量文件的扁平目录 entries
 *
 * 所有文件直接放在 dirPath 下，文件名形如 `file-0001.md`。
 * 用于度量「单层大目录」的 list + 渲染性能。
 *
 * @param dirPath 目录路径
 * @param count 文件数量
 * @param extension 文件扩展名（默认 .md）
 */
export function generateFlatDirectoryEntries(
  dirPath: string,
  count: number,
  extension = '.md',
): FileEntry[] {
  const entries: FileEntry[] = []
  for (let i = 0; i < count; i++) {
    const name = `file-${String(i + 1).padStart(4, '0')}${extension}`
    const path = `${dirPath}/${name}`
    entries.push({
      name,
      path,
      isDirectory: false,
      isHidden: false,
      isMarkdown: extension === '.md' || extension === '.markdown',
      isTextFile: true,
    })
  }
  return entries
}

/**
 * 生成嵌套目录结构（每层 N 个子目录，深度 D）
 *
 * 用于度量「深层嵌套」展开性能。每层目录除子目录外，还包含若干 md 文件。
 *
 * @param rootPath 根目录
 * @param branchingFactor 每层每个父目录的子目录数
 * @param depth 深度（1 = 只有根的子目录）
 * @param filesPerDir 每个目录的文件数
 */
export function generateNestedDirectoryTree(
  rootPath: string,
  branchingFactor: number,
  depth: number,
  filesPerDir: number,
): { entriesByDir: Map<string, FileEntry[]>; allDirs: string[] } {
  const entriesByDir = new Map<string, FileEntry[]>()
  const allDirs: string[] = []

  /**
   * 递归构建目录树
   */
  function buildDir(currentPath: string, currentDepth: number) {
    allDirs.push(currentPath)
    const entries: FileEntry[] = []

    // 先放文件
    for (let i = 0; i < filesPerDir; i++) {
      const name = `file-${String(i + 1).padStart(3, '0')}.md`
      entries.push({
        name,
        path: `${currentPath}/${name}`,
        isDirectory: false,
        isHidden: false,
        isMarkdown: true,
        isTextFile: true,
      })
    }

    // 再放子目录
    if (currentDepth < depth) {
      for (let i = 0; i < branchingFactor; i++) {
        const name = `dir-${String(i + 1).padStart(2, '0')}`
        const childPath = `${currentPath}/${name}`
        entries.push({
          name,
          path: childPath,
          isDirectory: true,
          isHidden: false,
        })
        buildDir(childPath, currentDepth + 1)
      }
    }

    entriesByDir.set(currentPath, entries)
  }

  buildDir(rootPath, 0)
  return { entriesByDir, allDirs }
}
