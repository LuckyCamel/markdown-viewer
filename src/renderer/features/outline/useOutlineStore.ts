import { create } from 'zustand'

interface OutlineState {
  /** filePath -> 已折叠 headingId 数组 */
  collapsed: Record<string, string[]>
  /** 切换指定标题的折叠状态 */
  toggleCollapse: (filePath: string, headingId: string) => void
  /** 折叠指定文件的全部标题 */
  collapseAll: (filePath: string, allIds: string[]) => void
  /** 展开指定文件的全部标题 */
  expandAll: (filePath: string) => void
  /** 查询指定标题是否处于折叠状态 */
  isCollapsed: (filePath: string, headingId: string) => boolean
  /** 获取指定文件的折叠 id 集合 */
  getCollapsedSet: (filePath: string) => Set<string>
}

/**
 * 大纲折叠状态 store
 *
 * 以 filePath 为键维护各文件独立的折叠状态，仅在内存中保留，
 * 不持久化到磁盘。切换文件时各自互不影响。
 */
export const useOutlineStore = create<OutlineState>((set, get) => ({
  collapsed: {},
  toggleCollapse: (filePath, headingId) =>
    set((s) => {
      const current = s.collapsed[filePath] ?? []
      const next = current.includes(headingId)
        ? current.filter((id) => id !== headingId)
        : [...current, headingId]
      return { collapsed: { ...s.collapsed, [filePath]: next } }
    }),
  collapseAll: (filePath, allIds) =>
    set((s) => ({
      collapsed: { ...s.collapsed, [filePath]: allIds },
    })),
  expandAll: (filePath) =>
    set((s) => {
      const next = { ...s.collapsed }
      delete next[filePath]
      return { collapsed: next }
    }),
  isCollapsed: (filePath, headingId) => {
    const current = get().collapsed[filePath] ?? []
    return current.includes(headingId)
  },
  getCollapsedSet: (filePath) => {
    const current = get().collapsed[filePath] ?? []
    return new Set(current)
  },
}))
