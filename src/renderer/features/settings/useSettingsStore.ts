import { create } from 'zustand'
import { ipc } from '../../lib/ipc'
import { logError } from '../../logger'

interface SettingsState {
  ignoreList: string[]
  setIgnoreList: (list: string[]) => void
  loadFromDisk: () => Promise<void>
  saveToDisk: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  ignoreList: [],
  setIgnoreList: (list) => set({ ignoreList: list }),
  loadFromDisk: async () => {
    try {
      const list = await ipc.store.get<string[]>('ignoreList')
      if (list) set({ ignoreList: list })
    } catch (err) {
      logError('useSettingsStore:loadFromDisk', err)
    }
  },
  saveToDisk: async () => {
    try {
      const { ignoreList } = useSettingsStore.getState()
      await ipc.store.set('ignoreList', ignoreList)
    } catch (err) {
      logError('useSettingsStore:saveToDisk', err)
    }
  },
}))
