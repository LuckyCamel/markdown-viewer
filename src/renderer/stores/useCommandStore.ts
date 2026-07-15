/**
 * 命令面板显示状态
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
