import { create } from 'zustand'

/**
 * 布局状态 Store
 *
 * 管理侧边栏/大纲面板的可见性与宽度，以及侧边栏内搜索面板的可见性。
 * 从 useUIStore 拆分而来，提高布局域的 Locality。
 */
interface LayoutState {
  /** 侧边栏可见 */
  sidebarVisible: boolean
  /** 大纲面板可见 */
  outlineVisible: boolean
  /** 侧边栏宽度（px） */
  sidebarWidth: number
  /** 大纲面板宽度（px） */
  outlineWidth: number
  /** 侧边栏内当前显示的搜索面板类型 */
  searchPanel: 'none' | 'file' | 'content' | 'recent'
  toggleSidebar: () => void
  toggleOutline: () => void
  setSidebarWidth: (width: number) => void
  setOutlineWidth: (width: number) => void
  openSearch: (type: 'file' | 'content' | 'recent') => void
  closeSearch: () => void
  reset: () => void
}

const initialState = {
  sidebarVisible: true,
  outlineVisible: true,
  sidebarWidth: 256,
  outlineWidth: 224,
  searchPanel: 'none' as const,
}

export const useLayoutStore = create<LayoutState>((set) => ({
  ...initialState,
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  toggleOutline: () => set((s) => ({ outlineVisible: !s.outlineVisible })),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setOutlineWidth: (width) => set({ outlineWidth: width }),
  openSearch: (type) => set({ searchPanel: type }),
  closeSearch: () => set({ searchPanel: 'none' }),
  reset: () => set(initialState),
}))
