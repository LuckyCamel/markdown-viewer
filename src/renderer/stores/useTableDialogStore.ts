import { create } from 'zustand'
import type { EditorView } from '@codemirror/view'

/**
 * 表格插入弹窗状态
 *
 * 工具栏与命令面板共享此状态以打开同一张弹窗。
 * view 在 EditorToolbar 挂载/更新时同步，确保确认插入时能拿到当前编辑器实例。
 */
interface TableDialogState {
  /** 是否显示弹窗 */
  open: boolean
  /** 当前编辑器视图 */
  view: EditorView | null
  /** 打开弹窗；可传入新的 view，未传入时保留已有 view */
  openDialog: (view?: EditorView | null) => void
  /** 关闭弹窗 */
  closeDialog: () => void
  /** 更新当前编辑器视图 */
  setView: (view: EditorView | null) => void
}

export const useTableDialogStore = create<TableDialogState>((set) => ({
  open: false,
  view: null,
  openDialog: (view) => set((s) => ({ open: true, view: view ?? s.view })),
  closeDialog: () => set({ open: false }),
  setView: (view) => set({ view }),
}))
