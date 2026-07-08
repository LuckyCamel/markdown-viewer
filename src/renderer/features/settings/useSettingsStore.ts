import { create } from 'zustand'
import { ipc } from '../../lib/ipc'
import { logError } from '../../logger'
import { DEFAULT_IGNORE_LIST, DEFAULT_MARKDOWN_EXTENSIONS } from '../../../shared/settingsDefaults'

interface SettingsState {
  ignoreList: string[]
  markdownExtensions: string[]
  setIgnoreList: (list: string[]) => void
  setMarkdownExtensions: (list: string[]) => void
  loadFromDisk: () => Promise<void>
  saveToDisk: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  ignoreList: DEFAULT_IGNORE_LIST,
  markdownExtensions: DEFAULT_MARKDOWN_EXTENSIONS,
  setIgnoreList: (list) => set({ ignoreList: list }),
  setMarkdownExtensions: (list) => set({ markdownExtensions: list }),
  loadFromDisk: async () => {
    try {
      const [ignoreList, markdownExtensions] = await Promise.all([
        ipc.store.get<string[]>('ignoreList'),
        ipc.store.get<string[]>('markdownExtensions'),
      ])
      if (ignoreList) set({ ignoreList })
      if (markdownExtensions) set({ markdownExtensions })
    } catch (err) {
      logError('useSettingsStore:loadFromDisk', err)
    }
  },
  saveToDisk: async () => {
    try {
      const { ignoreList, markdownExtensions } = useSettingsStore.getState()
      await ipc.store.set('ignoreList', ignoreList)
      await ipc.store.set('markdownExtensions', markdownExtensions)
    } catch (err) {
      logError('useSettingsStore:saveToDisk', err)
    }
  },
}))
