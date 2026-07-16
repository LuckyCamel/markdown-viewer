import { useState, useCallback, useEffect, useRef } from 'react'
import { ipc } from '../../lib/ipc'

export type SaveStatus = 'saved' | 'saving' | 'dirty' | 'error' | 'conflict'

/** 打开/切换文件时用磁盘内容初始化，避免误标 dirty 并触发自动保存 */
export interface PersistenceSeed {
  content: string
  mtime?: number | null
}

interface UseEditorPersistenceReturn {
  status: SaveStatus
  lastSavedTime: number | null
  save: () => Promise<void>
  loadDiskVersion: () => Promise<string | null>
  reset: (seed?: PersistenceSeed) => void
}

export function useEditorPersistence(
  filePath: string | null,
  content: string,
): UseEditorPersistenceReturn {
  const [status, setStatus] = useState<SaveStatus>('saved')
  const [lastSavedTime, setLastSavedTime] = useState<number | null>(null)
  const [lastSavedMtime, setLastSavedMtime] = useState<number | null>(null)
  const [lastSavedContent, setLastSavedContent] = useState<string>('')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentRef = useRef(content)
  const lastSavedContentRef = useRef('')
  const lastSavedMtimeRef = useRef<number | null>(null)
  const statusRef = useRef<SaveStatus>('saved')
  const filePathRef = useRef(filePath)

  contentRef.current = content
  filePathRef.current = filePath
  lastSavedContentRef.current = lastSavedContent
  lastSavedMtimeRef.current = lastSavedMtime
  statusRef.current = status

  const clearAutoSaveTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const performSave = useCallback(async (force = false) => {
    const path = filePathRef.current
    if (!path) return

    const currentContent = contentRef.current
    const savedContent = lastSavedContentRef.current
    const savedMtime = lastSavedMtimeRef.current
    const currentStatus = statusRef.current

    if (!force && currentContent === savedContent && currentStatus === 'saved') {
      return
    }

    if (!force && currentStatus === 'saving') {
      return
    }

    setStatus('saving')
    statusRef.current = 'saving'

    try {
      const diskMtime = await ipc.files.getMtime(path)

      if (savedMtime !== null && diskMtime > savedMtime) {
        setStatus('conflict')
        statusRef.current = 'conflict'
        return
      }

      const newMtime = await ipc.files.saveFile(path, currentContent)

      setLastSavedTime(Date.now())
      setLastSavedMtime(newMtime)
      lastSavedMtimeRef.current = newMtime
      setLastSavedContent(currentContent)
      lastSavedContentRef.current = currentContent
      setStatus('saved')
      statusRef.current = 'saved'
    } catch {
      setStatus('error')
      statusRef.current = 'error'
    }
  }, [])

  const performSaveRef = useRef(performSave)
  performSaveRef.current = performSave

  useEffect(() => {
    if (content !== lastSavedContent) {
      if (statusRef.current !== 'saving' && statusRef.current !== 'conflict') {
        setStatus('dirty')
        statusRef.current = 'dirty'
      }
      return
    }
    // 内容与已保存一致（如 loadDisk 后 store 回写）：从 dirty 回到 saved
    if (statusRef.current === 'dirty' || statusRef.current === 'error') {
      setStatus('saved')
      statusRef.current = 'saved'
    }
  }, [content, lastSavedContent])

  useEffect(() => {
    clearAutoSaveTimer()

    if (!filePath || content === '' || content === lastSavedContent) {
      return
    }

    if (status === 'conflict') {
      return
    }

    timeoutRef.current = setTimeout(() => {
      void performSaveRef.current(false)
    }, 1500)

    return clearAutoSaveTimer
  }, [content, filePath, lastSavedContent, status, clearAutoSaveTimer])

  const loadDiskVersion = useCallback(async (): Promise<string | null> => {
    const path = filePathRef.current
    if (!path) return null

    try {
      const fileContent = await ipc.files.readFile(path)
      setLastSavedContent(fileContent.content)
      lastSavedContentRef.current = fileContent.content
      setStatus('saved')
      statusRef.current = 'saved'

      const mtime = await ipc.files.getMtime(path)
      setLastSavedMtime(mtime)
      lastSavedMtimeRef.current = mtime

      return fileContent.content
    } catch {
      return null
    }
  }, [])

  const reset = useCallback(
    (seed?: PersistenceSeed) => {
      clearAutoSaveTimer()
      if (seed) {
        setLastSavedContent(seed.content)
        lastSavedContentRef.current = seed.content
        const mtime = seed.mtime ?? null
        setLastSavedMtime(mtime)
        lastSavedMtimeRef.current = mtime
      } else {
        setLastSavedContent('')
        lastSavedContentRef.current = ''
        setLastSavedMtime(null)
        lastSavedMtimeRef.current = null
      }
      setLastSavedTime(null)
      setStatus('saved')
      statusRef.current = 'saved'
    },
    [clearAutoSaveTimer],
  )

  return {
    status,
    lastSavedTime,
    save: () => performSave(true),
    loadDiskVersion,
    reset,
  }
}
