import { useEffect } from 'react'
import { ipc } from '../lib/ipc'
import type { FileChangeEvent } from '../../shared/types'

export interface UseFileWatcherOptions {
  onExternalChange?: (path: string, content: string, mtime: number) => void
}

/**
 * 文件监听器：监听打开文件的外部变更，通过回调通知上层处理。
 * 不再直接修改编辑器内容状态，由上层的 useEditorDocument 决定如何处理。
 */
export function useFileWatcher(
  openFiles: string[],
  enabled: boolean,
  { onExternalChange }: UseFileWatcherOptions = {},
) {
  useEffect(() => {
    if (!enabled) return
    if (openFiles.length === 0) return

    openFiles.forEach((p) => ipc.watcher.watchFile(p))
    const onChange = (event: FileChangeEvent, fileContent: string | null) => {
      if (event.type === 'change' && fileContent !== null) {
        onExternalChange?.(event.path, fileContent, 0)
      }
    }
    const unsubscribe = ipc.watcher.onChange(onChange)

    return () => {
      openFiles.forEach((p) => ipc.watcher.unwatchFile(p))
      unsubscribe()
    }
  }, [openFiles, enabled, onExternalChange])
}
