import ElectronStore from 'electron-store'
import { DEFAULT_IGNORE } from './files'

export interface StoreSchema {
  theme: 'system' | 'light' | 'dark'
  ignoreList: string[]
  recentFiles: { path: string; name: string; timestamp: number }[]
  recentDirs: { path: string; name: string; timestamp: number }[]
  readingPositions: Record<string, number>
  lastWorkspace: string | null
  windowBounds: { x?: number; y?: number; width: number; height: number }
  openFiles: string[]
  activeFile: string | null
}

const defaults: StoreSchema = {
  theme: 'system',
  ignoreList: [...DEFAULT_IGNORE],
  recentFiles: [],
  recentDirs: [],
  readingPositions: {},
  lastWorkspace: null,
  windowBounds: { width: 1200, height: 800 },
  openFiles: [],
  activeFile: null,
}

const store = new ElectronStore<StoreSchema>({ defaults })

export const appStore = {
  get<T extends keyof StoreSchema>(key: T): StoreSchema[T] {
    return store.get(key)
  },
  set<T extends keyof StoreSchema>(key: T, value: StoreSchema[T]): void {
    store.set(key, value)
  },
  delete(key: keyof StoreSchema): void {
    store.delete(key)
  },
  clear(): void {
    store.clear()
  },
}
