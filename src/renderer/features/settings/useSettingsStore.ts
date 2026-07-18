import { create } from 'zustand'
import { ipc } from '../../lib/ipc'
import { logError } from '../../logger'

/**
 * 阅读设置 zustand store
 *
 * 仅缓存阅读相关字段（fontSize / lineHeight / contentMaxWidth / fontFamily /
 * codeFontFamily），启动时由 useWorkspaceStore 调用 loadFromDisk() 恢复。
 *
 * ignoreList 与 markdownExtensions 已迁移到后端 StoreState，由 SettingsPanel
 * 通过 ipc.store 直接读写 KV，不再经此 store 中转。
 */
interface SettingsState {
  fontSize: number
  lineHeight: number
  contentMaxWidth: number | null
  fontFamily: string
  codeFontFamily: string
  // Actions
  setFontSize: (size: number) => void
  setLineHeight: (height: number) => void
  setContentMaxWidth: (width: number | null) => void
  setFontFamily: (font: string) => void
  setCodeFontFamily: (font: string) => void
  loadFromDisk: () => Promise<void>
  saveToDisk: () => Promise<void>
}

/** 默认字体大小 */
const DEFAULT_FONT_SIZE = 14
/** 默认行高 */
const DEFAULT_LINE_HEIGHT = 1.6

export const useSettingsStore = create<SettingsState>((set) => ({
  fontSize: DEFAULT_FONT_SIZE,
  lineHeight: DEFAULT_LINE_HEIGHT,
  contentMaxWidth: null,
  fontFamily: '',
  codeFontFamily: '',
  setFontSize: (size) => set({ fontSize: size }),
  setLineHeight: (height) => set({ lineHeight: height }),
  setContentMaxWidth: (width) => set({ contentMaxWidth: width }),
  setFontFamily: (font) => set({ fontFamily: font }),
  setCodeFontFamily: (font) => set({ codeFontFamily: font }),
  loadFromDisk: async () => {
    try {
      const [fontSize, lineHeight, contentMaxWidth, fontFamily, codeFontFamily] = await Promise.all(
        [
          ipc.store.get<number>('fontSize'),
          ipc.store.get<number>('lineHeight'),
          ipc.store.get<number | null>('contentMaxWidth'),
          ipc.store.get<string>('fontFamily'),
          ipc.store.get<string>('codeFontFamily'),
        ],
      )
      if (fontSize !== undefined && fontSize !== null) set({ fontSize })
      if (lineHeight !== undefined && lineHeight !== null) set({ lineHeight })
      if (contentMaxWidth !== undefined) set({ contentMaxWidth })
      if (fontFamily !== undefined) set({ fontFamily })
      if (codeFontFamily !== undefined) set({ codeFontFamily })
    } catch (err) {
      logError('useSettingsStore:loadFromDisk', err)
    }
  },
  saveToDisk: async () => {
    try {
      const { fontSize, lineHeight, contentMaxWidth, fontFamily, codeFontFamily } =
        useSettingsStore.getState()
      await Promise.all([
        ipc.store.set('fontSize', fontSize),
        ipc.store.set('lineHeight', lineHeight),
        ipc.store.set('contentMaxWidth', contentMaxWidth),
        ipc.store.set('fontFamily', fontFamily),
        ipc.store.set('codeFontFamily', codeFontFamily),
      ])
    } catch (err) {
      logError('useSettingsStore:saveToDisk', err)
    }
  },
}))
