import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWorkspaceInit } from './useWorkspaceInit'

const mockStoreGet = vi.fn()
const mockStoreSet = vi.fn()
const mockUpdateSettings = vi.fn()
const mockLogError = vi.fn()

vi.mock('../lib/ipc', () => ({
  ipc: {
    store: {
      get: (...args: unknown[]) => mockStoreGet(...args),
      set: (...args: unknown[]) => mockStoreSet(...args),
    },
    files: {
      updateSettings: (...args: unknown[]) => mockUpdateSettings(...args),
    },
  },
}))
vi.mock('../logger', () => ({ logError: (...args: unknown[]) => mockLogError(...args) }))

const mockSetTheme = vi.fn()
const mockSetIgnoreList = vi.fn()
const mockOpenFile = vi.fn()
const mockSetActive = vi.fn()
const mockCloseAll = vi.fn()
const mockSetRoot = vi.fn()
const mockReset = vi.fn()

vi.mock('../stores/useUIStore', () => {
  const actual = { getState: vi.fn(() => ({ setTheme: mockSetTheme })) }
  const useUIStore = Object.assign(
    (selector: (s: ReturnType<(typeof actual)['getState']>) => unknown) =>
      selector(actual.getState()),
    actual,
  )
  return { useUIStore }
})
vi.mock('../features/settings/useSettingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      setIgnoreList: mockSetIgnoreList,
      ignoreList: [],
      markdownExtensions: [],
    }),
  },
}))
vi.mock('../features/tabs/useTabStore', () => ({
  useTabStore: {
    getState: () => ({
      openFile: mockOpenFile,
      setActive: mockSetActive,
      closeAll: mockCloseAll,
    }),
  },
}))
vi.mock('../features/file-tree/useFileStore', () => ({
  useFileStore: {
    getState: () => ({ setRoot: mockSetRoot }),
  },
}))
vi.mock('../features/search/useSearchStore', () => ({
  useSearchStore: {
    getState: () => ({ reset: mockReset }),
  },
}))

describe('useWorkspaceInit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStoreGet.mockResolvedValue(undefined)
    mockStoreSet.mockResolvedValue(undefined)
    mockUpdateSettings.mockResolvedValue(undefined)
  })

  describe('初始化', () => {
    it('挂载后并行恢复 5 个状态', async () => {
      mockStoreGet.mockImplementation(async (key: string) => {
        const map: Record<string, unknown> = {
          theme: 'dark',
          lastWorkspace: '/work',
          openFiles: ['/work/a.md'],
          activeFile: '/work/a.md',
          ignoreList: ['.git'],
        }
        return map[key]
      })
      const { result } = renderHook(() => useWorkspaceInit())

      await vi.waitFor(() => {
        expect(result.current.initialized).toBe(true)
      })
      expect(mockSetTheme).toHaveBeenCalledWith('dark')
      expect(mockSetIgnoreList).toHaveBeenCalledWith(['.git'])
      expect(mockSetRoot).toHaveBeenCalledWith('/work')
      expect(mockOpenFile).toHaveBeenCalledWith('/work/a.md')
      expect(mockSetActive).toHaveBeenCalledWith('/work/a.md')
    })

    it('未保存的状态不用默认值覆盖', async () => {
      mockStoreGet.mockResolvedValue(undefined)
      const { result } = renderHook(() => useWorkspaceInit())

      await vi.waitFor(() => {
        expect(result.current.initialized).toBe(true)
      })
      expect(mockSetTheme).not.toHaveBeenCalled()
      expect(mockSetIgnoreList).not.toHaveBeenCalled()
      expect(mockSetRoot).not.toHaveBeenCalled()
      expect(mockUpdateSettings).toHaveBeenCalledWith([], [])
    })

    it('init 异常时调用 logError', async () => {
      mockStoreGet.mockRejectedValue(new Error('store read error'))
      renderHook(() => useWorkspaceInit())
      await vi.waitFor(() => {
        expect(mockLogError).toHaveBeenCalledWith('useWorkspaceInit:init', expect.any(Error))
      })
    })
  })

  describe('handleOpenFolder', () => {
    it('打开指定目录 + 持久化', async () => {
      const { result } = renderHook(() => useWorkspaceInit())
      await act(async () => result.current.handleOpenFolder('/myproject'))
      expect(mockSetRoot).toHaveBeenCalledWith('/myproject')
      expect(mockCloseAll).toHaveBeenCalled()
      expect(mockReset).toHaveBeenCalled()
      expect(mockStoreSet).toHaveBeenCalledWith('lastWorkspace', '/myproject')
    })

    it('trackRecent 异常时 catch 调用 logError', async () => {
      mockStoreGet.mockResolvedValueOnce([])
      mockStoreSet.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('write error'))
      const { result } = renderHook(() => useWorkspaceInit())
      await act(async () => result.current.handleOpenFolder('/myproject'))
      expect(mockLogError).toHaveBeenCalledWith(
        expect.stringContaining('trackRecent'),
        expect.any(Error),
      )
    })
  })

  describe('handleOpenFile', () => {
    it('通过 useTabStore.openFile 打开文件', async () => {
      const { result } = renderHook(() => useWorkspaceInit())
      await act(async () => result.current.handleOpenFile('/file.md'))
      expect(mockOpenFile).toHaveBeenCalledWith('/file.md')
    })

    it('无工作区时以文件父目录初始化 workspace', async () => {
      const { result } = renderHook(() => useWorkspaceInit())
      await act(async () => result.current.handleOpenFile('/projects/readme.md'))
      expect(mockSetRoot).toHaveBeenCalledWith('/projects')
      expect(mockStoreSet).toHaveBeenCalledWith('lastWorkspace', '/projects')
      expect(mockOpenFile).toHaveBeenCalledWith('/projects/readme.md')
      expect(result.current.workspacePath).toBe('/projects')
    })
  })
})
