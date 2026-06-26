import { create } from 'zustand'
import type { ThemeMode } from '../../shared/types'

interface UIState {
  theme: ThemeMode
  sidebarVisible: boolean
  outlineVisible: boolean
  sidebarWidth: number
  outlineWidth: number
  searchPanel: 'none' | 'file' | 'content'
  setTheme: (theme: ThemeMode) => void
  toggleSidebar: () => void
  toggleOutline: () => void
  setSidebarWidth: (width: number) => void
  setOutlineWidth: (width: number) => void
  openSearch: (type: 'file' | 'content') => void
  closeSearch: () => void
  reset: () => void
}

const initialState = {
  theme: 'system' as ThemeMode,
  sidebarVisible: true,
  outlineVisible: true,
  sidebarWidth: 256,
  outlineWidth: 224,
  searchPanel: 'none' as const,
}

export const useUIStore = create<UIState>((set) => ({
  ...initialState,
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  toggleOutline: () => set((s) => ({ outlineVisible: !s.outlineVisible })),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setOutlineWidth: (width) => set({ outlineWidth: width }),
  openSearch: (type) => set({ searchPanel: type }),
  closeSearch: () => set({ searchPanel: 'none' }),
  reset: () => set(initialState),
}))
