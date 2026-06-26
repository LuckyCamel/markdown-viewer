import { describe, it, expect, vi } from 'vitest'
import {
  handleListDirectory,
  handleStoreGet,
  handleStoreSet,
  handleStoreDelete,
  handleSearchContent,
} from './handlers'

vi.mock('./files', () => ({
  readFile: vi.fn(),
  getFileInfo: vi.fn(),
}))
vi.mock('./file-filter', () => ({
  getFilteredEntries: vi.fn(),
  invalidateAll: vi.fn(),
}))
vi.mock('./search', () => ({ searchDirectory: vi.fn() }))

describe('handlers', () => {
  it('handleListDirectory 注入 ignoreList 和 extensions', async () => {
    const { getFilteredEntries } = await import('./file-filter')
    vi.mocked(getFilteredEntries).mockResolvedValue([])
    await handleListDirectory('/test', ['.git'], ['.md'])
    expect(getFilteredEntries).toHaveBeenCalledWith('/test', ['.git'], ['.md'])
  })

  it('handleStoreGet 调用 getter', () => {
    const getter = vi.fn().mockReturnValue('dark')
    expect(handleStoreGet(getter as any, 'theme' as any)).toBe('dark')
    expect(getter).toHaveBeenCalledWith('theme')
  })

  it('handleStoreSet 调用 setter', () => {
    const setter = vi.fn()
    handleStoreSet(setter as any, 'theme' as any, 'light' as any)
    expect(setter).toHaveBeenCalledWith('theme', 'light')
  })

  it('handleStoreDelete 调用 deleter', () => {
    const deleter = vi.fn()
    handleStoreDelete(deleter as any, 'theme' as any)
    expect(deleter).toHaveBeenCalledWith('theme')
  })

  it('handleSearchContent 调用 searchDirectory', async () => {
    const { searchDirectory } = await import('./search')
    vi.mocked(searchDirectory).mockImplementation((_dir, _query, _cb, _ignore) => {})
    const onProgress = vi.fn()
    handleSearchContent('/test', 'query', ['.git'], onProgress)
    expect(searchDirectory).toHaveBeenCalledWith('/test', 'query', onProgress, ['.git'])
  })
})
