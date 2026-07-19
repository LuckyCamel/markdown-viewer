import { create } from 'zustand'
import type { ContentJumpTarget, AnchorJumpTarget } from '../../shared/types'

/**
 * 导航意图状态 Store
 *
 * 管理跨文件跳转意图（pendingContentJump / pendingAnchorJump）与搜索高亮状态。
 * 从 useUIStore 拆分而来，提高导航域的 Locality。
 */
interface NavigationState {
  /** 待执行的跨文件内容跳转意图（由内容搜索触发） */
  pendingContentJump: ContentJumpTarget | null
  /** 待执行的跨文件锚点跳转意图（由大纲点击触发） */
  pendingAnchorJump: AnchorJumpTarget | null
  /** 当前编辑器/预览中需高亮的搜索查询 */
  searchHighlight: { query: string; isRegex: boolean } | null
  setPendingContentJump: (target: ContentJumpTarget | null) => void
  setPendingAnchorJump: (target: AnchorJumpTarget | null) => void
  setSearchHighlight: (query: string | null, isRegex?: boolean) => void
  reset: () => void
}

const initialState = {
  pendingContentJump: null as ContentJumpTarget | null,
  pendingAnchorJump: null as AnchorJumpTarget | null,
  searchHighlight: null as { query: string; isRegex: boolean } | null,
}

export const useNavigationStore = create<NavigationState>((set) => ({
  ...initialState,
  setPendingContentJump: (target) => set({ pendingContentJump: target }),
  setPendingAnchorJump: (target) => set({ pendingAnchorJump: target }),
  setSearchHighlight: (query, isRegex) =>
    set({ searchHighlight: query ? { query, isRegex: !!isRegex } : null }),
  reset: () => set(initialState),
}))
