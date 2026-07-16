import { useCallback, useEffect, useRef } from 'react'
import { useEditorStore } from './useEditorStore'
import { useEditorPersistence, type SaveStatus } from './useEditorPersistence'

export interface UseEditorSessionReturn {
  saveStatus: SaveStatus
  lastSavedTime: number | null
  forceSave: () => Promise<void>
  loadDisk: () => Promise<void>
  keepMine: () => void
}

/**
 * 编辑会话边界：持久化 + 换文件 reset/seed + 冲突处理。
 * App 只消费 saveStatus / forceSave，不直接编排 persistence。
 */
export function useEditorSession(filePath: string | null, content: string): UseEditorSessionReturn {
  const { status, lastSavedTime, save, loadDiskVersion, reset } = useEditorPersistence(
    filePath,
    content,
  )

  const prevPathRef = useRef<string | null>(filePath)
  const seededPathRef = useRef<string | null>(null)

  // 路径变化：清空会话，等待 content 就绪后 seed
  useEffect(() => {
    if (filePath !== prevPathRef.current) {
      prevPathRef.current = filePath
      seededPathRef.current = null
      reset()
    }
  }, [filePath, reset])

  // 内容首次就绪时 seed，避免打开文件被标 dirty 并自动写回
  useEffect(() => {
    if (!filePath) return
    if (content === '') return
    if (seededPathRef.current === filePath) return

    seededPathRef.current = filePath
    reset({ content, mtime: null })
  }, [filePath, content, reset])

  const loadDisk = useCallback(async () => {
    const diskContent = await loadDiskVersion()
    if (diskContent !== null && filePath) {
      useEditorStore.getState().setContent(filePath, diskContent)
      seededPathRef.current = filePath
    }
  }, [loadDiskVersion, filePath])

  const keepMine = useCallback(() => {
    void save()
  }, [save])

  return {
    saveStatus: status,
    lastSavedTime,
    forceSave: save,
    loadDisk,
    keepMine,
  }
}
