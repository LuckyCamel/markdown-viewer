import { useEffect, useRef } from 'react'
import { listen } from '@tauri-apps/api/event'
import { useTabStore } from '../features/tabs/useTabStore'
import { logError } from '../logger'
import {
  MENU_ABOUT,
  MENU_CLOSE_TAB,
  MENU_CONTENT_SEARCH,
  MENU_FILE_SEARCH,
  MENU_OPEN_FILE,
  MENU_OPEN_FOLDER,
  MENU_SETTINGS,
  MENU_TOGGLE_OUTLINE,
  MENU_TOGGLE_SIDEBAR,
  type MenuActionId,
} from '../lib/menuActions'

export interface MenuHandlers {
  onOpenFolder: () => void
  onOpenFile: () => void
  onToggleSidebar: () => void
  onToggleOutline: () => void
  onOpenFileSearch: () => void
  onOpenContentSearch: () => void
  onToggleSettings: () => void
  onShowAbout: () => void
}

/**
 * 监听 Rust 原生菜单点击事件并分发到对应处理器
 */
export function useMenuEvents(handlers: MenuHandlers): void {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    let unlisten: (() => void) | undefined

    listen<string>('menu-action', (event) => {
      const id = event.payload as MenuActionId
      const h = handlersRef.current

      switch (id) {
        case MENU_OPEN_FOLDER:
          h.onOpenFolder()
          break
        case MENU_OPEN_FILE:
          h.onOpenFile()
          break
        case MENU_CLOSE_TAB: {
          const state = useTabStore.getState()
          if (state.activeFile) state.closeFile(state.activeFile)
          break
        }
        case MENU_TOGGLE_SIDEBAR:
          h.onToggleSidebar()
          break
        case MENU_TOGGLE_OUTLINE:
          h.onToggleOutline()
          break
        case MENU_FILE_SEARCH:
          h.onOpenFileSearch()
          break
        case MENU_CONTENT_SEARCH:
          h.onOpenContentSearch()
          break
        case MENU_SETTINGS:
          h.onToggleSettings()
          break
        case MENU_ABOUT:
          h.onShowAbout()
          break
        default:
          break
      }
    })
      .then((fn) => {
        unlisten = fn
      })
      .catch((err) => logError('useMenuEvents:listen', err))

    return () => {
      unlisten?.()
    }
  }, [])
}
