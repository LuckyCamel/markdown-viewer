import type { StoreSchema } from './store'
import { readFile, getFileInfo } from './files'
import { getFilteredEntries } from './file-filter'
import { searchDirectory } from './search'
import type { SearchProgress } from '../shared/types'

export function handleListDirectory(dirPath: string, ignoreList: string[], extensions: string[]) {
  return getFilteredEntries(dirPath, ignoreList, extensions)
}

export function handleReadFile(filePath: string) {
  return readFile(filePath)
}

export function handleGetFileInfo(filePath: string) {
  return getFileInfo(filePath)
}

export function handleStoreGet<T extends keyof StoreSchema>(
  getter: (key: T) => StoreSchema[T],
  key: T,
) {
  return getter(key)
}

export function handleStoreSet<T extends keyof StoreSchema>(
  setter: (key: T, value: StoreSchema[T]) => void,
  key: T,
  value: StoreSchema[T],
) {
  setter(key, value)
}

export function handleStoreDelete<T extends keyof StoreSchema>(deleter: (key: T) => void, key: T) {
  deleter(key)
}

export function handleSearchContent(
  dirPath: string,
  query: string,
  ignoreList: string[],
  onProgress: (progress: SearchProgress) => void,
) {
  searchDirectory(dirPath, query, onProgress, ignoreList)
}
