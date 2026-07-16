import { describe, it, expect } from 'vitest'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import {
  toggleBold,
  toggleItalic,
  toggleStrikethrough,
  toggleInlineCode,
  setHeading,
  toggleUnorderedList,
  toggleOrderedList,
  toggleTaskList,
  toggleBlockquote,
  insertLink,
  insertImage,
  insertHorizontalRule,
  insertTable,
  insertCodeBlock,
} from './markdownCommands'

function createView(content: string, from = 0, to = from): EditorView {
  const state = EditorState.create({
    doc: content,
    selection: { anchor: from, head: to },
  })
  return new EditorView({ state })
}

describe('markdownCommands', () => {
  it('toggleBold should wrap selection with **', () => {
    const view = createView('hello world', 0, 5)
    toggleBold(view)
    expect(view.state.doc.toString()).toBe('**hello** world')
  })

  it('toggleBold should add placeholder when nothing selected', () => {
    const view = createView('hello', 0, 0)
    toggleBold(view)
    expect(view.state.doc.toString()).toBe('**bold text**hello')
  })

  it('toggleItalic should wrap selection with *', () => {
    const view = createView('hello world', 0, 5)
    toggleItalic(view)
    expect(view.state.doc.toString()).toBe('*hello* world')
  })

  it('toggleStrikethrough should wrap selection with ~~', () => {
    const view = createView('hello world', 0, 5)
    toggleStrikethrough(view)
    expect(view.state.doc.toString()).toBe('~~hello~~ world')
  })

  it('toggleInlineCode should wrap selection with backticks', () => {
    const view = createView('hello world', 0, 5)
    toggleInlineCode(view)
    expect(view.state.doc.toString()).toBe('`hello` world')
  })

  it('setHeading should prefix line with # level', () => {
    const view = createView('title', 0, 0)
    setHeading(view, 2)
    expect(view.state.doc.toString()).toBe('## title')
  })

  it('setHeading should remove prefix when already same level', () => {
    const view = createView('## title', 0, 0)
    setHeading(view, 2)
    expect(view.state.doc.toString()).toBe('title')
  })

  it('toggleUnorderedList should add - prefix', () => {
    const view = createView('item', 0, 0)
    toggleUnorderedList(view)
    expect(view.state.doc.toString()).toBe('- item')
  })

  it('toggleUnorderedList should remove - prefix when present', () => {
    const view = createView('- item', 0, 0)
    toggleUnorderedList(view)
    expect(view.state.doc.toString()).toBe('item')
  })

  it('toggleOrderedList should add 1. prefix', () => {
    const view = createView('item', 0, 0)
    toggleOrderedList(view)
    expect(view.state.doc.toString()).toBe('1. item')
  })

  it('toggleOrderedList should remove numbered prefix when present', () => {
    const view = createView('2. item', 0, 0)
    toggleOrderedList(view)
    expect(view.state.doc.toString()).toBe('item')
  })

  it('toggleTaskList should add unchecked task', () => {
    const view = createView('task', 0, 0)
    toggleTaskList(view)
    expect(view.state.doc.toString()).toBe('- [ ] task')
  })

  it('toggleTaskList should check unchecked task', () => {
    const view = createView('- [ ] task', 0, 0)
    toggleTaskList(view)
    expect(view.state.doc.toString()).toBe('- [x] task')
  })

  it('toggleTaskList should uncheck checked task', () => {
    const view = createView('- [x] task', 0, 0)
    toggleTaskList(view)
    expect(view.state.doc.toString()).toBe('- [ ] task')
  })

  it('toggleBlockquote should add > prefix', () => {
    const view = createView('quote', 0, 0)
    toggleBlockquote(view)
    expect(view.state.doc.toString()).toBe('> quote')
  })

  it('insertLink should wrap selection as markdown link', () => {
    const view = createView('hello', 0, 5)
    insertLink(view)
    expect(view.state.doc.toString()).toBe('[hello](https://)')
  })

  it('insertImage should wrap selection as markdown image', () => {
    const view = createView('alt', 0, 3)
    insertImage(view)
    expect(view.state.doc.toString()).toBe('![alt](image-url)')
  })

  it('insertHorizontalRule should insert --- on empty line', () => {
    const view = createView('', 0, 0)
    insertHorizontalRule(view)
    expect(view.state.doc.toString()).toBe('---')
  })

  it('insertHorizontalRule should append after non-empty line', () => {
    const view = createView('text', 0, 0)
    insertHorizontalRule(view)
    expect(view.state.doc.toString()).toBe('text\n---\n')
  })

  it('insertTable should insert table skeleton', () => {
    const view = createView('', 0, 0)
    insertTable(view)
    expect(view.state.doc.toString()).toContain('| Column 1 | Column 2 |')
    expect(view.state.doc.toString()).toContain('|----------|----------|')
  })

  it('insertCodeBlock should wrap selection in fence', () => {
    const view = createView('code', 0, 4)
    insertCodeBlock(view)
    expect(view.state.doc.toString()).toBe('\n```\ncode\n```\n')
  })
})
