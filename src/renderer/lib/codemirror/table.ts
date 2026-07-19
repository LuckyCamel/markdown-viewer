import { EditorState } from '@codemirror/state'
import { EditorView, KeyBinding } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'

/**
 * 表格单元格元数据
 */
export interface TableCell {
  /** 去首尾空格的单元格内容 */
  content: string
  /** 单元格原始文本（含首尾空格） */
  rawContent: string
  from: number
  to: number
}

/**
 * 表格行元数据
 */
export interface TableRow {
  cells: TableCell[]
  from: number
  to: number
}

/**
 * 解析后的 Markdown 表格
 */
export interface ParsedTable {
  header: TableRow
  separator: { from: number; to: number }
  rows: TableRow[]
  from: number
  to: number
}

const TABLE_SEPARATOR_REGEX = /^\s*\|(\s*:?-+:?)((?:\s*\|\s*:?-+:?)*)\s*\|\s*$/

/**
 * 按行解析表格文本，返回相对位置信息
 *
 * @param text - 表格完整文本
 * @param base - 表格在文档中的起始位置
 */
function parseTableRows(text: string, base: number): ParsedTable | null {
  const rawLines = text.split('\n')
  if (rawLines.length < 2) return null

  const lines = rawLines.map((line, index) => ({
    text: line,
    from: base + rawLines.slice(0, index).reduce((sum, l) => sum + l.length + 1, 0),
  }))

  const headerIndex = 0
  const separatorIndex = lines.findIndex(
    (line, index) => index > 0 && TABLE_SEPARATOR_REGEX.test(line.text),
  )
  if (separatorIndex === -1) return null

  const headerLine = lines[headerIndex]
  const separatorLine = lines[separatorIndex]
  const dataLines = lines.slice(separatorIndex + 1)

  const headerCells = parseRowCells(headerLine.text, headerLine.from)
  const colCount = headerCells.length
  if (colCount < 2) return null

  const rows: TableRow[] = []
  for (const line of dataLines) {
    if (line.text.trim() === '') continue
    const cells = parseRowCells(line.text, line.from)
    rows.push({
      cells: cells.slice(0, colCount),
      from: line.from,
      to: line.from + line.text.length,
    })
  }

  return {
    header: {
      cells: headerCells,
      from: headerLine.from,
      to: headerLine.from + headerLine.text.length,
    },
    separator: { from: separatorLine.from, to: separatorLine.from + separatorLine.text.length },
    rows,
    from: base,
    to: base + text.length,
  }
}

/**
 * 解析单行单元格
 *
 * @param line - 行文本
 * @param base - 行在文档中的起始位置
 */
function parseRowCells(line: string, base: number): TableCell[] {
  const trimmed = line.trim()
  const content = trimmed.startsWith('|') ? trimmed.slice(1) : trimmed
  const cells = content.split('|')
  const result: TableCell[] = []
  let offset = base + (trimmed.startsWith('|') ? 1 : 0)

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]
    const from = offset
    const to = offset + cell.length
    // 过滤行尾因 `|` 结束而产生的空单元格
    if (i === cells.length - 1 && cell.trim() === '') {
      break
    }
    result.push({ content: cell.trim(), rawContent: cell, from, to })
    offset = to + 1
  }

  return result
}

/**
 * 向上遍历语法树查找 Table 节点
 *
 * @param state - 编辑器状态
 * @param pos - 文档位置
 */
function findTableNode(state: EditorState, pos: number): { from: number; to: number } | null {
  const tree = syntaxTree(state)
  let node = tree.resolveInner(pos, -1)
  while (node) {
    if (node.name === 'Table') {
      return { from: node.from, to: node.to }
    }
    if (node.parent) {
      node = node.parent
    } else {
      break
    }
  }
  return null
}

/**
 * 解析光标所在表格
 *
 * @param state - 编辑器状态
 * @param pos - 文档位置
 */
export function parseTableAt(state: EditorState, pos: number): ParsedTable | null {
  const node = findTableNode(state, pos)
  if (node) {
    const text = state.sliceDoc(node.from, node.to)
    const parsed = parseTableRows(text, node.from)
    if (parsed) return parsed
    // 语法树节点解析失败时继续走正则回退路径
  }

  // 回退：行级正则识别
  const line = state.doc.lineAt(pos)
  if (!line.text.includes('|')) return null

  const startLine = line.number
  const lines: { text: string; from: number }[] = []

  // 向上找表头
  let current = startLine
  while (current >= 1) {
    const l = state.doc.line(current)
    if (!l.text.includes('|')) break
    lines.unshift({ text: l.text, from: l.from })
    current--
  }

  // 向下找数据行
  current = startLine + 1
  while (current <= state.doc.lines) {
    const l = state.doc.line(current)
    if (!l.text.includes('|')) break
    lines.push({ text: l.text, from: l.from })
    current++
  }

  if (lines.length < 2) return null

  // 找分隔线，必须在表头之后
  const sepIndex = lines.findIndex((l, i) => i > 0 && TABLE_SEPARATOR_REGEX.test(l.text))
  if (sepIndex === -1) return null

  const base = lines[0].from
  const text = lines.map((l) => l.text).join('\n')
  return parseTableRows(text, base)
}

/**
 * 判断指定位置是否在表格内
 *
 * @param state - 编辑器状态
 * @param pos - 文档位置
 */
export function isInTable(state: EditorState, pos: number): boolean {
  return parseTableAt(state, pos) !== null
}

/**
 * 定位 pos 在表格中的单元格坐标
 *
 * @param table - 解析后的表格
 * @param pos - 文档位置
 */
export function findCellAt(
  table: ParsedTable,
  pos: number,
): { row: number; col: number; cell: TableCell } | null {
  const allRows = [table.header, ...table.rows]
  for (let row = 0; row < allRows.length; row++) {
    const cells = allRows[row].cells
    for (let col = 0; col < cells.length; col++) {
      const cell = cells[col]
      if (pos >= cell.from && pos <= cell.to) {
        return { row, col, cell }
      }
    }
  }
  return null
}

/**
 * 生成对齐的分隔线
 *
 * @param colCount - 列数
 */
function buildSeparator(colCount: number): string {
  return Array(colCount).fill('|---').join('') + '|\n'
}

/**
 * 在光标处插入指定大小的 Markdown 表格
 *
 * @param view - CodeMirror 视图
 * @param rows - 数据行数（不含表头）
 * @param cols - 列数
 */
export function insertTableWithSize(view: EditorView, rows: number, cols: number): void {
  const { from } = view.state.selection.main
  const headerCells = Array(cols)
    .fill('Column')
    .map((c, i) => `${c} ${i + 1}`)
  const headerLine = `| ${headerCells.join(' | ')} |\n`
  const separator = buildSeparator(cols)
  const dataLines = Array(rows)
    .fill(0)
    .map(() => `| ${Array(cols).fill(' ').join(' | ')} |\n`)
    .join('')

  const insertText = `\n${headerLine}${separator}${dataLines}`
  const firstCellPos = from + insertText.indexOf('Column 1')

  view.dispatch({
    changes: { from, to: from, insert: insertText },
    selection: { anchor: firstCellPos, head: firstCellPos },
  })
}

/**
 * 在当前表格行下方插入一行空数据行
 *
 * @param view - CodeMirror 视图
 */
export function insertTableRow(view: EditorView): boolean {
  const table = parseTableAt(view.state, view.state.selection.main.head)
  if (!table) return false

  const pos = view.state.selection.main.head
  const cell = findCellAt(table, pos)
  const rowIndex = cell ? cell.row : table.rows.length + 1

  let targetRow: TableRow
  if (rowIndex <= 0) {
    targetRow = table.header
  } else if (rowIndex - 1 < table.rows.length) {
    targetRow = table.rows[rowIndex - 1]
  } else {
    targetRow = table.rows[table.rows.length - 1] ?? table.header
  }

  const colCount = table.header.cells.length
  const insertText = `\n| ${Array(colCount).fill(' ').join(' | ')} |`
  const insertPos = targetRow.to

  view.dispatch({
    changes: { from: insertPos, to: insertPos, insert: insertText },
    selection: { anchor: insertPos + 3, head: insertPos + 3 },
  })

  return true
}

/**
 * 删除当前空数据行；若仅剩表头则删除整个表格
 *
 * @param view - CodeMirror 视图
 */
export function deleteTableRow(view: EditorView): boolean {
  const table = parseTableAt(view.state, view.state.selection.main.head)
  if (!table) return false

  const pos = view.state.selection.main.head
  const cell = findCellAt(table, pos)
  if (!cell) return false

  const rowIndex = cell.row
  // row=0 是表头，不在删除范围内
  if (rowIndex === 0) return false

  const dataRowIndex = rowIndex - 1
  const row = table.rows[dataRowIndex]
  if (!row) return false

  // 仅当整行内容为空时删除
  const rowContent = row.cells.map((c) => c.rawContent).join('')
  if (rowContent.trim() !== '') return false

  if (table.rows.length === 1) {
    // 删除整个表格
    view.dispatch({
      changes: { from: table.from, to: table.to, insert: '' },
      selection: { anchor: table.from, head: table.from },
    })
  } else {
    // 删除当前数据行（包括前导换行）
    const from = row.from > table.separator.to ? row.from - 1 : row.from
    view.dispatch({
      changes: { from, to: row.to, insert: '' },
      selection: { anchor: from, head: from },
    })
  }

  return true
}

/**
 * 在表格单元格之间移动光标
 *
 * @param view - CodeMirror 视图
 * @param direction - 1 为下一单元格，-1 为上一单元格
 */
export function moveCell(view: EditorView, direction: 1 | -1): boolean {
  const table = parseTableAt(view.state, view.state.selection.main.head)
  if (!table) return false

  const pos = view.state.selection.main.head
  const cell = findCellAt(table, pos)
  if (!cell) return false

  const allRows = [table.header, ...table.rows]
  const totalCells = allRows.reduce((sum, row) => sum + row.cells.length, 0)
  const flatIndex =
    allRows.slice(0, cell.row).reduce((sum, row) => sum + row.cells.length, 0) + cell.col
  const nextIndex = flatIndex + direction

  if (nextIndex < 0 || nextIndex >= totalCells) {
    if (direction === 1) {
      // 到末尾，新增一行并跳到新行首单元格
      insertTableRow(view)
      return true
    }
    return false
  }

  let targetCell: TableCell | null = null
  let accumulated = 0
  for (const row of allRows) {
    if (nextIndex < accumulated + row.cells.length) {
      targetCell = row.cells[nextIndex - accumulated]
      break
    }
    accumulated += row.cells.length
  }

  if (!targetCell) return false

  const trimmedContent = targetCell.rawContent.trimStart()
  const leadingSpaces = targetCell.rawContent.length - trimmedContent.length
  // 空单元格无文本可定位，落到单元格内第一个空格，避免停在 '|' 边界上
  const contentStart = targetCell.from + (trimmedContent.length > 0 ? leadingSpaces : 1)
  view.dispatch({
    selection: { anchor: contentStart, head: contentStart },
  })

  return true
}

/**
 * CodeMirror 表格编辑 keymap
 */
export const tableKeymap: KeyBinding[] = [
  {
    key: 'Tab',
    run: (view) => moveCell(view, 1),
  },
  {
    key: 'Shift-Tab',
    run: (view) => moveCell(view, -1),
  },
  {
    key: 'Enter',
    run: (view) => {
      if (!isInTable(view.state, view.state.selection.main.head)) return false
      return insertTableRow(view)
    },
  },
  {
    key: 'Backspace',
    run: (view) => {
      const pos = view.state.selection.main.head
      if (!isInTable(view.state, pos)) return false
      return deleteTableRow(view)
    },
  },
]
