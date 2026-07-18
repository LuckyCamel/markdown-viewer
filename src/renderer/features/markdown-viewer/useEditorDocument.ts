import { useState, useCallback, useEffect, useRef } from 'react'
import { ipc } from '../../lib/ipc'
import { useEditorStore } from './useEditorStore'

export type SaveStatus = 'saved' | 'saving' | 'dirty' | 'error' | 'conflict'

export interface UseEditorDocumentReturn {
  content: string
  saveStatus: SaveStatus
  lastSavedTime: number | null
  setContent: (content: string) => void
  forceSave: () => Promise<void>
  loadDisk: () => Promise<void>
  keepMine: () => Promise<void>
  handleExternalChange: (newContent: string, newMtime: number) => void
}

/**
 * 编辑文档边界：合并持久化 + 换文件 reset/seed + 冲突处理 + 外部变更处理。
 * 单一 Module 管理单个文件的全部编辑会话状态。
 */
export function useEditorDocument(filePath: string | null): UseEditorDocumentReturn {
  const content = useEditorStore((s) => (filePath ? (s.contents[filePath] ?? '') : ''))
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [lastSavedTime, setLastSavedTime] = useState<number | null>(null)
  const [lastSavedMtime, setLastSavedMtime] = useState<number | null>(null)
  const [lastSavedContent, setLastSavedContent] = useState<string>('')
  const [diskContentSnapshot, setDiskContentSnapshot] = useState<string>('')

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentRef = useRef(content)
  const lastSavedContentRef = useRef('')
  const lastSavedMtimeRef = useRef<number | null>(null)
  const statusRef = useRef<SaveStatus>('saved')
  const filePathRef = useRef(filePath)
  const prevPathRef = useRef<string | null>(filePath)
  const seededPathRef = useRef<string | null>(null)
  const diskContentSnapshotRef = useRef('')

  contentRef.current = content
  filePathRef.current = filePath
  lastSavedContentRef.current = lastSavedContent
  lastSavedMtimeRef.current = lastSavedMtime
  statusRef.current = saveStatus
  diskContentSnapshotRef.current = diskContentSnapshot

  const clearAutoSaveTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const performSave = useCallback(async (force = false, ignoreMtimeConflict = false) => {
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

    setSaveStatus('saving')
    statusRef.current = 'saving'

    try {
      if (!ignoreMtimeConflict) {
        const diskMtime = await ipc.files.getMtime(path)

        if (savedMtime !== null && diskMtime > savedMtime) {
          const diskContent = await ipc.files.readFile(path)
          setDiskContentSnapshot(diskContent.content)
          diskContentSnapshotRef.current = diskContent.content
          setSaveStatus('conflict')
          statusRef.current = 'conflict'
          return
        }
      }

      const newMtime = await ipc.files.saveFile(path, currentContent)

      setLastSavedTime(Date.now())
      setLastSavedMtime(newMtime)
      lastSavedMtimeRef.current = newMtime
      setLastSavedContent(currentContent)
      lastSavedContentRef.current = currentContent
      setSaveStatus('saved')
      statusRef.current = 'saved'
    } catch {
      setSaveStatus('error')
      statusRef.current = 'error'
    }
  }, [])

  const performSaveRef = useRef(performSave)
  performSaveRef.current = performSave

  /**
   * 内容变化时更新 saveStatus。
   * - 内容与已保存不同 → dirty（非 saving/conflict 状态下）
   * - 内容与已保存相同 → 从 dirty/error 回到 saved
   */
  useEffect(() => {
    if (content !== lastSavedContent) {
      if (statusRef.current !== 'saving' && statusRef.current !== 'conflict') {
        setSaveStatus('dirty')
        statusRef.current = 'dirty'
      }
      return
    }
    if (statusRef.current === 'dirty' || statusRef.current === 'error') {
      setSaveStatus('saved')
      statusRef.current = 'saved'
    }
  }, [content, lastSavedContent])

  /**
   * 自动保存：content 变化 1500ms 后触发。
   * conflict 状态下不自动保存。
   */
  useEffect(() => {
    clearAutoSaveTimer()

    if (!filePath || content === '' || content === lastSavedContent) {
      return
    }

    if (saveStatus === 'conflict') {
      return
    }

    timeoutRef.current = setTimeout(() => {
      void performSaveRef.current(false)
    }, 1500)

    return clearAutoSaveTimer
  }, [content, filePath, lastSavedContent, saveStatus, clearAutoSaveTimer])

  /**
   * 路径变化：清空会话，等待 content 就绪后 seed。
   */
  useEffect(() => {
    if (filePath !== prevPathRef.current) {
      prevPathRef.current = filePath
      seededPathRef.current = null
      clearAutoSaveTimer()
      setLastSavedContent('')
      lastSavedContentRef.current = ''
      setLastSavedMtime(null)
      lastSavedMtimeRef.current = null
      setLastSavedTime(null)
      setDiskContentSnapshot('')
      diskContentSnapshotRef.current = ''
      setSaveStatus('saved')
      statusRef.current = 'saved'
    }
  }, [filePath, clearAutoSaveTimer])

  /**
   * 内容首次就绪时 seed，避免打开文件被标 dirty 并自动写回。
   */
  useEffect(() => {
    if (!filePath) return
    if (content === '') return
    if (seededPathRef.current === filePath) return

    seededPathRef.current = filePath
    setLastSavedContent(content)
    lastSavedContentRef.current = content
    setLastSavedMtime(null)
    lastSavedMtimeRef.current = null
  }, [filePath, content])

  /**
   * 修改内容：更新 useEditorStore，触发状态机。
   */
  const setContent = useCallback((newContent: string) => {
    const path = filePathRef.current
    if (!path) return
    useEditorStore.getState().setContent(path, newContent)
  }, [])

  /**
   * 手动保存（Ctrl+S 等）。
   */
  const forceSave = useCallback(async () => {
    await performSaveRef.current(true)
  }, [])

  /**
   * 加载磁盘版本：用磁盘内容覆盖本地编辑，清除冲突状态。
   */
  const loadDisk = useCallback(async () => {
    const path = filePathRef.current
    if (!path) return

    try {
      const fileContent = await ipc.files.readFile(path)
      useEditorStore.getState().setContent(path, fileContent.content)
      setLastSavedContent(fileContent.content)
      lastSavedContentRef.current = fileContent.content

      const mtime = await ipc.files.getMtime(path)
      setLastSavedMtime(mtime)
      lastSavedMtimeRef.current = mtime

      setDiskContentSnapshot('')
      diskContentSnapshotRef.current = ''
      setSaveStatus('saved')
      statusRef.current = 'saved'
      seededPathRef.current = path
    } catch {
      // 读取失败保持当前状态
    }
  }, [])

  /**
   * 保留我的版本：强制保存本地内容覆盖磁盘，清除冲突状态。
   */
  const keepMine = useCallback(async () => {
    setDiskContentSnapshot('')
    diskContentSnapshotRef.current = ''
    await performSaveRef.current(true, true)
  }, [])

  /**
   * 处理外部文件变更（由 useFileWatcher 调用）。
   * - saved 状态：直接更新内容和 mtime，保持 saved
   * - dirty / saving / error 状态：进入 conflict
   * - conflict 状态：更新磁盘快照，保持 conflict
   */
  const handleExternalChange = useCallback((newContent: string, newMtime: number) => {
    const path = filePathRef.current
    if (!path) return

    const currentContent = contentRef.current
    const currentStatus = statusRef.current

    if (currentStatus === 'saved') {
      if (newContent === currentContent) return
      useEditorStore.getState().setContent(path, newContent)
      setLastSavedContent(newContent)
      lastSavedContentRef.current = newContent
      setLastSavedMtime(newMtime)
      lastSavedMtimeRef.current = newMtime
      return
    }

    if (currentStatus === 'conflict') {
      setDiskContentSnapshot(newContent)
      diskContentSnapshotRef.current = newContent
      return
    }

    // dirty / saving / error → 进入 conflict
    setDiskContentSnapshot(newContent)
    diskContentSnapshotRef.current = newContent
    setSaveStatus('conflict')
    statusRef.current = 'conflict'
  }, [])

  return {
    content,
    saveStatus,
    lastSavedTime,
    setContent,
    forceSave,
    loadDisk,
    keepMine,
    handleExternalChange,
  }
}
