import { create } from 'zustand'
import type { ThemeMode, ContentJumpTarget, AnchorJumpTarget, ViewMode } from '../../shared/types'
import type { ThemeId } from '../lib/themes'

interface UIState {
  theme: ThemeMode
  themeId: ThemeId | null
  sidebarVisible: boolean
  outlineVisible: boolean
  sidebarWidth: number
  outlineWidth: number
  searchPanel: 'none' | 'file' | 'content' | 'recent'
  viewMode: ViewMode
  codeTheme: string
  pendingContentJump: ContentJumpTarget | null
  pendingAnchorJump: AnchorJumpTarget | null
  searchHighlight: { query: string; isRegex: boolean } | null
  setTheme: (theme: ThemeMode) => void
  setThemeId: (themeId: ThemeId | null) => void
  toggleSidebar: () => void
  toggleOutline: () => void
  setSidebarWidth: (width: number) => void
  setOutlineWidth: (width: number) => void
  openSearch: (type: 'file' | 'content' | 'recent') => void
  closeSearch: () => void
  toggleViewMode: () => void
  setViewMode: (mode: ViewMode) => void
  setCodeTheme: (theme: string) => void
  setPendingContentJump: (target: ContentJumpTarget | null) => void
  setPendingAnchorJump: (target: AnchorJumpTarget | null) => void
  setSearchHighlight: (query: string | null, isRegex?: boolean) => void
  reset: () => void
}

const initialState = {
  theme: 'system' as ThemeMode,
  themeId: null as ThemeId | null,
  sidebarVisible: true,
  outlineVisible: true,
  sidebarWidth: 256,
  outlineWidth: 224,
  searchPanel: 'none' as const,
  viewMode: 'render' as ViewMode,
  codeTheme: 'auto',
  pendingContentJump: null as ContentJumpTarget | null,
  pendingAnchorJump: null as AnchorJumpTarget | null,
  searchHighlight: null as { query: string; isRegex: boolean } | null,
}

export const useUIStore = create<UIState>((set) => ({
  ...initialState,
  setTheme: (theme) => set({ theme }),
  setThemeId: (themeId) => set({ themeId }),
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  toggleOutline: () => set((s) => ({ outlineVisible: !s.outlineVisible })),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setOutlineWidth: (width) => set({ outlineWidth: width }),
  openSearch: (type) => set({ searchPanel: type }),
  closeSearch: () => set({ searchPanel: 'none' }),
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleViewMode: () =>
    set((s) => ({
      viewMode: s.viewMode === 'render' ? 'source' : s.viewMode === 'source' ? 'edit' : 'render',
    })),
  setCodeTheme: (theme) => set({ codeTheme: theme }),
  setPendingContentJump: (target) => set({ pendingContentJump: target }),
  setPendingAnchorJump: (target) => set({ pendingAnchorJump: target }),
  setSearchHighlight: (query, isRegex) =>
    set({ searchHighlight: query ? { query, isRegex: !!isRegex } : null }),
  reset: () => set(initialState),
}))
