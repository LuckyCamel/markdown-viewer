import { useEffect, useRef } from 'react'
import { ipc } from '../lib/ipc'
import { useTabStore } from '../features/tabs/useTabStore'

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

    onMenu('menu:openFolder', (path) => handlersRef.current.onOpenFolder(path as string))
    onMenu('menu:toggleFileTree', () => handlersRef.current.onToggleSidebar())
    onMenu('menu:toggleOutline', () => handlersRef.current.onToggleOutline())
    onMenu('menu:fileSearch', () => handlersRef.current.onOpenFileSearch())
    onMenu('menu:contentSearch', () => handlersRef.current.onOpenContentSearch())
    onMenu('menu:openSettings', () => handlersRef.current.onToggleSettings())
    onMenu('menu:closeTab', () => {
      const state = useTabStore.getState()
      if (state.activeFile) state.closeFile(state.activeFile)
    })
    onMenu('menu:nextTab', () => {
      const state = useTabStore.getState()
      if (state.openFiles.length < 2) return
      const idx = state.openFiles.indexOf(state.activeFile ?? '')
      const next = (idx + 1) % state.openFiles.length
      state.setActive(state.openFiles[next])
    })
    onMenu('menu:prevTab', () => {
      const state = useTabStore.getState()
      if (state.openFiles.length < 2) return
      const idx = state.openFiles.indexOf(state.activeFile ?? '')
      const prev = (idx - 1 + state.openFiles.length) % state.openFiles.length
      state.setActive(state.openFiles[prev])
    })

    return () => cleanup.forEach((fn) => fn())
  }, [])
}
