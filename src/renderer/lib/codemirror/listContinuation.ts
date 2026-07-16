import { EditorView } from '@codemirror/view'

export const listContinuation = EditorView.inputHandler.of((view, from, to, insert) => {
  if (insert !== '\n') {
    return false
  }

  const state = view.state
  const line = state.doc.lineAt(from)
  const lineContent = line.text

  const unorderedMatch = lineContent.match(/^(\s*)([-*+])\s/)
  if (unorderedMatch) {
    const indent = unorderedMatch[1]
    const bullet = unorderedMatch[2]
    view.dispatch({
      changes: { from, to, insert: '\n' + indent + bullet + ' ' },
    })
    return true
  }

  const orderedMatch = lineContent.match(/^(\s*)(\d+)\.\s/)
  if (orderedMatch) {
    const indent = orderedMatch[1]
    const num = parseInt(orderedMatch[2], 10)
    view.dispatch({
      changes: { from, to, insert: '\n' + indent + (num + 1) + '. ' },
    })
    return true
  }

  const taskMatch = lineContent.match(/^(\s*)([-*+])\s*\[([ xX])\]\s/)
  if (taskMatch) {
    const indent = taskMatch[1]
    const bullet = taskMatch[2]
    view.dispatch({
      changes: { from, to, insert: '\n' + indent + bullet + ' [ ] ' },
    })
    return true
  }

  return false
})
