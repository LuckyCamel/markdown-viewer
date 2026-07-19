import { EditorView } from '@codemirror/view'
import { undo as undoCommand, redo as redoCommand } from '@codemirror/commands'

function wrapSelection(view: EditorView, before: string, after: string, placeholder: string) {
  const { from, to } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)
  const text = selected || placeholder
  const insertText = before + text + after
  view.dispatch({
    changes: { from, to, insert: insertText },
    selection: {
      anchor: from + before.length,
      head: from + before.length + text.length,
    },
  })
}

function lineCommand(view: EditorView, prefix: string) {
  const { from, to } = view.state.selection.main
  const lineStart = view.state.doc.lineAt(from).from
  const lineEnd = view.state.doc.lineAt(to).to
  const lineContent = view.state.sliceDoc(lineStart, lineEnd)
  const trimmed = lineContent.trimStart()

  if (trimmed.startsWith(prefix)) {
    const newContent = lineContent.replace(new RegExp(`^\\s*${prefix}`), '')
    view.dispatch({ changes: { from: lineStart, to: lineEnd, insert: newContent } })
  } else {
    const newContent = lineContent.replace(/^(\s*)/, `$1${prefix}`)
    view.dispatch({ changes: { from: lineStart, to: lineEnd, insert: newContent } })
  }
}

export function toggleBold(view: EditorView) {
  wrapSelection(view, '**', '**', 'bold text')
}

export function toggleItalic(view: EditorView) {
  wrapSelection(view, '*', '*', 'italic text')
}

export function toggleStrikethrough(view: EditorView) {
  wrapSelection(view, '~~', '~~', 'strikethrough text')
}

export function toggleInlineCode(view: EditorView) {
  wrapSelection(view, '`', '`', 'code')
}

export function setHeading(view: EditorView, level: number) {
  const prefix = '#'.repeat(level) + ' '
  lineCommand(view, prefix)
}

export function toggleUnorderedList(view: EditorView) {
  lineCommand(view, '- ')
}

export function toggleOrderedList(view: EditorView) {
  const { from } = view.state.selection.main
  const line = view.state.doc.lineAt(from)
  const lineContent = view.state.sliceDoc(line.from, line.to)
  const trimmed = lineContent.trimStart()
  const match = trimmed.match(/^(\d+)\.\s/)

  if (match) {
    const newContent = lineContent.replace(/^\s*\d+\.\s/, '')
    view.dispatch({ changes: { from: line.from, to: line.to, insert: newContent } })
  } else {
    const newContent = lineContent.replace(/^(\s*)/, '$11. ')
    view.dispatch({ changes: { from: line.from, to: line.to, insert: newContent } })
  }
}

export function toggleTaskList(view: EditorView) {
  const { from } = view.state.selection.main
  const line = view.state.doc.lineAt(from)
  const lineContent = view.state.sliceDoc(line.from, line.to)
  const trimmed = lineContent.trimStart()

  if (trimmed.startsWith('- [ ] ')) {
    const newContent = lineContent.replace('- [ ] ', '- [x] ')
    view.dispatch({ changes: { from: line.from, to: line.to, insert: newContent } })
  } else if (trimmed.startsWith('- [x] ')) {
    const newContent = lineContent.replace('- [x] ', '- [ ] ')
    view.dispatch({ changes: { from: line.from, to: line.to, insert: newContent } })
  } else {
    const newContent = lineContent.replace(/^(\s*)/, '$1- [ ] ')
    view.dispatch({ changes: { from: line.from, to: line.to, insert: newContent } })
  }
}

export function toggleBlockquote(view: EditorView) {
  lineCommand(view, '> ')
}

export function insertLink(view: EditorView) {
  wrapSelection(view, '[', '](https://)', 'link text')
}

export function insertImage(view: EditorView) {
  wrapSelection(view, '![', '](image-url)', 'alt text')
}

export function insertHorizontalRule(view: EditorView) {
  const { from } = view.state.selection.main
  const lineStart = view.state.doc.lineAt(from).from
  const lineEnd = view.state.doc.lineAt(from).to
  const lineContent = view.state.sliceDoc(lineStart, lineEnd)

  if (lineContent.trim() === '') {
    view.dispatch({ changes: { from: lineStart, to: lineEnd, insert: '---' } })
  } else {
    const insertText = '\n---\n'
    view.dispatch({
      changes: { from: lineEnd, to: lineEnd, insert: insertText },
      selection: { anchor: lineEnd + insertText.length, head: lineEnd + insertText.length },
    })
  }
}

export function insertCodeBlock(view: EditorView) {
  const { from, to } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)
  const text = selected || 'code'
  const insertText = '\n```\n' + text + '\n```\n'
  view.dispatch({
    changes: { from, to, insert: insertText },
    selection: {
      anchor: from + 4,
      head: from + 4 + text.length,
    },
  })
}

export function undo(view: EditorView) {
  undoCommand(view)
}

export function redo(view: EditorView) {
  redoCommand(view)
}
