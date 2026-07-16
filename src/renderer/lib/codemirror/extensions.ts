import { Extension, EditorSelection } from '@codemirror/state'
import { EditorState } from '@codemirror/state'
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
} from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { searchKeymap, search, highlightSelectionMatches } from '@codemirror/search'
import { codemirrorTheme, codemirrorDarkTheme } from './theme'
import { listContinuation } from './listContinuation'

interface CreateExtensionsOptions {
  showLineNumbers?: boolean
  readOnly?: boolean
  isDark?: boolean
}

export function createExtensions(options: CreateExtensionsOptions = {}): Extension[] {
  const { showLineNumbers = true, readOnly = false, isDark = false } = options

  return [
    history(),
    search(),
    highlightSelectionMatches(),
    drawSelection(),
    keymap.of([...defaultKeymap, ...historyKeymap, ...closeBracketsKeymap, ...searchKeymap]),
    keymap.of([indentWithTab]),
    keymap.of([
      {
        key: 'Ctrl-D',
        run: (view) => {
          const state = view.state
          const { from, to } = state.selection.main
          const selectedText = state.sliceDoc(from, to)

          if (!selectedText) {
            return false
          }

          const doc = state.doc.toString()
          const currentEnd = to
          const nextIndex = doc.indexOf(selectedText, currentEnd)

          if (nextIndex === -1) {
            return false
          }

          const newSelection = EditorSelection.create([
            ...state.selection.ranges,
            EditorSelection.range(nextIndex, nextIndex + selectedText.length),
          ])

          view.dispatch({
            selection: newSelection,
            effects: EditorView.scrollIntoView(nextIndex, { y: 'center' }),
          })

          return true
        },
      },
    ]),
    markdown(),
    closeBrackets(),
    listContinuation,
    showLineNumbers ? lineNumbers() : [],
    highlightActiveLine(),
    highlightActiveLineGutter(),
    isDark ? codemirrorDarkTheme : codemirrorTheme,
    EditorState.readOnly.of(readOnly),
    EditorView.editable.of(!readOnly),
  ]
}
