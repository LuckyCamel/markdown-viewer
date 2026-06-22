import { create } from 'zustand'
import type { FileEntry } from '../../../shared/types'
import { ipc } from '../../lib/ipc'

interface FileTreeState {
  entries: Record<string, FileEntry[]>
  expanded: Record<string, boolean>
  loading: Record<string, boolean>
  rootPath: string | null
  setRoot: (path: string) => void
  toggleExpand: (dirPath: string) => Promise<void>
  loadChildren: (dirPath: string) => Promise<void>
}

export const useFileStore = create<FileTreeState>((set, get) => ({
  entries: {},
  expanded: {},
  loading: {},
  rootPath: null,
  setRoot: (path) => {
    set({ rootPath: path })
    get().loadChildren(path)
  },
  toggleExpand: async (dirPath) => {
    const { expanded } = get()
    if (expanded[dirPath]) {
      const next = { ...expanded }
      delete next[dirPath]
      set({ expanded: next })
    } else {
      await get().loadChildren(dirPath)
      const next = { ...get().expanded, [dirPath]: true }
      set({ expanded: next })
    }
  },
  loadChildren: async (dirPath) => {
    const { loading } = get()
    if (loading[dirPath]) return
    set((s) => ({ loading: { ...s.loading, [dirPath]: true } }))
    const entries = await ipc.files.listDirectory(dirPath)
    set((s) => {
      const next = { ...s.loading }
      delete next[dirPath]
      return {
        entries: { ...s.entries, [dirPath]: entries },
        loading: next,
      }
    })
  },
}))
