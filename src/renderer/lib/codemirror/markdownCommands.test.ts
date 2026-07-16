import { describe, it, expect, vi } from 'vitest'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { toggleBold, toggleItalic, toggleStrikethrough, toggleInlineCode } from './markdownCommands'

function createView(content: string): EditorView {
  const state = EditorState.create({
    doc: content,
  })
  return new EditorView({ state })
}

describe('markdownCommands', () => {
  it('toggleBold should wrap selection with **', () => {
    const view = createView('hello world')
    view.dispatch({
      selection: { anchor: 0, head: 5 },
    })

    toggleBold(view)

    expect(view.state.doc.toString()).toBe('**hello** world')
  })

  it('toggleBold should add placeholder when nothing selected', () => {
    const view = createView('hello')
    view.dispatch({
      selection: { anchor: 0, head: 0 },
    })

    toggleBold(view)

    expect(view.state.doc.toString()).toBe('**bold text**hello')
  })

  it('toggleItalic should wrap selection with *', () => {
    const view = createView('hello world')
    view.dispatch({
      selection: { anchor: 0, head: 5 },
    })

    toggleItalic(view)

    expect(view.state.doc.toString()).toBe('*hello* world')
  })

  it('toggleStrikethrough should wrap selection with ~~', () => {
    const view = createView('hello world')
    view.dispatch({
      selection: { anchor: 0, head: 5 },
    })

    toggleStrikethrough(view)

    expect(view.state.doc.toString()).toBe('~~hello~~ world')
  })

  it('toggleInlineCode should wrap selection with backticks', () => {
    const view = createView('hello world')
    view.dispatch({
      selection: { anchor: 0, head: 5 },
    })

    toggleInlineCode(view)

    expect(view.state.doc.toString()).toBe('`hello` world')
  })
})
