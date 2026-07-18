import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useWorkspaceStore, validateRecentEntries } from './useWorkspaceStore'

const mockStoreGet = vi.fn()
const mockStoreSet = vi.fn()
const mockGrant = vi.fn()
const mockEnsureStoreMigrated = vi.fn()
const mockGetLaunchPaths = vi.fn()
const mockGetFileInfo = vi.fn()
const mockCheckExists = vi.fn()
const mockLogError = vi.fn()
let mockRootPath: string | null = null
let mockRootPaths: string[] = []

const mockSetTheme = vi.fn()
const mockSetCodeTheme = vi.fn()
const mockSetSidebarWidth = vi.fn()
const mockSetOutlineWidth = vi.fn()
const mockSetThemeId = vi.fn()
const mockOpenFile = vi.fn()
const mockSetActive = vi.fn()
const mockCloseAll = vi.fn()
const mockSetRoot = vi.fn()
const mockAddRoot = vi.fn()
const mockReset = vi.fn()
const mockLoadSortSettings = vi.fn()

vi.mock('../lib/ipc', () => ({
  ensureStoreMigrated: (...args: unknown[]) => mockEnsureStoreMigrated(...args),
  ipc: {
    workspace: {
      grant: (...args: unknown[]) => mockGrant(...args),
    },
    store: {
      get: (...args: unknown[]) => mockStoreGet(...args),
      set: (...args: unknown[]) => mockStoreSet(...args),
    },
    app: {
      getLaunchPaths: (...args: unknown[]) => mockGetLaunchPaths(...args),
    },
    files: {
      getFileInfo: (...args: unknown[]) => mockGetFileInfo(...args),
      checkExists: (...args: unknown[]) => mockCheckExists(...args),
    },
  },
}))
vi.mock('../logger', () => ({ logError: (...args: unknown[]) => mockLogError(...args) }))

vi.mock('./useUIStore', () => {
  const actual = {
    getState: vi.fn(() => ({
      setTheme: mockSetTheme,
      setCodeTheme: mockSetCodeTheme,
      setSidebarWidth: mockSetSidebarWidth,
      setOutlineWidth: mockSetOutlineWidth,
      setThemeId: mockSetThemeId,
    })),
  }
  const useUIStore = Object.assign(
    (selector: (s: ReturnType<(typeof actual)['getState']>) => unknown) =>
      selector(actual.getState()),
    actual,
  )
  return { useUIStore }
})
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
    getState: () => ({
      setRoot: (path: string) => {
        mockSetRoot(path)
        mockRootPath = path
        mockRootPaths = [path]
      },
      addRoot: async (path: string) => {
        mockAddRoot(path)
        if (!mockRootPaths.includes(path)) {
          mockRootPaths.push(path)
        }
        if (!mockRootPath) mockRootPath = path
      },
      loadSortSettings: (...args: unknown[]) => mockLoadSortSettings(...args),
      get rootPath() {
        return mockRootPath
      },
      get rootPaths() {
        return mockRootPaths
      },
    }),
  },
}))
vi.mock('../features/search/useSearchStore', () => ({
  useSearchStore: {
    getState: () => ({ reset: mockReset }),
  },
}))

describe('useWorkspaceStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnsureStoreMigrated.mockResolvedValue(undefined)
    mockGrant.mockResolvedValue(undefined)
    mockRootPath = null
    mockRootPaths = []
    mockStoreGet.mockResolvedValue(undefined)
    mockStoreSet.mockResolvedValue(undefined)
    mockGetLaunchPaths.mockResolvedValue([])
    mockCheckExists.mockResolvedValue([])
    mockLoadSortSettings.mockResolvedValue(undefined)
    // 重置 store 状态
    useWorkspaceStore.setState({ workspacePath: null, initialized: false })
  })

  describe('init', () => {
    it('恢复持久化 workspace 和 openFiles', async () => {
      mockStoreGet.mockImplementation(async (key: string) => {
        const map: Record<string, unknown> = {
          theme: 'dark',
          codeTheme: 'github-dark',
          lastWorkspace: '/work',
          openFiles: ['/work/a.md'],
          activeFile: '/work/a.md',
        }
        return map[key]
      })

      await useWorkspaceStore.getState().init()

      expect(mockSetTheme).toHaveBeenCalledWith('dark')
      expect(mockSetCodeTheme).toHaveBeenCalledWith('github-dark')
      expect(mockSetRoot).toHaveBeenCalledWith('/work')
      expect(mockOpenFile).toHaveBeenCalledWith('/work/a.md')
      expect(mockSetActive).toHaveBeenCalledWith('/work/a.md')
      expect(useWorkspaceStore.getState().initialized).toBe(true)
      expect(useWorkspaceStore.getState().workspacePath).toBe('/work')
    })

    it('未保存的状态不覆盖默认值且不调用 setter', async () => {
      mockStoreGet.mockResolvedValue(undefined)

      await useWorkspaceStore.getState().init()

      expect(mockSetTheme).not.toHaveBeenCalled()
      expect(mockSetCodeTheme).not.toHaveBeenCalled()
      expect(mockSetRoot).not.toHaveBeenCalled()
      expect(mockOpenFile).not.toHaveBeenCalled()
      expect(useWorkspaceStore.getState().initialized).toBe(true)
    })

    it('恢复持久化 sidebarWidth/outlineWidth/themeId 到 useUIStore', async () => {
      mockStoreGet.mockImplementation(async (key: string) => {
        const map: Record<string, unknown> = {
          sidebarWidth: 240,
          outlineWidth: 300,
          themeId: 'sepia',
        }
        return map[key]
      })

      await useWorkspaceStore.getState().init()

      expect(mockSetSidebarWidth).toHaveBeenCalledWith(240)
      expect(mockSetOutlineWidth).toHaveBeenCalledWith(300)
      expect(mockSetThemeId).toHaveBeenCalledWith('sepia')
    })

    it('CLI 启动路径优先于持久化 workspace', async () => {
      mockGetLaunchPaths.mockResolvedValue(['/cli/readme.md'])
      mockGetFileInfo.mockResolvedValue({
        path: '/cli/readme.md',
        name: 'readme.md',
        isDirectory: false,
      })
      mockStoreGet.mockImplementation(async (key: string) => {
        if (key === 'lastWorkspace') return '/saved'
        if (key === 'openFiles') return ['/saved/old.md']
        return undefined
      })

      await useWorkspaceStore.getState().init()

      expect(mockOpenFile).toHaveBeenCalledWith('/cli/readme.md')
      expect(mockOpenFile).not.toHaveBeenCalledWith('/saved/old.md')
      expect(mockSetRoot).toHaveBeenCalledWith('/cli')
      expect(useWorkspaceStore.getState().workspacePath).toBe('/cli')
    })

    it('启动时后台校验最近文件并移除失效条目', async () => {
      mockStoreGet.mockImplementation(async (key: string) => {
        if (key === 'recentFiles')
          return [
            { path: '/a.md', name: 'a.md', timestamp: 1 },
            { path: '/b.md', name: 'b.md', timestamp: 2 },
          ]
        return undefined
      })
      mockCheckExists.mockResolvedValue([true, false])

      await useWorkspaceStore.getState().init()

      // 校验在后台异步执行
      await vi.waitFor(() => {
        expect(mockCheckExists).toHaveBeenCalledWith(['/a.md', '/b.md'])
      })
      await vi.waitFor(() => {
        expect(mockStoreSet).toHaveBeenCalledWith('recentFiles', [
          { path: '/a.md', name: 'a.md', timestamp: 1 },
        ])
      })
    })

    it('最近条目全部存在时不触发回写', async () => {
      mockStoreGet.mockImplementation(async (key: string) => {
        if (key === 'recentDirs') return [{ path: '/dir1', name: 'dir1', timestamp: 1 }]
        return undefined
      })
      mockCheckExists.mockResolvedValue([true])

      await useWorkspaceStore.getState().init()

      await vi.waitFor(() => {
        expect(mockCheckExists).toHaveBeenCalledWith(['/dir1'])
      })
      expect(mockStoreSet).not.toHaveBeenCalledWith('recentDirs', expect.anything())
    })
  })

  describe('openFolder', () => {
    it('打开指定目录并持久化 lastWorkspace', async () => {
      await useWorkspaceStore.getState().openFolder('/myproject')

      expect(mockGrant).toHaveBeenCalledWith(['/myproject'])
      expect(mockSetRoot).toHaveBeenCalledWith('/myproject')
      expect(mockCloseAll).toHaveBeenCalled()
      expect(mockReset).toHaveBeenCalled()
      expect(mockStoreSet).toHaveBeenCalledWith('lastWorkspace', '/myproject')
      expect(useWorkspaceStore.getState().workspacePath).toBe('/myproject')
    })
  })

  describe('openFile', () => {
    it('通过 useTabStore.openFile 打开文件', async () => {
      // 预设 workspacePath 以避免触发以父目录初始化
      useWorkspaceStore.setState({ workspacePath: '/work' })
      await useWorkspaceStore.getState().openFile('/work/readme.md')

      expect(mockGrant).toHaveBeenCalledWith(['/work/readme.md'])
      expect(mockOpenFile).toHaveBeenCalledWith('/work/readme.md')
    })

    it('无 workspace 时以文件父目录初始化 workspace', async () => {
      await useWorkspaceStore.getState().openFile('/projects/readme.md')

      expect(mockSetRoot).toHaveBeenCalledWith('/projects')
      expect(mockStoreSet).toHaveBeenCalledWith('lastWorkspace', '/projects')
      expect(mockOpenFile).toHaveBeenCalledWith('/projects/readme.md')
      expect(useWorkspaceStore.getState().workspacePath).toBe('/projects')
    })
  })

  describe('addFolderToWorkspace', () => {
    it('应添加文件夹到当前工作区并授权', async () => {
      await useWorkspaceStore.getState().addFolderToWorkspace('/workspace2')

      expect(mockGrant).toHaveBeenCalledWith(['/workspace2'])
      expect(mockAddRoot).toHaveBeenCalledWith('/workspace2')
    })

    it('无 workspace 时设置为 workspacePath 并持久化', async () => {
      await useWorkspaceStore.getState().addFolderToWorkspace('/workspace1')

      expect(useWorkspaceStore.getState().workspacePath).toBe('/workspace1')
      expect(mockStoreSet).toHaveBeenCalledWith('lastWorkspace', '/workspace1')
    })

    it('已有 workspace 时不覆盖 workspacePath', async () => {
      useWorkspaceStore.setState({ workspacePath: '/existing' })
      await useWorkspaceStore.getState().addFolderToWorkspace('/workspace2')

      expect(useWorkspaceStore.getState().workspacePath).toBe('/existing')
      expect(mockStoreSet).not.toHaveBeenCalledWith('lastWorkspace', '/workspace2')
    })

    it('应记录到最近目录', async () => {
      await useWorkspaceStore.getState().addFolderToWorkspace('/workspace2')

      await vi.waitFor(() => {
        expect(mockStoreSet).toHaveBeenCalledWith(
          'recentDirs',
          expect.arrayContaining([expect.objectContaining({ path: '/workspace2' })]),
        )
      })
    })
  })

  describe('validateRecentEntries (exported helper)', () => {
    it('空列表返回空数组', async () => {
      const result = await validateRecentEntries([], 'recentFiles')
      expect(result).toEqual([])
    })

    it('undefined 返回空数组', async () => {
      const result = await validateRecentEntries(undefined, 'recentFiles')
      expect(result).toEqual([])
    })

    it('全部失效时回写空数组', async () => {
      mockCheckExists.mockResolvedValue([false, false])

      const result = await validateRecentEntries(
        [
          { path: '/a.md', name: 'a.md', timestamp: 1 },
          { path: '/b.md', name: 'b.md', timestamp: 2 },
        ],
        'recentFiles',
      )

      expect(result).toEqual([])
      expect(mockStoreSet).toHaveBeenCalledWith('recentFiles', [])
    })
  })
})
