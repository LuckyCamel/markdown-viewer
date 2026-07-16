import { useState, useCallback, useEffect, useRef } from 'react'
import { ipc } from '../../lib/ipc'

export type SaveStatus = 'saved' | 'saving' | 'dirty' | 'error' | 'conflict'

interface UseEditorPersistenceReturn {
  status: SaveStatus
  lastSavedTime: number | null
  save: () => Promise<void>
  loadDiskVersion: () => Promise<string | null>
  reset: () => void
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

  useEffect(() => {
    contentRef.current = content
    if (content !== lastSavedContent) {
      setStatus('dirty')
    }
  }, [content, lastSavedContent])

  useEffect(() => {
    if (filePath && content === lastSavedContent && status === 'saved') {
      return
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (!filePath || content === '' || content === lastSavedContent) {
      return
    }

    timeoutRef.current = setTimeout(() => {
      void save()
    }, 1500)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [content, filePath, lastSavedContent, status])

  const save = useCallback(
    async (force = false) => {
      if (!filePath) return

      const currentContent = force ? content : contentRef.current

      if (!force && currentContent === lastSavedContent && status === 'saved') {
        return
      }

      if (!force && status === 'saving') {
        return
      }

      setStatus('saving')

      try {
        const diskMtime = await ipc.files.getMtime(filePath)

        if (lastSavedMtime !== null && diskMtime > lastSavedMtime) {
          setStatus('conflict')
          return
        }

        const newMtime = await ipc.files.saveFile(filePath, currentContent)

        setLastSavedTime(Date.now())
        setLastSavedMtime(newMtime)
        setLastSavedContent(currentContent)
        setStatus('saved')
      } catch {
        setStatus('error')
      }
    },
    [filePath, content, lastSavedContent, lastSavedMtime, status],
  )

  const loadDiskVersion = useCallback(async (): Promise<string | null> => {
    if (!filePath) return null

    try {
      const fileContent = await ipc.files.readFile(filePath)
      setLastSavedContent(fileContent.content)
      setStatus('saved')

      const mtime = await ipc.files.getMtime(filePath)
      setLastSavedMtime(mtime)

      return fileContent.content
    } catch {
      return null
    }
  }, [filePath])

  const reset = useCallback(() => {
    setStatus('saved')
    setLastSavedTime(null)
    setLastSavedMtime(null)
    setLastSavedContent('')
  }, [])

  return {
    status,
    lastSavedTime,
    save: () => save(true),
    loadDiskVersion,
    reset,
  }
}
