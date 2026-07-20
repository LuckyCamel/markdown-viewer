import { create } from 'zustand'
import { useEditorStore } from '../markdown-viewer/useEditorStore'
import { useFileStore } from '../file-tree/useFileStore'
import { ipc } from '../../lib/ipc'
import { logError } from '../../logger'
import { checkFileSize } from '../../lib/fileSizeGuard'
import { getFileKind } from '../../../shared/fileTypes'
import type { ViewMode } from '../../../shared/types'

interface TabState {
  openFiles: string[]
  activeFile: string | null
  dirtyFiles: Set<string>
  viewModes: Record<string, ViewMode>
  previewEnabled: Record<string, boolean>
  isDirty: (filePath: string) => boolean
  getViewMode: (filePath: string) => ViewMode
  isPreviewEnabled: (filePath: string) => boolean
  openFile: (filePath: string) => void
  closeFile: (filePath: string) => void
  renameFile: (oldPath: string, newPath: string) => void
  setActive: (filePath: string) => void
  setViewMode: (filePath: string, mode: ViewMode) => void
  toggleViewMode: (filePath: string) => void
  togglePreview: (filePath: string) => void
  setPreviewEnabled: (filePath: string, enabled: boolean) => void
  markDirty: (filePath: string) => void
  clearDirty: (filePath: string) => void
  closeOthers: (filePath: string) => void
  closeAll: () => void
}

/**
 * 关闭标签时清理编辑器缓存
 */
function purgeEditorCache(filePaths: string[]) {
  const removeContent = useEditorStore.getState().removeContent
  for (const path of filePaths) {
    removeContent(path)
  }
}

/**
 * FileSizeGuard 集成：根据文件大小与类型决定是否允许打开
 *
 * - 二进制文件：alert 提示无法读取，返回 false
 * - 超阈值文件：confirm 询问是否仍要打开（只读前 N 行），用户取消则返回 false
 * - 正常文件：返回 true
 *
 * 文件大小从 useFileStore.entries 查找；若未 list 过该目录则跳过检查（不阻塞）。
 */
function shouldAllowOpenFile(filePath: string): boolean {
  const { entries } = useFileStore.getState()
  const parentDir = filePath.split(/[\\/]/).slice(0, -1).join('/') || '/'
  const dirEntries = entries[parentDir]
  if (!dirEntries) {
    // 未 list 过该目录，跳过检查
    return true
  }
  const entry = dirEntries.find((e) => e.path === filePath)
  if (!entry || entry.size === undefined) {
    return true
  }
  const kind = getFileKind(filePath)
  const result = checkFileSize(filePath, entry.size, kind)
  if (result.allowed) {
    return true
  }
  if (result.reason === 'binary') {
    alert(`无法以文本方式读取二进制文件：\n${filePath}\n\n文件类型：${kind}`)
    return false
  }
  // too_large
  const sizeMB = (entry.size / (1024 * 1024)).toFixed(2)
  const confirmed = confirm(
    `文件较大（${sizeMB} MB），可能影响性能或导致卡顿。\n\n仍要打开吗？\n\n${filePath}`,
  )
  return confirmed
}

export const useTabStore = create<TabState>((set, get) => ({
  openFiles: [],
  activeFile: null,
  dirtyFiles: new Set<string>(),
  viewModes: {},
  previewEnabled: {},
  isDirty: (filePath) => get().dirtyFiles.has(filePath),
  getViewMode: (filePath) => get().viewModes[filePath] ?? 'read',
  isPreviewEnabled: (filePath) => get().previewEnabled[filePath] ?? false,
  openFile: (filePath) => {
    // FileSizeGuard：打开前检查文件大小与类型，超阈值或二进制给出提示
    if (!shouldAllowOpenFile(filePath)) {
      return
    }

    ipc.workspace.grant([filePath]).catch((err) => logError('useTabStore:grant', err))
    const { openFiles, viewModes } = get()
    if (!openFiles.includes(filePath)) {
      set({
        openFiles: [...openFiles, filePath],
        activeFile: filePath,
        viewModes: { ...viewModes, [filePath]: viewModes[filePath] ?? 'read' },
      })
    } else {
      set({ activeFile: filePath })
    }
  },
  closeFile: (filePath) => {
    const { openFiles, activeFile, dirtyFiles, viewModes, previewEnabled } = get()
    const idx = openFiles.indexOf(filePath)
    const next = openFiles.filter((f) => f !== filePath)
    const nextDirty = new Set(dirtyFiles)
    nextDirty.delete(filePath)
    const nextViewModes = { ...viewModes }
    delete nextViewModes[filePath]
    const nextPreviewEnabled = { ...previewEnabled }
    delete nextPreviewEnabled[filePath]
    const nextActive =
      activeFile === filePath ? next[Math.min(idx, next.length - 1)] || null : activeFile
    purgeEditorCache([filePath])
    set({
      openFiles: next,
      activeFile: nextActive,
      dirtyFiles: nextDirty,
      viewModes: nextViewModes,
      previewEnabled: nextPreviewEnabled,
    })
  },
  renameFile: (oldPath, newPath) => {
    const { openFiles, activeFile, dirtyFiles, viewModes, previewEnabled } = get()
    // 旧路径未打开则无需处理
    if (!openFiles.includes(oldPath)) return
    const next = openFiles.map((f) => (f === oldPath ? newPath : f))
    const nextActive = activeFile === oldPath ? newPath : activeFile
    // 迁移 dirty 标记
    const nextDirty = new Set(dirtyFiles)
    if (nextDirty.has(oldPath)) {
      nextDirty.delete(oldPath)
      nextDirty.add(newPath)
    }
    // 迁移 viewMode
    const nextViewModes = { ...viewModes }
    if (oldPath in nextViewModes) {
      nextViewModes[newPath] = nextViewModes[oldPath]
      delete nextViewModes[oldPath]
    }
    // 迁移 previewEnabled
    const nextPreviewEnabled = { ...previewEnabled }
    if (oldPath in nextPreviewEnabled) {
      nextPreviewEnabled[newPath] = nextPreviewEnabled[oldPath]
      delete nextPreviewEnabled[oldPath]
    }
    // 迁移编辑器缓存（保留未保存内容）
    const editor = useEditorStore.getState()
    const cached = editor.contents[oldPath]
    if (cached !== undefined) {
      editor.setContent(newPath, cached)
      editor.removeContent(oldPath)
    }
    set({
      openFiles: next,
      activeFile: nextActive,
      dirtyFiles: nextDirty,
      viewModes: nextViewModes,
      previewEnabled: nextPreviewEnabled,
    })
  },
  setActive: (filePath) => set({ activeFile: filePath }),
  setViewMode: (filePath, mode) =>
    set((s) => ({
      viewModes: { ...s.viewModes, [filePath]: mode },
    })),
  toggleViewMode: (filePath) =>
    set((s) => {
      const current = s.viewModes[filePath] ?? 'read'
      const next: ViewMode = current === 'read' ? 'edit' : 'read'
      return { viewModes: { ...s.viewModes, [filePath]: next } }
    }),
  togglePreview: (filePath) =>
    set((s) => {
      const current = s.previewEnabled[filePath] ?? false
      return { previewEnabled: { ...s.previewEnabled, [filePath]: !current } }
    }),
  setPreviewEnabled: (filePath, enabled) =>
    set((s) => ({
      previewEnabled: { ...s.previewEnabled, [filePath]: enabled },
    })),
  markDirty: (filePath) =>
    set((s) => {
      const next = new Set(s.dirtyFiles)
      next.add(filePath)
      return { dirtyFiles: next }
    }),
  clearDirty: (filePath) =>
    set((s) => {
      const next = new Set(s.dirtyFiles)
      next.delete(filePath)
      return { dirtyFiles: next }
    }),
  closeOthers: (filePath) => {
    const { openFiles, dirtyFiles, viewModes, previewEnabled } = get()
    const toClose = openFiles.filter((f) => f !== filePath)
    const nextDirty = dirtyFiles.has(filePath) ? new Set([filePath]) : new Set<string>()
    const nextViewModes: Record<string, ViewMode> = {}
    if (filePath in viewModes) {
      nextViewModes[filePath] = viewModes[filePath]
    }
    const nextPreviewEnabled: Record<string, boolean> = {}
    if (filePath in previewEnabled) {
      nextPreviewEnabled[filePath] = previewEnabled[filePath]
    }
    purgeEditorCache(toClose)
    set({
      openFiles: [filePath],
      activeFile: filePath,
      dirtyFiles: nextDirty,
      viewModes: nextViewModes,
      previewEnabled: nextPreviewEnabled,
    })
  },
  closeAll: () => {
    const { openFiles } = get()
    purgeEditorCache(openFiles)
    set({
      openFiles: [],
      activeFile: null,
      dirtyFiles: new Set(),
      viewModes: {},
      previewEnabled: {},
    })
  },
}))
