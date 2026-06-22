import { create } from 'zustand'
import { ipc } from '../../lib/ipc'

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
    const list = await ipc.store.get<string[]>('ignoreList')
    if (list) set({ ignoreList: list })
  },
  saveToDisk: async () => {
    const { ignoreList } = useSettingsStore.getState()
    await ipc.store.set('ignoreList', ignoreList)
  },
}))
