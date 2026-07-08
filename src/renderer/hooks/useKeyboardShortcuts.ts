import { useEffect, useRef, useState } from 'react'
import { useTabStore } from '../features/tabs/useTabStore'
import {
  DEFAULT_SHORTCUTS,
  loadShortcuts,
  type ShortcutAction,
  type ShortcutConfig,
} from '../lib/shortcuts'
import { logError } from '../logger'

interface ShortcutHandlers {
  onOpenFolder: () => void
  onToggleSidebar: () => void
  onToggleOutline: () => void
  onOpenFileSearch: () => void
  onOpenContentSearch: () => void
  onToggleSettings: () => void
}

type HandlerAction =
  | 'openFolder'
  | 'toggleSidebar'
  | 'toggleOutline'
  | 'openFileSearch'
  | 'openContentSearch'
  | 'toggleSettings'

const ACTION_TO_HANDLER: Record<HandlerAction, keyof ShortcutHandlers> = {
  openFolder: 'onOpenFolder',
  toggleSidebar: 'onToggleSidebar',
  toggleOutline: 'onToggleOutline',
  openFileSearch: 'onOpenFileSearch',
  openContentSearch: 'onOpenContentSearch',
  toggleSettings: 'onToggleSettings',
}

/**
 * 键盘快捷键 Hook，支持自定义配置
 *
 * 从 localStorage 加载用户配置，未配置时使用默认值。
 * 内置标签页切换快捷键（关闭标签、切换标签）。
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  const [shortcuts, setShortcuts] =
    useState<Record<ShortcutAction, ShortcutConfig>>(DEFAULT_SHORTCUTS)

  useEffect(() => {
    loadShortcuts()
      .then((config) => setShortcuts(config))
      .catch((err) => logError('useKeyboardShortcuts:loadShortcuts', err))
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      const key = e.key

      for (const action of Object.keys(shortcuts) as ShortcutAction[]) {
        const config = shortcuts[action]
        if (
          config.ctrl === ctrl &&
          config.shift === e.shiftKey &&
          config.alt === e.altKey &&
          key.toLowerCase() === config.key.toLowerCase()
        ) {
          if (action === 'closeTab') {
            e.preventDefault()
            const state = useTabStore.getState()
            if (state.activeFile) {
              state.closeFile(state.activeFile)
            }
            return
          }

          if (action === 'nextTab' || action === 'prevTab') {
            e.preventDefault()
            const state = useTabStore.getState()
            if (state.openFiles.length < 2) return
            const idx = state.openFiles.indexOf(state.activeFile ?? '')
            const next =
              action === 'prevTab'
                ? (idx - 1 + state.openFiles.length) % state.openFiles.length
                : (idx + 1) % state.openFiles.length
            state.setActive(state.openFiles[next])
            return
          }

          const handlerKey = ACTION_TO_HANDLER[action as HandlerAction]
          if (handlerKey) {
            e.preventDefault()
            handlersRef.current[handlerKey]()
          }
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}
