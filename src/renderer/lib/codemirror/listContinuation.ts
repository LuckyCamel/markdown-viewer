import { EditorView } from '@codemirror/view'

export interface ListLineResult {
  indent: string
  prefix: string
}

export function parseListLine(lineContent: string): ListLineResult | null {
  const taskMatch = lineContent.match(/^(\s*)([-*+])\s*\[([ xX])\]\s/)
  if (taskMatch) {
    return { indent: taskMatch[1], prefix: taskMatch[2] + ' [ ] ' }
  }

  const orderedMatch = lineContent.match(/^(\s*)(\d+)\.\s/)
  if (orderedMatch) {
    const num = parseInt(orderedMatch[2], 10)
    return { indent: orderedMatch[1], prefix: num + 1 + '. ' }
  }

  const unorderedMatch = lineContent.match(/^(\s*)([-*+])\s/)
  if (unorderedMatch) {
    return { indent: unorderedMatch[1], prefix: unorderedMatch[2] + ' ' }
  }

  return null
}

export const listContinuation = EditorView.inputHandler.of((view, from, to, insert) => {
  if (insert !== '\n') {
    return false
  }

  const state = view.state
  const line = state.doc.lineAt(from)
  const lineContent = line.text

  const result = parseListLine(lineContent)
  if (result) {
    view.dispatch({
      changes: { from, to, insert: '\n' + result.indent + result.prefix },
    })
    return true
  }

  return false
})
