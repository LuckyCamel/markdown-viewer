import { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { createExtensions } from '../../lib/codemirror/extensions'
import { useThemeStore } from '../../stores/useThemeStore'
import { ipc } from '../../lib/ipc'

interface EditorProps {
  value: string
  onChange: (value: string) => void
  showLineNumbers?: boolean
  readOnly?: boolean
  className?: string
  /** 当前文件完整路径，传入后启用路径补全 */
  filePath?: string
  /** 编辑器视图创建或销毁时回调 */
  onViewReady?: (view: EditorView | null) => void
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
  {
    value,
    onChange,
    showLineNumbers = true,
    readOnly = false,
    className = '',
    filePath,
    onViewReady,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const { theme, themeId } = useThemeStore()
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
        ...createExtensions({
          showLineNumbers,
          readOnly,
          isDark,
          currentFilePath: filePath,
          listDirectory: filePath ? (dir: string) => ipc.files.listDirectory(dir) : undefined,
        }),
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
    onViewReady?.(view)

    return () => {
      view.destroy()
      viewRef.current = null
      setIsMounted(false)
      onViewReady?.(null)
    }
    // EditorView 只在挂载时创建一次，后续通过 dispatch/updateValue 同步状态，避免重建导致光标丢失
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        ...createExtensions({
          showLineNumbers,
          readOnly,
          isDark,
          currentFilePath: filePath,
          listDirectory: filePath ? (dir: string) => ipc.files.listDirectory(dir) : undefined,
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString())
          }
        }),
      ],
    })
    view.setState(newState)
  }, [isDark, isMounted, showLineNumbers, readOnly, onChange, filePath])

  return <div ref={containerRef} className={`h-full w-full ${className}`} tabIndex={0} />
})
