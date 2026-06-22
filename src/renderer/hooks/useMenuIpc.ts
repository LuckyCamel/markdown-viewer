import { useEffect, useRef } from 'react'
import { ipc } from '../lib/ipc'
import { useTabStore } from '../features/tabs/useTabStore'
import { IPC_CHANNELS } from '../../shared/types'

interface MenuHandlers {
  onOpenFolder: (path: string) => void
  onToggleSidebar: () => void
  onToggleOutline: () => void
  onOpenFileSearch: () => void
  onOpenContentSearch: () => void
  onToggleSettings: () => void
}

export function useMenuIpc(handlers: MenuHandlers) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    const cleanup: Array<() => void> = []
    function onMenu(channel: string, cb: (...args: unknown[]) => void) {
      ipc.ipc.on(channel, cb)
      cleanup.push(() => ipc.ipc.off(channel, cb))
    }

    onMenu(IPC_CHANNELS.MENU_OPEN_FOLDER, (path) =>
      handlersRef.current.onOpenFolder(path as string),
    )
    onMenu(IPC_CHANNELS.MENU_TOGGLE_FILE_TREE, () => handlersRef.current.onToggleSidebar())
    onMenu(IPC_CHANNELS.MENU_TOGGLE_OUTLINE, () => handlersRef.current.onToggleOutline())
    onMenu(IPC_CHANNELS.MENU_FILE_SEARCH, () => handlersRef.current.onOpenFileSearch())
    onMenu(IPC_CHANNELS.MENU_CONTENT_SEARCH, () => handlersRef.current.onOpenContentSearch())
    onMenu(IPC_CHANNELS.MENU_OPEN_SETTINGS, () => handlersRef.current.onToggleSettings())
    onMenu(IPC_CHANNELS.MENU_CLOSE_TAB, () => {
      const state = useTabStore.getState()
      if (state.activeFile) state.closeFile(state.activeFile)
    })
    onMenu(IPC_CHANNELS.MENU_NEXT_TAB, () => {
      const state = useTabStore.getState()
      if (state.openFiles.length < 2) return
      const idx = state.openFiles.indexOf(state.activeFile ?? '')
      const next = (idx + 1) % state.openFiles.length
      state.setActive(state.openFiles[next])
    })
    onMenu(IPC_CHANNELS.MENU_PREV_TAB, () => {
      const state = useTabStore.getState()
      if (state.openFiles.length < 2) return
      const idx = state.openFiles.indexOf(state.activeFile ?? '')
      const prev = (idx - 1 + state.openFiles.length) % state.openFiles.length
      state.setActive(state.openFiles[prev])
    })

    return () => cleanup.forEach((fn) => fn())
  }, [])
}
