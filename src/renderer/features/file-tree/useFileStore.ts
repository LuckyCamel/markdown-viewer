import { create } from 'zustand'
import type { FileEntry } from '../../../shared/types'

interface FileTreeState {
  entries: Record<string, FileEntry[]>
  expanded: Set<string>
  loading: Set<string>
  rootPath: string | null
  setRoot: (path: string) => void
  toggleExpand: (dirPath: string) => Promise<void>
  loadChildren: (dirPath: string) => Promise<void>
}

export const useFileStore = create<FileTreeState>((set, get) => ({
  entries: {},
  expanded: new Set(),
  loading: new Set(),
  rootPath: null,
  setRoot: (path) => {
    set({ rootPath: path })
    get().loadChildren(path)
  },
  toggleExpand: async (dirPath) => {
    const { expanded } = get()
    if (expanded.has(dirPath)) {
      const next = new Set(expanded)
      next.delete(dirPath)
      set({ expanded: next })
    } else {
      await get().loadChildren(dirPath)
      const next = new Set(get().expanded)
      next.add(dirPath)
      set({ expanded: next })
    }
  },
  loadChildren: async (dirPath) => {
    const { loading } = get()
    if (loading.has(dirPath)) return
    set((s) => ({ loading: new Set(s.loading).add(dirPath) }))
    const entries = await window.api.files.listDirectory(dirPath)
    set((s) => {
      const next = new Set(s.loading)
      next.delete(dirPath)
      return {
        entries: { ...s.entries, [dirPath]: entries },
        loading: next,
      }
    })
  },
}))
