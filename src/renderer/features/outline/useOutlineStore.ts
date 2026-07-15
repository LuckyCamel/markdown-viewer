import { create } from 'zustand'
import { ipc } from '../../lib/ipc'
import { logError } from '../../logger'

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
  /** 从持久化存储加载指定文件的折叠状态并同步到内存 */
  loadCollapsed: (filePath: string) => Promise<string[]>
}

/** 持久化存储中保存各文件折叠状态的键，结构为 { [filePath]: string[] } */
const OUTLINE_COLLAPSED_KEY = 'outlineCollapsed'

/**
 * 将指定文件的折叠状态持久化到磁盘
 *
 * 以 filePath -> string[] 的映射结构整体存储，仅更新对应条目。
 * ids 为空数组时删除该条目，避免存储膨胀。写入失败仅记录日志，不影响内存状态。
 */
function persistCollapsed(filePath: string, ids: string[]): void {
  ipc.store
    .get<Record<string, string[]>>(OUTLINE_COLLAPSED_KEY)
    .then((all) => {
      const next = { ...(all ?? {}) }
      if (ids.length === 0) {
        delete next[filePath]
      } else {
        next[filePath] = ids
      }
      return ipc.store.set(OUTLINE_COLLAPSED_KEY, next)
    })
    .catch((err) => logError('useOutlineStore:persistCollapsed', err))
}

/**
 * 大纲折叠状态 store
 *
 * 以 filePath 为键维护各文件独立的折叠状态，并持久化到磁盘。
 * 持久化策略：toggleCollapse/collapseAll/expandAll 修改内存状态后立即异步写入
 * ipc.store（键为 'outlineCollapsed'，值为 { [filePath]: string[] }）；
 * 组件加载文件大纲时通过 loadCollapsed 读取并同步到内存。切换文件时各自互不影响。
 */
export const useOutlineStore = create<OutlineState>((set, get) => ({
  collapsed: {},
  toggleCollapse: (filePath, headingId) =>
    set((s) => {
      const current = s.collapsed[filePath] ?? []
      const next = current.includes(headingId)
        ? current.filter((id) => id !== headingId)
        : [...current, headingId]
      persistCollapsed(filePath, next)
      return { collapsed: { ...s.collapsed, [filePath]: next } }
    }),
  collapseAll: (filePath, allIds) =>
    set((s) => {
      persistCollapsed(filePath, allIds)
      return { collapsed: { ...s.collapsed, [filePath]: allIds } }
    }),
  expandAll: (filePath) =>
    set((s) => {
      const next = { ...s.collapsed }
      delete next[filePath]
      persistCollapsed(filePath, [])
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
  /**
   * 从持久化存储加载指定文件的折叠状态，并同步到内存 store
   * 加载失败时返回空数组且不影响内存状态
   */
  loadCollapsed: async (filePath) => {
    try {
      const all = await ipc.store.get<Record<string, string[]>>(OUTLINE_COLLAPSED_KEY)
      const ids = all?.[filePath] ?? []
      set((s) => ({ collapsed: { ...s.collapsed, [filePath]: ids } }))
      return ids
    } catch (err) {
      logError('useOutlineStore:loadCollapsed', err)
      return []
    }
  },
}))
