import { create } from 'zustand'

interface TabState {
  openFiles: string[]
  activeFile: string | null
  dirtyFiles: Set<string>
  openFile: (filePath: string) => void
  closeFile: (filePath: string) => void
  setActive: (filePath: string) => void
  markDirty: (filePath: string) => void
  clearDirty: (filePath: string) => void
  closeOthers: (filePath: string) => void
  closeAll: () => void
}

export const useTabStore = create<TabState>((set, get) => ({
  openFiles: [],
  activeFile: null,
  dirtyFiles: new Set(),
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
      activeFile === filePath
        ? next[Math.min(idx, next.length - 1)] || null
        : activeFile
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
  closeOthers: (filePath) => set({ openFiles: [filePath], activeFile: filePath }),
  closeAll: () => set({ openFiles: [], activeFile: null }),
}))
