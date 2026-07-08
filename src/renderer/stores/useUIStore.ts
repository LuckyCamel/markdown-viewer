import { create } from 'zustand'
import type { ThemeMode, ContentJumpTarget, AnchorJumpTarget } from '../../shared/types'

interface UIState {
  theme: ThemeMode
  sidebarVisible: boolean
  outlineVisible: boolean
  sidebarWidth: number
  outlineWidth: number
  searchPanel: 'none' | 'file' | 'content'
  pendingContentJump: ContentJumpTarget | null
  pendingAnchorJump: AnchorJumpTarget | null
  setTheme: (theme: ThemeMode) => void
  toggleSidebar: () => void
  toggleOutline: () => void
  setSidebarWidth: (width: number) => void
  setOutlineWidth: (width: number) => void
  openSearch: (type: 'file' | 'content') => void
  closeSearch: () => void
  setPendingContentJump: (target: ContentJumpTarget | null) => void
  setPendingAnchorJump: (target: AnchorJumpTarget | null) => void
  reset: () => void
}

const initialState = {
  theme: 'system' as ThemeMode,
  sidebarVisible: true,
  outlineVisible: true,
  sidebarWidth: 256,
  outlineWidth: 224,
  searchPanel: 'none' as const,
  pendingContentJump: null as ContentJumpTarget | null,
  pendingAnchorJump: null as AnchorJumpTarget | null,
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
  setPendingContentJump: (target) => set({ pendingContentJump: target }),
  setPendingAnchorJump: (target) => set({ pendingAnchorJump: target }),
  reset: () => set(initialState),
}))
