import ElectronStore from 'electron-store'
import { DEFAULT_IGNORE, SUPPORTED_EXTENSIONS } from './files'
import type { AppSettings } from '../shared/types'

export type StoreSchema = AppSettings

const defaults: StoreSchema = {
  theme: 'system',
  ignoreList: [...DEFAULT_IGNORE],
  markdownExtensions: [...SUPPORTED_EXTENSIONS],
  recentFiles: [],
  recentDirs: [],
  readingPositions: {},
  lastWorkspace: null,
  windowBounds: { width: 1200, height: 800 },
  openFiles: [],
  activeFile: null,
  sidebarWidth: 256,
  outlineWidth: 224,
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
