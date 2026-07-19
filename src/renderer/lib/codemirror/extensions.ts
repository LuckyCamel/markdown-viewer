import { Extension, EditorSelection, Prec } from '@codemirror/state'
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
// @ts-expect-error lezer-markdown 的 package.json exports 缺少 types 字段，需显式抑制
import { Table } from 'lezer-markdown'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { searchKeymap, search, highlightSelectionMatches } from '@codemirror/search'
import { codemirrorTheme, codemirrorDarkTheme } from './theme'
import { listContinuation } from './listContinuation'
import { pathCompletionExtension } from './pathCompletion'
import { tableKeymap } from './table'
import type { FileEntry } from '../../../shared/types'

interface CreateExtensionsOptions {
  showLineNumbers?: boolean
  readOnly?: boolean
  isDark?: boolean
  /** 当前文件完整路径，传入后启用路径补全 */
  currentFilePath?: string
  /** 列出指定目录的文件条目（异步），用于路径补全 */
  listDirectory?: (dirPath: string) => Promise<FileEntry[]>
}

export function createExtensions(options: CreateExtensionsOptions = {}): Extension[] {
  const {
    showLineNumbers = true,
    readOnly = false,
    isDark = false,
    currentFilePath,
    listDirectory,
  } = options

  const extensions: Extension[] = [
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
    markdown({ extensions: [Table] }),
    closeBrackets(),
    listContinuation,
    Prec.high(keymap.of(tableKeymap)),
  ]

  // 路径补全：仅在提供 currentFilePath 和 listDirectory 时启用
  if (currentFilePath && listDirectory) {
    extensions.push(
      pathCompletionExtension({
        currentFilePath,
        listDirectory,
      }),
    )
  }

  extensions.push(
    showLineNumbers ? lineNumbers() : [],
    highlightActiveLine(),
    highlightActiveLineGutter(),
    isDark ? codemirrorDarkTheme : codemirrorTheme,
    EditorState.readOnly.of(readOnly),
    EditorView.editable.of(!readOnly),
  )

  return extensions
}
