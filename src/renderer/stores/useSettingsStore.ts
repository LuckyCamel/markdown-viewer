import { create } from 'zustand'

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
    const list = await window.api.store.get<string[]>('ignoreList')
    if (list) set({ ignoreList: list })
  },
  saveToDisk: async () => {
    const { ignoreList } = useSettingsStore.getState()
    await window.api.store.set('ignoreList', ignoreList)
  },
}))
