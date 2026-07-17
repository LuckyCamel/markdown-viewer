import { useEffect, useRef, useState } from 'react'
import {
  DEFAULT_SHORTCUTS,
  loadShortcuts,
  SHORTCUT_TO_COMMAND_ID,
  type ShortcutAction,
  type ShortcutConfig,
} from '../lib/shortcuts'
import { logError } from '../logger'
import { commandRegistry } from '../features/commands/commands'
import { useTabStore } from '../features/tabs/useTabStore'
import { useUIStore } from '../stores/useUIStore'

interface ShortcutHandlers {
  /** 唤起命令面板（Ctrl+Shift+P，固定不可配置） */
  onOpenCommandPalette?: () => void
  /** 搜索高亮：跳转到下一个匹配 */
  onSearchHighlightNext?: () => void
  /** 搜索高亮：跳转到上一个匹配 */
  onSearchHighlightPrev?: () => void
  /** 搜索高亮：关闭高亮 */
  onSearchHighlightClose?: () => void
  /** 保存文件（Ctrl+S，固定不可配置） */
  onSave?: () => void
}

/**
 * 键盘快捷键 Hook，支持自定义配置
 *
 * 从 localStorage 加载用户配置，未配置时使用默认值。
 * 可配置快捷键通过 commandRegistry 统一分发执行。
 * 固定快捷键（命令面板、保存、搜索高亮导航）保留直接 handler。
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

          const commandId = SHORTCUT_TO_COMMAND_ID[action]
          if (commandId) {
            e.preventDefault()
            commandRegistry.execute(commandId)
          }
          return
        }
      }

      // 搜索高亮导航快捷键（独立于可配置快捷键）
      if (key === 'F3') {
        e.preventDefault()
        if (e.shiftKey) {
          handlersRef.current.onSearchHighlightPrev?.()
        } else {
          handlersRef.current.onSearchHighlightNext?.()
        }
        return
      }

      // 存在搜索高亮时，Escape 关闭高亮
      if (key === 'Escape' && useUIStore.getState().searchHighlight) {
        e.preventDefault()
        handlersRef.current.onSearchHighlightClose?.()
        return
      }

      // Ctrl+Shift+P 唤起命令面板（固定不可配置，避免占用可配置快捷键）
      if (ctrl && e.shiftKey && !e.altKey && key.toLowerCase() === 'p') {
        e.preventDefault()
        handlersRef.current.onOpenCommandPalette?.()
        return
      }

      // Ctrl+S 保存文件（固定不可配置）
      if (ctrl && !e.shiftKey && !e.altKey && key.toLowerCase() === 's') {
        e.preventDefault()
        handlersRef.current.onSave?.()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}
