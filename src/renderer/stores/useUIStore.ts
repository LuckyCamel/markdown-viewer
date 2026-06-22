import { create } from 'zustand'
import type { ThemeMode } from '../../shared/types'

interface UIState {
  theme: ThemeMode
  sidebarVisible: boolean
  outlineVisible: boolean
  searchPanel: 'none' | 'file' | 'content'
  setTheme: (theme: ThemeMode) => void
  toggleSidebar: () => void
  toggleOutline: () => void
  openSearch: (type: 'file' | 'content') => void
  closeSearch: () => void
  reset: () => void
}

const initialState = {
  theme: 'system' as ThemeMode,
  sidebarVisible: true,
  outlineVisible: true,
  searchPanel: 'none' as const,
}

export const useUIStore = create<UIState>((set) => ({
  ...initialState,
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  toggleOutline: () => set((s) => ({ outlineVisible: !s.outlineVisible })),
  openSearch: (type) => set({ searchPanel: type }),
  closeSearch: () => set({ searchPanel: 'none' }),
  reset: () => set(initialState),
}))
