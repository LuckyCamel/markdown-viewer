import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSettingsStore } from './useSettingsStore'
import { DEFAULT_IGNORE_LIST } from '../../../shared/settingsDefaults'

const mockStoreGet = vi.fn()
const mockStoreSet = vi.fn()

vi.mock('../../lib/ipc', () => ({
  ipc: {
    store: {
      get: (...args: unknown[]) => mockStoreGet(...args),
      set: (...args: unknown[]) => mockStoreSet(...args),
    },
  },
}))

describe('useSettingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      ignoreList: DEFAULT_IGNORE_LIST,
      markdownExtensions: ['md', 'markdown'],
    })
    vi.clearAllMocks()
  })

  it('should load ignore list from disk', async () => {
    mockStoreGet.mockResolvedValue(['.git', 'node_modules'])

    await useSettingsStore.getState().loadFromDisk()

    expect(useSettingsStore.getState().ignoreList).toEqual(['.git', 'node_modules'])
  })

  it('should not update when store returns undefined', async () => {
    mockStoreGet.mockResolvedValue(undefined)

    await useSettingsStore.getState().loadFromDisk()

    expect(useSettingsStore.getState().ignoreList).toEqual(DEFAULT_IGNORE_LIST)
  })

  it('should save ignore list to disk', async () => {
    useSettingsStore.setState({ ignoreList: ['dist', '.cache'] })

    await useSettingsStore.getState().saveToDisk()

    expect(mockStoreSet).toHaveBeenCalledWith('ignoreList', ['dist', '.cache'])
  })
})
