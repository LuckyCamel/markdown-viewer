import { create } from 'zustand'
import { useEditorStore } from '../markdown-viewer/useEditorStore'

interface TabState {
  openFiles: string[]
  activeFile: string | null
  dirtyFiles: Set<string>
  isDirty: (filePath: string) => boolean
  openFile: (filePath: string) => void
  closeFile: (filePath: string) => void
  setActive: (filePath: string) => void
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

export const useTabStore = create<TabState>((set, get) => ({
  openFiles: [],
  activeFile: null,
  dirtyFiles: new Set<string>(),
  isDirty: (filePath) => get().dirtyFiles.has(filePath),
  openFile: (filePath) => {
    const { openFiles } = get()
    if (!openFiles.includes(filePath)) {
      set({ openFiles: [...openFiles, filePath], activeFile: filePath })
    } else {
      set({ activeFile: filePath })
    }
  },
  closeFile: (filePath) => {
    const { openFiles, activeFile, dirtyFiles } = get()
    const idx = openFiles.indexOf(filePath)
    const next = openFiles.filter((f) => f !== filePath)
    const nextDirty = new Set(dirtyFiles)
    nextDirty.delete(filePath)
    const nextActive =
      activeFile === filePath ? next[Math.min(idx, next.length - 1)] || null : activeFile
    purgeEditorCache([filePath])
    set({ openFiles: next, activeFile: nextActive, dirtyFiles: nextDirty })
  },
  setActive: (filePath) => set({ activeFile: filePath }),
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
    const { openFiles, dirtyFiles } = get()
    const toClose = openFiles.filter((f) => f !== filePath)
    const nextDirty = dirtyFiles.has(filePath) ? new Set([filePath]) : new Set<string>()
    purgeEditorCache(toClose)
    set({ openFiles: [filePath], activeFile: filePath, dirtyFiles: nextDirty })
  },
  closeAll: () => {
    const { openFiles } = get()
    purgeEditorCache(openFiles)
    set({ openFiles: [], activeFile: null, dirtyFiles: new Set() })
  },
}))
