/**
 * 命令面板显示状态
 *
 * CommandPalette 的公共接口：虽然状态简单（仅 open 布尔），
 * 但跨组件访问需求真实存在（useRegisterCommands、useKeyboardShortcuts 需要触发 show/toggle）。
 * 保留独立 store 而非合并入 useLayoutStore，因为命令面板是模态可见性，
 * 与布局 chrome（侧边栏/大纲/搜索面板）语义不同。
 */

import { create } from 'zustand'

interface CommandStoreState {
  /** 是否显示命令面板 */
  open: boolean
  /** 打开命令面板 */
  show: () => void
  /** 关闭命令面板 */
  hide: () => void
  /** 切换显示状态 */
  toggle: () => void
}

export const useCommandStore = create<CommandStoreState>((set) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
  toggle: () => set((s) => ({ open: !s.open })),
}))
