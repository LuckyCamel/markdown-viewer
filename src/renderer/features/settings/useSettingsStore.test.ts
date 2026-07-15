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
      fontSize: 14,
      lineHeight: 1.6,
      contentMaxWidth: null,
      fontFamily: '',
      codeFontFamily: '',
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

  // 阅读设置测试
  describe('reading settings', () => {
    it('should set font size', () => {
      useSettingsStore.getState().setFontSize(16)
      expect(useSettingsStore.getState().fontSize).toBe(16)
    })

    it('should set line height', () => {
      useSettingsStore.getState().setLineHeight(1.8)
      expect(useSettingsStore.getState().lineHeight).toBe(1.8)
    })

    it('should set content max width', () => {
      useSettingsStore.getState().setContentMaxWidth(800)
      expect(useSettingsStore.getState().contentMaxWidth).toBe(800)
    })

    it('should set content max width to null', () => {
      useSettingsStore.getState().setContentMaxWidth(null)
      expect(useSettingsStore.getState().contentMaxWidth).toBeNull()
    })

    it('should load reading settings from disk', async () => {
      mockStoreGet.mockImplementation((key: string) => {
        if (key === 'fontSize') return Promise.resolve(18)
        if (key === 'lineHeight') return Promise.resolve(2.0)
        if (key === 'contentMaxWidth') return Promise.resolve(900)
        if (key === 'fontFamily') return Promise.resolve('Arial')
        if (key === 'codeFontFamily') return Promise.resolve('Consolas')
        return Promise.resolve(undefined)
      })

      await useSettingsStore.getState().loadFromDisk()

      expect(useSettingsStore.getState().fontSize).toBe(18)
      expect(useSettingsStore.getState().lineHeight).toBe(2.0)
      expect(useSettingsStore.getState().contentMaxWidth).toBe(900)
      expect(useSettingsStore.getState().fontFamily).toBe('Arial')
      expect(useSettingsStore.getState().codeFontFamily).toBe('Consolas')
    })

    it('should save reading settings to disk', async () => {
      useSettingsStore.setState({
        fontSize: 16,
        lineHeight: 1.8,
        contentMaxWidth: 800,
        fontFamily: 'Georgia',
        codeFontFamily: 'JetBrains Mono',
      })

      await useSettingsStore.getState().saveToDisk()

      expect(mockStoreSet).toHaveBeenCalledWith('fontSize', 16)
      expect(mockStoreSet).toHaveBeenCalledWith('lineHeight', 1.8)
      expect(mockStoreSet).toHaveBeenCalledWith('contentMaxWidth', 800)
      expect(mockStoreSet).toHaveBeenCalledWith('fontFamily', 'Georgia')
      expect(mockStoreSet).toHaveBeenCalledWith('codeFontFamily', 'JetBrains Mono')
    })
  })
})
