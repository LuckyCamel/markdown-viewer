import { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { createExtensions } from '../../lib/codemirror/extensions'
import { useUIStore } from '../../stores/useUIStore'

interface EditorProps {
  value: string
  onChange: (value: string) => void
  showLineNumbers?: boolean
  readOnly?: boolean
  className?: string
}

interface EditorHandle {
  view: EditorView | null
}

/**
 * CodeMirror 6 编辑器组件
 *
 * 封装 CodeMirror 6 的 EditorView，提供受控模式接口。
 * 外部值变化时仅在失焦时同步，避免编辑冲突。
 */
export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { value, onChange, showLineNumbers = true, readOnly = false, className = '' },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const { theme, themeId } = useUIStore()
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) ||
    (!!themeId && themeId.startsWith('dark'))

  useImperativeHandle(ref, () => ({
    get view() {
      return viewRef.current
    },
  }))

  const updateValue = useCallback(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      })
    }
  }, [value])

  useEffect(() => {
    if (!containerRef.current) return

    const state = EditorState.create({
      doc: value,
      extensions: [
        ...createExtensions({ showLineNumbers, readOnly, isDark }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString())
          }
        }),
      ],
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })
    viewRef.current = view
    setIsMounted(true)

    return () => {
      view.destroy()
      viewRef.current = null
      setIsMounted(false)
    }
  }, [])

  useEffect(() => {
    if (!isMounted) return
    const view = viewRef.current
    if (!view) return
    if (view.hasFocus) return
    updateValue()
  }, [value, isMounted, updateValue])

  useEffect(() => {
    if (!isMounted) return
    const view = viewRef.current
    if (!view) return
    const newState = EditorState.create({
      doc: view.state.doc,
      selection: view.state.selection,
      extensions: [
        ...createExtensions({ showLineNumbers, readOnly, isDark }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString())
          }
        }),
      ],
    })
    view.setState(newState)
  }, [isDark, isMounted, showLineNumbers, readOnly, onChange])

  return <div ref={containerRef} className={`h-full w-full ${className}`} tabIndex={0} />
})
