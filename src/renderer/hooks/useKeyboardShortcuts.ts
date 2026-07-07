import { useEffect, useRef } from 'react'
import { useTabStore } from '../features/tabs/useTabStore'

interface ShortcutHandlers {
  onOpenFolder: () => void
  onToggleSidebar: () => void
  onToggleOutline: () => void
  onOpenFileSearch: () => void
  onOpenContentSearch: () => void
  onToggleSettings: () => void
}

/**
 * 键盘快捷键 Hook，替代原生菜单功能
 *
 * 快捷键映射：
 * - Ctrl+Shift+O: 打开文件夹
 * - Ctrl+B: 切换侧边栏
 * - Ctrl+Shift+L: 切换大纲
 * - Ctrl+P: 文件搜索
 * - Ctrl+Shift+F: 内容搜索
 * - Ctrl+,: 设置
 * - Ctrl+W: 关闭当前标签
 * - Ctrl+Tab: 下一个标签
 * - Ctrl+Shift+Tab: 上一个标签
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey

      if (!ctrl) return

      const key = e.key.toLowerCase()

      if (ctrl && key === 'p' && !e.shiftKey) {
        e.preventDefault()
        handlersRef.current.onOpenFileSearch()
        return
      }

      if (ctrl && key === 'f' && e.shiftKey) {
        e.preventDefault()
        handlersRef.current.onOpenContentSearch()
        return
      }

      if (ctrl && key === 'b') {
        e.preventDefault()
        handlersRef.current.onToggleSidebar()
        return
      }

      if (ctrl && key === 'l' && e.shiftKey) {
        e.preventDefault()
        handlersRef.current.onToggleOutline()
        return
      }

      if (ctrl && key === 'o' && e.shiftKey) {
        e.preventDefault()
        handlersRef.current.onOpenFolder()
        return
      }

      if (ctrl && key === ',') {
        e.preventDefault()
        handlersRef.current.onToggleSettings()
        return
      }

      if (ctrl && key === 'w') {
        e.preventDefault()
        const state = useTabStore.getState()
        if (state.activeFile) {
          state.closeFile(state.activeFile)
        }
        return
      }

      if (ctrl && key === 'tab') {
        e.preventDefault()
        const state = useTabStore.getState()
        if (state.openFiles.length < 2) return
        const idx = state.openFiles.indexOf(state.activeFile ?? '')
        const next = e.shiftKey
          ? (idx - 1 + state.openFiles.length) % state.openFiles.length
          : (idx + 1) % state.openFiles.length
        state.setActive(state.openFiles[next])
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
