import { create } from 'zustand'
import { ipc } from '../../lib/ipc'
import { logError } from '../../logger'
import { DEFAULT_IGNORE_LIST, DEFAULT_MARKDOWN_EXTENSIONS } from '../../../shared/settingsDefaults'

interface SettingsState {
  ignoreList: string[]
  markdownExtensions: string[]
  // 阅读设置
  fontSize: number
  lineHeight: number
  contentMaxWidth: number | null
  fontFamily: string
  codeFontFamily: string
  // Actions
  setIgnoreList: (list: string[]) => void
  setMarkdownExtensions: (list: string[]) => void
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
  ignoreList: DEFAULT_IGNORE_LIST,
  markdownExtensions: DEFAULT_MARKDOWN_EXTENSIONS,
  fontSize: DEFAULT_FONT_SIZE,
  lineHeight: DEFAULT_LINE_HEIGHT,
  contentMaxWidth: null,
  fontFamily: '',
  codeFontFamily: '',
  setIgnoreList: (list) => set({ ignoreList: list }),
  setMarkdownExtensions: (list) => set({ markdownExtensions: list }),
  setFontSize: (size) => set({ fontSize: size }),
  setLineHeight: (height) => set({ lineHeight: height }),
  setContentMaxWidth: (width) => set({ contentMaxWidth: width }),
  setFontFamily: (font) => set({ fontFamily: font }),
  setCodeFontFamily: (font) => set({ codeFontFamily: font }),
  loadFromDisk: async () => {
    try {
      const [
        ignoreList,
        markdownExtensions,
        fontSize,
        lineHeight,
        contentMaxWidth,
        fontFamily,
        codeFontFamily,
      ] = await Promise.all([
        ipc.store.get<string[]>('ignoreList'),
        ipc.store.get<string[]>('markdownExtensions'),
        ipc.store.get<number>('fontSize'),
        ipc.store.get<number>('lineHeight'),
        ipc.store.get<number | null>('contentMaxWidth'),
        ipc.store.get<string>('fontFamily'),
        ipc.store.get<string>('codeFontFamily'),
      ])
      if (ignoreList) set({ ignoreList })
      if (markdownExtensions) set({ markdownExtensions })
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
      const {
        ignoreList,
        markdownExtensions,
        fontSize,
        lineHeight,
        contentMaxWidth,
        fontFamily,
        codeFontFamily,
      } = useSettingsStore.getState()
      await Promise.all([
        ipc.store.set('ignoreList', ignoreList),
        ipc.store.set('markdownExtensions', markdownExtensions),
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
