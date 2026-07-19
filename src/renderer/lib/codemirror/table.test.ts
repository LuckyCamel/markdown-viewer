import { describe, it, expect } from 'vitest'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { markdown } from '@codemirror/lang-markdown'
import { Table } from 'lezer-markdown'
import {
  parseTableAt,
  isInTable,
  findCellAt,
  insertTableWithSize,
  insertTableRow,
  deleteTableRow,
  moveCell,
} from './table'

function createState(doc: string, selection = 0) {
  return EditorState.create({
    doc,
    selection: { anchor: selection, head: selection },
    extensions: [markdown({ extensions: [Table] })],
  })
}

function createView(doc: string, selection = 0) {
  const state = createState(doc, selection)
  return new EditorView({ state })
}

describe('parseTableAt', () => {
  it('解析标准 Markdown 表格', () => {
    const doc = '| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |'
    const state = createState(doc, doc.indexOf('1'))
    const table = parseTableAt(state, doc.indexOf('1'))

    expect(table).not.toBeNull()
    expect(table!.header.cells.map((c) => c.content)).toEqual(['A', 'B'])
    expect(table!.rows).toHaveLength(2)
    expect(table!.rows[0].cells.map((c) => c.content)).toEqual(['1', '2'])
    expect(table!.rows[1].cells.map((c) => c.content)).toEqual(['3', '4'])
  })

  it('含空单元格的表格', () => {
    const doc = '| A | B | C |\n|---|---|---|\n| 1 |   | 3 |'
    const state = createState(doc, doc.indexOf('1'))
    const table = parseTableAt(state, doc.indexOf('1'))

    expect(table).not.toBeNull()
    expect(table!.header.cells.map((c) => c.content)).toEqual(['A', 'B', 'C'])
    expect(table!.rows[0].cells.map((c) => c.content)).toEqual(['1', '', '3'])
  })

  it('不在表格内返回 null', () => {
    const doc = 'This is just a paragraph.'
    const state = createState(doc, 5)
    expect(parseTableAt(state, 5)).toBeNull()
  })

  it('表格前有其他文本也能正确解析', () => {
    const doc = 'Some text\n\n| A | B |\n|---|---|\n| x | y |\n'
    const pos = doc.lastIndexOf('x')
    const state = createState(doc, pos)
    const table = parseTableAt(state, pos)

    expect(table).not.toBeNull()
    expect(table!.header.cells.map((c) => c.content)).toEqual(['A', 'B'])
    expect(table!.rows[0].cells.map((c) => c.content)).toEqual(['x', 'y'])
  })
})

describe('isInTable', () => {
  it('光标在表格内返回 true', () => {
    const doc = '| A | B |\n|---|---|\n| 1 | 2 |'
    const state = createState(doc, doc.indexOf('1'))
    expect(isInTable(state, doc.indexOf('1'))).toBe(true)
  })

  it('光标在表格外返回 false', () => {
    const doc = 'Just text\n| A | B |\n|---|---|\n| 1 | 2 |'
    const state = createState(doc, 3)
    expect(isInTable(state, 3)).toBe(false)
  })
})

describe('findCellAt', () => {
  it('定位首单元格', () => {
    const doc = '| A | B |\n|---|---|\n| 1 | 2 |'
    const state = createState(doc, doc.indexOf('A') + 1)
    const table = parseTableAt(state, doc.indexOf('A') + 1)!
    const cell = findCellAt(table, doc.indexOf('A') + 1)

    expect(cell).not.toBeNull()
    expect(cell!.row).toBe(0)
    expect(cell!.col).toBe(0)
  })

  it('定位数据行单元格', () => {
    const doc = '| A | B | C |\n|---|---|---|\n| 1 | 2 | 3 |'
    const pos = doc.indexOf('2')
    const state = createState(doc, pos)
    const table = parseTableAt(state, pos)!
    const cell = findCellAt(table, pos)

    expect(cell).not.toBeNull()
    expect(cell!.row).toBe(1)
    expect(cell!.col).toBe(1)
    expect(cell!.cell.content).toBe('2')
  })
})

describe('insertTableWithSize', () => {
  it('插入 2x2 表格', () => {
    const view = createView('', 0)
    insertTableWithSize(view, 2, 2)

    const result = view.state.doc.toString()
    expect(result).toContain('| Column 1 | Column 2 |')
    expect(result).toContain('|---|---|')
    expect(result.split('\n').filter((l) => l.startsWith('|'))).toHaveLength(4)
  })

  it('插入 3x4 表格', () => {
    const view = createView('existing\n', 9)
    insertTableWithSize(view, 3, 4)

    const result = view.state.doc.toString()
    expect(result).toContain('| Column 1 | Column 2 | Column 3 | Column 4 |')
    const tableLines = result.split('\n').filter((l) => l.startsWith('|'))
    expect(tableLines).toHaveLength(5)
  })
})

describe('insertTableRow', () => {
  it('在当前行下方新增一行', () => {
    const doc = '| A | B |\n|---|---|\n| 1 | 2 |'
    const view = createView(doc, doc.indexOf('1'))
    const result = insertTableRow(view)

    expect(result).toBe(true)
    const lines = view.state.doc.toString().split('\n')
    expect(lines).toHaveLength(4)
    expect(lines[3]).toMatch(/^\|\s+\|\s+\|$/)
  })
})

describe('deleteTableRow', () => {
  it('删除空数据行', () => {
    const doc = '| A | B |\n|---|---|\n| 1 | 2 |\n|   |   |'
    const pos = doc.lastIndexOf('|   |   |') + 1
    const view = createView(doc, pos)
    const result = deleteTableRow(view)

    expect(result).toBe(true)
    const lines = view.state.doc.toString().split('\n')
    expect(lines).toHaveLength(3)
  })

  it('仅剩一行数据时删除整个表格', () => {
    const doc = '| A | B |\n|---|---|\n|   |   |'
    const pos = doc.lastIndexOf('|   |   |') + 1
    const view = createView(doc, pos)
    const result = deleteTableRow(view)

    expect(result).toBe(true)
    expect(view.state.doc.toString()).toBe('')
  })

  it('非空行不删除', () => {
    const doc = '| A | B |\n|---|---|\n| 1 | 2 |'
    const view = createView(doc, doc.indexOf('1'))
    const result = deleteTableRow(view)

    expect(result).toBe(false)
  })
})

describe('moveCell', () => {
  it('Tab 跳到下一单元格', () => {
    const doc = '| A | B |\n|---|---|\n| 1 | 2 |'
    const view = createView(doc, doc.indexOf('1'))
    const result = moveCell(view, 1)

    expect(result).toBe(true)
    const pos = view.state.selection.main.head
    expect(view.state.doc.toString().slice(pos, pos + 1)).toBe('2')
  })

  it('Tab 到末尾时新增一行', () => {
    const doc = '| A | B |\n|---|---|\n| 1 | 2 |'
    const view = createView(doc, doc.indexOf('2'))
    const result = moveCell(view, 1)

    expect(result).toBe(true)
    const lines = view.state.doc.toString().split('\n')
    expect(lines).toHaveLength(4)
  })
})

describe('E2E 场景回归', () => {
  it('表格前有文本时 Tab 导航到空数据行', () => {
    const doc = '# Note\n| Column 1 | Column 2 |\n|---|---|\n|   |   |\n|   |   |'
    const view = createView(doc, doc.indexOf('Column 1'))

    // Tab 到 Column 2
    moveCell(view, 1)
    let pos = view.state.selection.main.head
    expect(view.state.doc.toString().slice(pos, pos + 1)).toBe('C')

    // Tab 到第一行数据首单元格
    moveCell(view, 1)
    pos = view.state.selection.main.head
    const table = parseTableAt(view.state, pos)
    expect(table).not.toBeNull()
    const cell = findCellAt(table!, pos)
    expect(cell).not.toBeNull()
    expect(cell!.row).toBe(1)
    expect(cell!.col).toBe(0)

    const text = view.state.doc.toString()
    expect(text.slice(pos, pos + 1)).toBe(' ')

    // 输入标记
    view.dispatch({
      changes: { from: pos, to: pos, insert: 'row2col1' },
      selection: { anchor: pos + 8, head: pos + 8 },
    })
    expect(view.state.doc.toString()).toContain('row2col1')
  })

  it('表格前有文本时 Backspace 删除仅剩的空数据行', () => {
    const doc = '# Note\n| Column 1 | Column 2 |\n|---|---|\n|   |   |'
    const view = createView(doc, doc.indexOf('Column 1'))

    moveCell(view, 1)
    moveCell(view, 1)

    const result = deleteTableRow(view)
    expect(result).toBe(true)
    expect(view.state.doc.toString()).toBe('# Note\n')
  })
})
