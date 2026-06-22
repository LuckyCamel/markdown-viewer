import { useEffect } from 'react'
import { ipc } from '../lib/ipc'
import { useEditorStore } from '../features/markdown-viewer/useEditorStore'
import { useTabStore } from '../features/tabs/useTabStore'
import type { FileChangeEvent } from '../../shared/types'

export function useFileWatcher(openFiles: string[], enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    if (openFiles.length === 0) return

    openFiles.forEach((p) => ipc.watcher.watchFile(p))
    const onChange = (event: FileChangeEvent, fileContent: string | null) => {
      if (event.type === 'change' && fileContent !== null) {
        useEditorStore.getState().setContent(event.path, fileContent)
        useTabStore.getState().markDirty(event.path)
        setTimeout(() => useTabStore.getState().clearDirty(event.path), 2000)
      }
    }
    ipc.watcher.onChange(onChange)

    return () => {
      openFiles.forEach((p) => ipc.watcher.unwatchFile(p))
      ipc.watcher.offChange(onChange)
    }
  }, [openFiles, enabled])
}
