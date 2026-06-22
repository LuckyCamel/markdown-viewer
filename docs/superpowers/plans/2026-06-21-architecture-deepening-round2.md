# 架构加深执行计划

> **For agentic workers:** 按任务顺序执行，每项使用 checkbox (`- [ ]`) 跟踪。完成后运行验证命令。

**目标：** 补齐测试覆盖空白，消除已知摩擦点。共 14 个 Task（9 个候选拆分）。

**技术栈：** Vitest、React Testing Library、Zustand、Electron、TypeScript

**全局约束：**
- 不引入新依赖（项目已有 `@testing-library/react`、`vitest`、`playwright`）
- 所有新测试文件遵循现有 mock 模式：`vi.mock('../lib/ipc')` 
- 主进程测试导入 `vitest` 而非全局（与 `vitest.config.main.ts` 一致）
- 每个 Task 完成后运行对应验证命令
- 不改动 `shared/types.ts`（候选 7 除外——该候选本身就是清理它）

---

### Task 1（候选 6）：DEFAULT_IGNORE 去重

**文件：** `src/main/store.ts`

**目标：** `store.ts:17` 不再内联重复数组，改为从 `files.ts` 导入。

- [ ] **Step 1: store.ts 导入 DEFAULT_IGNORE**

编辑 `src/main/store.ts`，在第 5 行后添加 import：
```ts
import { DEFAULT_IGNORE } from './files'
```

第 17 行改为：
```ts
  ignoreList: [...DEFAULT_IGNORE],
```

**验证：**
```bash
npx tsc --noEmit -p tsconfig.node.json && npx vitest run --config vitest.config.main.ts
```

---

### Task 2（候选 4）：ContentSearch useEffect 依赖修复

**文件：** `src/renderer/features/search/ContentSearch.tsx`

**目标：** 消除 deps 数组不完整导致的过时闭包风险，采用 ref 模式。

- [ ] **Step 1: 将 handleResult 移入 effect 内部**

编辑第 23-28 行。将 `onResult` 回调定义移入 `useEffect` 内部，保证每次 effect 重建时使用最新引用：

```ts
  useEffect(() => {
    if (!query || query.length < 2) return
    setIsSearching(true)
    setResults(null)

    const handleResult = (progress: SearchProgress) => {
      setResults(progress)
    }

    ipc.search.onResult(handleResult)
    ipc.search.searchContent(workspacePath, query)

    return () => {
      ipc.search.offResult(handleResult)
    }
  }, [query, workspacePath, setResults, setIsSearching])
```

删除原有的外部 `onResult` 函数定义（第 23-25 行）。

**验证：**
```bash
npx tsc --noEmit -p tsconfig.web.json
```

---

### Task 3（候选 2C）：useSearchStore 测试

**文件：** `src/renderer/features/search/useSearchStore.test.ts`（新建）

**目标：** 纯状态 store 独立测试，覆盖所有 action。

- [ ] **Step 1: 创建测试文件**

纯状态 store，无需 mock。

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useSearchStore } from './useSearchStore'

describe('useSearchStore', () => {
  beforeEach(() => {
    useSearchStore.setState({ query: '', results: null, isSearching: false })
  })

  it('初始状态为空', () => {
    const s = useSearchStore.getState()
    expect(s.query).toBe('')
    expect(s.results).toBeNull()
    expect(s.isSearching).toBe(false)
  })

  it('setQuery 更新查询', () => {
    useSearchStore.getState().setQuery('test')
    expect(useSearchStore.getState().query).toBe('test')
  })

  it('setResults 更新结果', () => {
    const results = { totalFiles: 1, searchedFiles: 0, matches: [] }
    useSearchStore.getState().setResults(results)
    expect(useSearchStore.getState().results).toBe(results)
  })

  it('setIsSearching 更新搜索状态', () => {
    useSearchStore.getState().setIsSearching(true)
    expect(useSearchStore.getState().isSearching).toBe(true)
  })

  it('reset 清空所有字段', () => {
    useSearchStore.setState({ query: 'x', results: {} as any, isSearching: true })
    useSearchStore.getState().reset()
    const s = useSearchStore.getState()
    expect(s.query).toBe('')
    expect(s.results).toBeNull()
    expect(s.isSearching).toBe(false)
  })
})
```

**验证：**
```bash
npx vitest run src/renderer/features/search/useSearchStore.test.ts
```

---

### Task 4（候选 2A）：useTabStore 测试

**文件：** `src/renderer/features/tabs/useTabStore.test.ts`（新建）

**目标：** 重点覆盖 `dirtyFiles` Set 不变性、打开/关闭/激活/脏标记完整逻辑链。

- [ ] **Step 1: 创建测试文件**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useTabStore } from './useTabStore'

describe('useTabStore', () => {
  beforeEach(() => {
    useTabStore.setState({ openFiles: [], activeFile: null, dirtyFiles: new Set() })
  })

  describe('openFile', () => {
    it('追加新文件并设为 activeFile', () => {
      useTabStore.getState().openFile('/a.md')
      const s = useTabStore.getState()
      expect(s.openFiles).toEqual(['/a.md'])
      expect(s.activeFile).toBe('/a.md')
    })

    it('重复文件只更新 activeFile 不追加', () => {
      useTabStore.getState().openFile('/a.md')
      useTabStore.getState().openFile('/b.md')
      useTabStore.getState().openFile('/a.md')
      const s = useTabStore.getState()
      expect(s.openFiles).toEqual(['/a.md', '/b.md'])
      expect(s.activeFile).toBe('/a.md')
    })
  })

  describe('closeFile', () => {
    it('关闭激活文件 → 激活相邻文件', () => {
      useTabStore.setState({ openFiles: ['/a.md', '/b.md', '/c.md'], activeFile: '/b.md' })
      useTabStore.getState().closeFile('/b.md')
      const s = useTabStore.getState()
      expect(s.openFiles).toEqual(['/a.md', '/c.md'])
      expect(s.activeFile).toBe('/c.md')
    })

    it('关闭最后一个文件 → activeFile 为 null', () => {
      useTabStore.setState({ openFiles: ['/a.md'], activeFile: '/a.md' })
      useTabStore.getState().closeFile('/a.md')
      const s = useTabStore.getState()
      expect(s.openFiles).toEqual([])
      expect(s.activeFile).toBeNull()
    })

    it('关闭非激活文件 → activeFile 不变', () => {
      useTabStore.setState({ openFiles: ['/a.md', '/b.md'], activeFile: '/a.md' })
      useTabStore.getState().closeFile('/b.md')
      expect(useTabStore.getState().activeFile).toBe('/a.md')
    })

    it('关闭文件后清除该文件的 dirty 标记', () => {
      useTabStore.setState({
        openFiles: ['/a.md', '/b.md'],
        activeFile: '/a.md',
        dirtyFiles: new Set(['/a.md', '/b.md']),
      })
      useTabStore.getState().closeFile('/b.md')
      const s = useTabStore.getState()
      expect(s.dirtyFiles.has('/b.md')).toBe(false)
      expect(s.dirtyFiles.has('/a.md')).toBe(true)
    })
  })

  describe('closeOthers', () => {
    it('只保留指定文件', () => {
      useTabStore.setState({
        openFiles: ['/a.md', '/b.md', '/c.md'],
        activeFile: '/a.md',
      })
      useTabStore.getState().closeOthers('/b.md')
      const s = useTabStore.getState()
      expect(s.openFiles).toEqual(['/b.md'])
      expect(s.activeFile).toBe('/b.md')
    })
  })

  describe('closeAll', () => {
    it('清空 openFiles 和 activeFile', () => {
      useTabStore.setState({ openFiles: ['/a.md'], activeFile: '/a.md' })
      useTabStore.getState().closeAll()
      const s = useTabStore.getState()
      expect(s.openFiles).toEqual([])
      expect(s.activeFile).toBeNull()
    })
  })

  describe('dirtyFiles', () => {
    it('markDirty 创建新 Set 实例（不变性）', () => {
      const before = useTabStore.getState().dirtyFiles
      useTabStore.getState().markDirty('/a.md')
      const after = useTabStore.getState().dirtyFiles
      expect(after).not.toBe(before)
      expect(after.has('/a.md')).toBe(true)
    })

    it('clearDirty 创建新 Set 实例', () => {
      useTabStore.setState({ dirtyFiles: new Set(['/a.md', '/b.md']) })
      const before = useTabStore.getState().dirtyFiles
      useTabStore.getState().clearDirty('/a.md')
      const after = useTabStore.getState().dirtyFiles
      expect(after).not.toBe(before)
      expect(after.has('/a.md')).toBe(false)
      expect(after.has('/b.md')).toBe(true)
    })

    it('markDirty 不影响其他标记', () => {
      useTabStore.setState({ dirtyFiles: new Set(['/a.md']) })
      useTabStore.getState().markDirty('/b.md')
      const s = useTabStore.getState()
      expect(s.dirtyFiles.has('/a.md')).toBe(true)
      expect(s.dirtyFiles.has('/b.md')).toBe(true)
    })
  })

  describe('setActive', () => {
    it('切换激活文件', () => {
      useTabStore.setState({ openFiles: ['/a.md', '/b.md'], activeFile: '/a.md' })
      useTabStore.getState().setActive('/b.md')
      expect(useTabStore.getState().activeFile).toBe('/b.md')
    })
  })
})
```

**验证：**
```bash
npx vitest run src/renderer/features/tabs/useTabStore.test.ts
```

---

### Task 5（候选 2B）：useFileStore 测试

**文件：** `src/renderer/features/file-tree/useFileStore.test.ts`（新建）

**目标：** 覆盖惰性加载守卫、展开/折叠逻辑、loadChildren 去重。

- [ ] **Step 1: 创建测试文件**

mock `ipc.files.listDirectory`。

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useFileStore } from './useFileStore'
import type { FileEntry } from '../../../shared/types'

const mockListDirectory = vi.fn()

vi.mock('../../lib/ipc', () => ({
  ipc: { files: { listDirectory: (...args: unknown[]) => mockListDirectory(...args) } },
}))

function entry(name: string, isDir = false): FileEntry {
  return { name, path: `/root/${name}`, isDirectory: isDir, isHidden: name.startsWith('.') }
}

describe('useFileStore', () => {
  beforeEach(() => {
    useFileStore.setState({ entries: {}, expanded: {}, loading: {}, rootPath: null })
    vi.clearAllMocks()
  })

  describe('setRoot', () => {
    it('设置 rootPath 并自动 loadChildren', async () => {
      mockListDirectory.mockResolvedValue([entry('a.md'), entry('sub', true)])
      useFileStore.getState().setRoot('/root')
      // setRoot 同步设置 rootPath，异步加载
      expect(useFileStore.getState().rootPath).toBe('/root')
      // 等待异步加载完成
      await vi.waitFor(() => {
        expect(useFileStore.getState().entries['/root']).toHaveLength(2)
      })
    })
  })

  describe('loadChildren', () => {
    it('加载条目并写入 entries', async () => {
      mockListDirectory.mockResolvedValue([entry('readme.md')])
      await useFileStore.getState().loadChildren('/root')
      expect(useFileStore.getState().entries['/root']).toHaveLength(1)
    })

    it('加载完成后清除 loading 标记', async () => {
      mockListDirectory.mockResolvedValue([])
      await useFileStore.getState().loadChildren('/root')
      expect(useFileStore.getState().loading['/root']).toBeUndefined()
    })

    it('正在加载时重复调用不触发第二次 fetch（去重）', async () => {
      let resolve!: (v: FileEntry[]) => void
      mockListDirectory.mockReturnValue(new Promise((r) => { resolve = r }))

      useFileStore.getState().loadChildren('/root')
      useFileStore.getState().loadChildren('/root')
      resolve([])

      await vi.waitFor(() => {
        expect(useFileStore.getState().loading['/root']).toBeUndefined()
      })
      expect(mockListDirectory).toHaveBeenCalledTimes(1)
    })
  })

  describe('toggleExpand', () => {
    it('未展开 → loadChildren → 标记 expanded', async () => {
      mockListDirectory.mockResolvedValue([entry('a.md')])
      await useFileStore.getState().toggleExpand('/sub')
      expect(useFileStore.getState().expanded['/sub']).toBe(true)
    })

    it('已展开 → 移除 expanded 标记，不加载', async () => {
      useFileStore.setState({ expanded: { '/sub': true } })
      await useFileStore.getState().toggleExpand('/sub')
      expect(useFileStore.getState().expanded['/sub']).toBeUndefined()
      expect(mockListDirectory).not.toHaveBeenCalled()
    })
  })
})
```

**验证：**
```bash
npx vitest run src/renderer/features/file-tree/useFileStore.test.ts
```

---

### Task 6（候选 1D）：useFileWatcher 测试

**文件：** `src/renderer/hooks/useFileWatcher.test.ts`（新建）

**目标：** 验证 watch/unwatch 生命周期、change 事件处理、enabled 守卫。

- [ ] **Step 1: 创建测试文件**

mock `ipc.watcher.*` + `useEditorStore` + `useTabStore`。

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useFileWatcher } from './useFileWatcher'

const mockWatchFile = vi.fn()
const mockUnwatchFile = vi.fn()
const mockOnChange = vi.fn()
const mockOffChange = vi.fn()

vi.mock('../lib/ipc', () => ({
  ipc: {
    watcher: {
      watchFile: (...args) => mockWatchFile(...args),
      unwatchFile: (...args) => mockUnwatchFile(...args),
      onChange: (...args) => mockOnChange(...args),
      offChange: (...args) => mockOffChange(...args),
    },
  },
}))

const mockSetContent = vi.fn()
const mockMarkDirty = vi.fn()
const mockClearDirty = vi.fn()

vi.mock('../features/markdown-viewer/useEditorStore', () => ({
  useEditorStore: { getState: () => ({ setContent: mockSetContent }) },
}))
vi.mock('../features/tabs/useTabStore', () => ({
  useTabStore: {
    getState: () => ({ markDirty: mockMarkDirty, clearDirty: mockClearDirty }),
  },
}))

describe('useFileWatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('enabled=true 时为每个文件注册 watchFile', () => {
    renderHook(() => useFileWatcher(['/a.md', '/b.md'], true))
    expect(mockWatchFile).toHaveBeenCalledTimes(2)
    expect(mockWatchFile).toHaveBeenCalledWith('/a.md')
    expect(mockWatchFile).toHaveBeenCalledWith('/b.md')
  })

  it('卸载时为每个文件注销 unwatchFile', () => {
    const { unmount } = renderHook(() => useFileWatcher(['/a.md'], true))
    unmount()
    expect(mockUnwatchFile).toHaveBeenCalledWith('/a.md')
  })

  it('enabled=false 时不注册监听', () => {
    renderHook(() => useFileWatcher(['/a.md'], false))
    expect(mockWatchFile).not.toHaveBeenCalled()
  })

  it('openFiles 为空时不注册监听', () => {
    renderHook(() => useFileWatcher([], true))
    expect(mockWatchFile).not.toHaveBeenCalled()
  })

  it('change 事件 → setContent + markDirty + 2s 后 clearDirty', () => {
    renderHook(() => useFileWatcher(['/a.md'], true))
    const onChangeCb = mockOnChange.mock.calls[0][0]
    onChangeCb({ path: '/a.md', type: 'change' }, 'new content')
    expect(mockSetContent).toHaveBeenCalledWith('/a.md', 'new content')
    expect(mockMarkDirty).toHaveBeenCalledWith('/a.md')

    vi.advanceTimersByTime(2000)
    expect(mockClearDirty).toHaveBeenCalledWith('/a.md')
  })

  it('delete 事件不设置 content', () => {
    renderHook(() => useFileWatcher(['/a.md'], true))
    const onChangeCb = mockOnChange.mock.calls[0][0]
    onChangeCb({ path: '/a.md', type: 'delete' }, null)
    expect(mockSetContent).not.toHaveBeenCalled()
  })

  it('openFiles 变化时重新注册监听', () => {
    const { rerender } = renderHook(
      ({ files }) => useFileWatcher(files, true),
      { initialProps: { files: ['/a.md'] } },
    )
    rerender({ files: ['/a.md', '/b.md'] })
    // 新文件注册、旧文件注销应由 React 清理处理
    expect(mockWatchFile).toHaveBeenCalledWith('/b.md')
  })
})
```

**验证：**
```bash
npx vitest run src/renderer/hooks/useFileWatcher.test.ts
```

---

### Task 7（候选 1C）：useScrollRestore 测试

**文件：** `src/renderer/hooks/useScrollRestore.test.ts`（新建）

**目标：** 验证滚动位置保存/恢复逻辑、DOM 查询守卫、IPC 异常处理。

- [ ] **Step 1: 创建测试文件**

mock `ipc.store.*` + `logError`。

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useScrollRestore } from './useScrollRestore'

const mockStoreGet = vi.fn()
const mockStoreSet = vi.fn()
const mockLogError = vi.fn()

vi.mock('../lib/ipc', () => ({
  ipc: {
    store: {
      get: (...args) => mockStoreGet(...args),
      set: (...args) => mockStoreSet(...args),
    },
  },
}))
vi.mock('../logger', () => ({ logError: (...args) => mockLogError(...args) }))

function setupDOM() {
  document.body.innerHTML = '<main><div></div></main>'
}

function fireScroll(top: number) {
  const el = document.querySelector('main > div:first-child') as HTMLElement
  Object.defineProperty(el, 'scrollTop', { value: top, writable: true })
  el.dispatchEvent(new Event('scroll'))
}

describe('useScrollRestore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('activeFile 为 null 时不保存滚动位置', () => {
    setupDOM()
    renderHook(() => useScrollRestore(null, 'content'))
    fireScroll(100)
    expect(mockStoreSet).not.toHaveBeenCalled()
  })

  it('DOM 容器不存在时不报错', () => {
    document.body.innerHTML = ''
    expect(() => {
      renderHook(() => useScrollRestore('/a.md', 'content'))
    }).not.toThrow()
  })

  it('scroll 事件保存位置到 store', () => {
    setupDOM()
    renderHook(() => useScrollRestore('/a.md', 'content'))
    fireScroll(250)
    expect(mockStoreSet).toHaveBeenCalledWith('readingPositions', { '/a.md': 250 })
  })

  it('activeFile 变化时更新保存的路径', () => {
    setupDOM()
    const { rerender } = renderHook(
      ({ file }) => useScrollRestore(file, 'content'),
      { initialProps: { file: '/a.md' } },
    )
    rerender({ file: '/b.md' })
    fireScroll(300)
    expect(mockStoreSet).toHaveBeenCalledWith('readingPositions', { '/b.md': 300 })
  })

  it('store.set 异常时调用 logError', async () => {
    setupDOM()
    mockStoreSet.mockRejectedValue(new Error('disk full'))
    renderHook(() => useScrollRestore('/a.md', 'content'))
    fireScroll(50)
    await vi.waitFor(() => {
      expect(mockLogError).toHaveBeenCalledWith('useScrollRestore:save', expect.any(Error))
    })
  })

  describe('恢复滚动位置', () => {
    it('从 store 读取位置并设置 scrollTop', async () => {
      setupDOM()
      mockStoreGet.mockResolvedValue({ '/a.md': 120 })
      renderHook(() => useScrollRestore('/a.md', 'content'))
      await vi.waitFor(() => {
        const el = document.querySelector('main > div:first-child') as HTMLElement
        expect(el.scrollTop).toBe(120)
      })
    })

    it('位置不存在时不设置 scrollTop', async () => {
      setupDOM()
      mockStoreGet.mockResolvedValue({ '/other.md': 200 })
      renderHook(() => useScrollRestore('/a.md', 'content'))
      await vi.waitFor(() => {
        expect(mockStoreGet).toHaveBeenCalled()
      })
    })

    it('加载异常时调用 logError', async () => {
      setupDOM()
      mockStoreGet.mockRejectedValue(new Error('read error'))
      renderHook(() => useScrollRestore('/a.md', 'content'))
      await vi.waitFor(() => {
        expect(mockLogError).toHaveBeenCalledWith('useScrollRestore:load', expect.any(Error))
      })
    })

    it('activeFile 为 null 时不恢复', async () => {
      setupDOM()
      renderHook(() => useScrollRestore(null, 'content'))
      expect(mockStoreGet).not.toHaveBeenCalled()
    })

    it('content 为 undefined 时不恢复', async () => {
      setupDOM()
      renderHook(() => useScrollRestore('/a.md', undefined))
      expect(mockStoreGet).not.toHaveBeenCalled()
    })
  })
})
```

**验证：**
```bash
npx vitest run src/renderer/hooks/useScrollRestore.test.ts
```

---

### Task 8（候选 1A）：useWorkspaceInit 测试

**文件：** `src/renderer/hooks/useWorkspaceInit.test.ts`（新建）

**目标：** 覆盖初始化流程——5 个并行 IPC get、状态恢复、handleOpenFolder/File、trackRecent 逻辑。

- [ ] **Step 1: 创建测试文件**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWorkspaceInit } from './useWorkspaceInit'

const mockStoreGet = vi.fn()
const mockStoreSet = vi.fn()
const mockLogError = vi.fn()

vi.mock('../lib/ipc', () => ({
  ipc: {
    store: {
      get: (...args) => mockStoreGet(...args),
      set: (...args) => mockStoreSet(...args),
    },
  },
}))
vi.mock('../logger', () => ({ logError: (...args) => mockLogError(...args) }))

// mock zustand stores
vi.mock('../stores/useUIStore', () => ({
  useUIStore: Object.assign(
    vi.fn(() => ({} as any)),
    { getState: () => ({ setTheme: mockSetTheme }) },
  ),
}))
vi.mock('../features/settings/useSettingsStore', () => ({
  useSettingsStore: {
    getState: () => ({ setIgnoreList: mockSetIgnoreList, loadFromDisk: vi.fn() }),
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

const mockSetTheme = vi.fn()
const mockSetIgnoreList = vi.fn()
const mockOpenFile = vi.fn()
const mockSetActive = vi.fn()
const mockCloseAll = vi.fn()
const mockSetRoot = vi.fn()
const mockReset = vi.fn()

describe('useWorkspaceInit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStoreGet.mockReset()
    mockStoreSet.mockReset()
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
      mockStoreSet.mockRejectedValueOnce(new Error('write error'))
      const { result } = renderHook(() => useWorkspaceInit())
      await act(async () => result.current.handleOpenFolder('/myproject'))
      expect(mockLogError).toHaveBeenCalledWith(expect.stringContaining('trackRecent'), expect.any(Error))
    })
  })

  describe('handleOpenFile', () => {
    it('通过 useTabStore.openFile 打开文件', async () => {
      const { result } = renderHook(() => useWorkspaceInit())
      await act(async () => result.current.handleOpenFile('/file.md'))
      expect(mockOpenFile).toHaveBeenCalledWith('/file.md')
    })
  })
})
```

**验证：**
```bash
npx vitest run src/renderer/hooks/useWorkspaceInit.test.ts
```

---

### Task 9（候选 1B）：useMenuIpc 测试

**文件：** `src/renderer/hooks/useMenuIpc.test.ts`（新建）

**目标：** 验证 10 个 IPC 通道的注册/注销、handler ref 更新、tab 切换逻辑。

- [ ] **Step 1: 创建测试文件**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useMenuIpc } from './useMenuIpc'

const onCalls: Array<[string, (...args: unknown[]) => void]> = []
const offCalls: Array<[string, (...args: unknown[]) => void]> = []

const mockOn = vi.fn((channel: string, cb: (...args: unknown[]) => void) => {
  onCalls.push([channel, cb])
})
const mockOff = vi.fn((channel: string, cb: (...args: unknown[]) => void) => {
  offCalls.push([channel, cb])
})

vi.mock('../lib/ipc', () => ({
  ipc: { ipc: { on: (...args) => mockOn(...args), off: (...args) => mockOff(...args) } },
}))

const mockCloseFile = vi.fn()
const mockSetActive = vi.fn()

vi.mock('../features/tabs/useTabStore', () => ({
  useTabStore: {
    getState: () => ({
      openFiles: ['/a.md', '/b.md', '/c.md'],
      activeFile: '/b.md',
      closeFile: mockCloseFile,
      setActive: mockSetActive,
    }),
  },
}))

describe('useMenuIpc', () => {
  beforeEach(() => {
    onCalls.length = 0
    offCalls.length = 0
    vi.clearAllMocks()
  })

  it('挂载时注册 10 个 IPC 监听', () => {
    renderHook(() =>
      useMenuIpc({
        onOpenFolder: vi.fn(),
        onToggleSidebar: vi.fn(),
        onToggleOutline: vi.fn(),
        onOpenFileSearch: vi.fn(),
        onOpenContentSearch: vi.fn(),
        onToggleSettings: vi.fn(),
      }),
    )
    expect(onCalls).toHaveLength(10)
  })

  it('卸载时注销全部监听', () => {
    const { unmount } = renderHook(() =>
      useMenuIpc({
        onOpenFolder: vi.fn(),
        onToggleSidebar: vi.fn(),
        onToggleOutline: vi.fn(),
        onOpenFileSearch: vi.fn(),
        onOpenContentSearch: vi.fn(),
        onToggleSettings: vi.fn(),
      }),
    )
    unmount()
    expect(offCalls).toHaveLength(10)
  })

  it('menu:openFolder 调用 onOpenFolder', () => {
    const onOpenFolder = vi.fn()
    renderHook(() =>
      useMenuIpc({
        onOpenFolder,
        onToggleSidebar: vi.fn(),
        onToggleOutline: vi.fn(),
        onOpenFileSearch: vi.fn(),
        onOpenContentSearch: vi.fn(),
        onToggleSettings: vi.fn(),
      }),
    )
    const [, cb] = onCalls.find(([ch]) => ch === 'menu:openFolder')!
    ;(cb as (path: string) => void)('/test')
    expect(onOpenFolder).toHaveBeenCalledWith('/test')
  })

  it('menu:toggleFileTree 调用 onToggleSidebar', () => {
    const onToggle = vi.fn()
    renderHook(() =>
      useMenuIpc({
        onOpenFolder: vi.fn(),
        onToggleSidebar: onToggle,
        onToggleOutline: vi.fn(),
        onOpenFileSearch: vi.fn(),
        onOpenContentSearch: vi.fn(),
        onToggleSettings: vi.fn(),
      }),
    )
    const [, cb] = onCalls.find(([ch]) => ch === 'menu:toggleFileTree')!
    ;(cb as () => void)()
    expect(onToggle).toHaveBeenCalled()
  })

  it('menu:closeTab 调用 closeFile', () => {
    renderHook(() =>
      useMenuIpc({
        onOpenFolder: vi.fn(),
        onToggleSidebar: vi.fn(),
        onToggleOutline: vi.fn(),
        onOpenFileSearch: vi.fn(),
        onOpenContentSearch: vi.fn(),
        onToggleSettings: vi.fn(),
      }),
    )
    const [, cb] = onCalls.find(([ch]) => ch === 'menu:closeTab')!
    ;(cb as () => void)()
    expect(mockCloseFile).toHaveBeenCalledWith('/b.md')
  })

  it('menu:nextTab 循环到下一个', () => {
    renderHook(() =>
      useMenuIpc({
        onOpenFolder: vi.fn(),
        onToggleSidebar: vi.fn(),
        onToggleOutline: vi.fn(),
        onOpenFileSearch: vi.fn(),
        onOpenContentSearch: vi.fn(),
        onToggleSettings: vi.fn(),
      }),
    )
    const [, cb] = onCalls.find(([ch]) => ch === 'menu:nextTab')!
    ;(cb as () => void)()
    expect(mockSetActive).toHaveBeenCalledWith('/c.md')
  })

  it('menu:prevTab 循环到上一个', () => {
    renderHook(() =>
      useMenuIpc({
        onOpenFolder: vi.fn(),
        onToggleSidebar: vi.fn(),
        onToggleOutline: vi.fn(),
        onOpenFileSearch: vi.fn(),
        onOpenContentSearch: vi.fn(),
        onToggleSettings: vi.fn(),
      }),
    )
    const [, cb] = onCalls.find(([ch]) => ch === 'menu:prevTab')!
    ;(cb as () => void)()
    expect(mockSetActive).toHaveBeenCalledWith('/a.md')
  })

  it('handler 更新后 IPC 事件使用新 handler', () => {
    const oldHandler = vi.fn()
    const newHandler = vi.fn()
    const { rerender } = renderHook(
      ({ handler }) =>
        useMenuIpc({
          onOpenFolder: handler,
          onToggleSidebar: vi.fn(),
          onToggleOutline: vi.fn(),
          onOpenFileSearch: vi.fn(),
          onOpenContentSearch: vi.fn(),
          onToggleSettings: vi.fn(),
        }),
      { initialProps: { handler: oldHandler } },
    )
    rerender({ handler: newHandler })
    const [, cb] = onCalls.find(([ch]) => ch === 'menu:openFolder')!
    ;(cb as (path: string) => void)('/test')
    expect(newHandler).toHaveBeenCalledWith('/test')
    expect(oldHandler).not.toHaveBeenCalled()
  })
})
```

**验证：**
```bash
npx vitest run src/renderer/hooks/useMenuIpc.test.ts
```

---

### Task 10（候选 3）：ErrorBoundary 测试

**文件：** `src/renderer/components/ErrorBoundary.test.tsx`（新建）

**目标：** 验证 throw 子组件时降级 UI 出现 + `logError` 调用。

- [ ] **Step 1: 创建测试文件**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

const mockLogError = vi.fn()
vi.mock('../logger', () => ({ logError: (...args: unknown[]) => mockLogError(...args) }))

function Thrower({ msg }: { msg: string }): React.ReactElement {
  throw new Error(msg)
  // unreachable, but kept to satisfy return type
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 抑制 React 错误输出到控制台（渲染 throw 是期望行为）
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('正常渲染时透传子组件', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">正常内容</div>
      </ErrorBoundary>,
    )
    expect(screen.getByTestId('child')).toBeDefined()
  })

  it('子组件 throw 时渲染降级 UI', () => {
    render(
      <ErrorBoundary>
        <Thrower msg="测试错误" />
      </ErrorBoundary>,
    )
    expect(screen.getByText('出错了')).toBeDefined()
    expect(screen.getByText('测试错误')).toBeDefined()
  })

  it('componentDidCatch 调用 logError', () => {
    render(
      <ErrorBoundary>
        <Thrower msg="边界错误" />
      </ErrorBoundary>,
    )
    expect(mockLogError).toHaveBeenCalledWith('ErrorBoundary', expect.any(Error))
  })

  it('通过 key 强制重新挂载后恢复', () => {
    const { rerender } = render(
      <ErrorBoundary key="1">
        <Thrower msg="crash" />
      </ErrorBoundary>,
    )
    expect(screen.getByText('出错了')).toBeDefined()

    rerender(
      <ErrorBoundary key="2">
        <div data-testid="recovered">恢复</div>
      </ErrorBoundary>,
    )
    expect(screen.getByTestId('recovered')).toBeDefined()
  })
})
```

**验证：**
```bash
npx vitest run src/renderer/components/ErrorBoundary.test.tsx
```

---

### Task 11（候选 9）：dirtyFiles 防御封装

**文件：** `src/renderer/features/tabs/useTabStore.ts`

**目标：** 用 `isDirty()` getter 替代直接暴露 `dirtyFiles: Set<string>`，消除外部代码原地修改 Set 的风险。

- [ ] **Step 1: 接口增加 isDirty，dirtyFiles 移出接口**

编辑 `useTabStore.ts`：

```ts
interface TabState {
  openFiles: string[]
  activeFile: string | null
  isDirty: (filePath: string) => boolean
  // dirtyFiles: Set<string>  // 从接口移除，保留为内部实现
  openFile: (filePath: string) => void
  // ... rest unchanged
}
```

create 内部：
```ts
export const useTabStore = create<TabState>((set, get) => ({
  openFiles: [],
  activeFile: null,
  dirtyFiles: new Set<string>(), // 内部实现，不在接口中
  isDirty: (filePath) => get().dirtyFiles.has(filePath),
  // ... rest unchanged
}))
```

- [ ] **Step 2: 更新外部消费者**

搜索 `dirtyFiles` 引用并替换为 `isDirty`。

**验证：**
```bash
npx tsc --noEmit -p tsconfig.web.json && npx vitest run src/renderer/features/tabs/useTabStore.test.ts
```

---

### Task 12（候选 7）：IPC_CHANNELS 常量清理

**文件：**
- `src/shared/types.ts` — 修正 + 保留
- `src/main/index.ts` — 替换裸字符串
- `src/preload/index.ts` — 替换裸字符串

**目标：** 统一使用 `IPC_CHANNELS.*` 常量，消除裸字符串。

- [ ] **Step 1: 修正 types.ts 中不匹配的通道名**

编辑 `src/shared/types.ts` 第 5-10 行：

```ts
export const IPC_CHANNELS = {
  LIST_DIRECTORY: 'files:listDirectory',
  READ_FILE: 'files:readFile',
  GET_FILE_INFO: 'files:getFileInfo',
  STORE_GET: 'store:get',
  STORE_SET: 'store:set',
  STORE_DELETE: 'store:delete',
  SEARCH_CONTENT: 'files:searchContent',      // 修正
  SEARCH_RESULT: 'search:result',             // 修正
  WATCH_FILE: 'watcher:watchFile',
  UNWATCH_FILE: 'watcher:unwatchFile',
  FILE_CHANGED: 'watcher:change',             // 修正
  OPEN_DIRECTORY: 'dialog:openDirectory',
  OPEN_FILE: 'dialog:openFile',
  OPEN_EXTERNAL: 'shell:openExternal',
  MENU_PREFIX: 'menu:',                       // 新增：菜单通道前缀
  WATCHER_CHANGE: 'watcher:change',           // 新增：watcher change 事件
} as const
```

删除无用键 `SEARCH_DONE`（无使用点）。

- [ ] **Step 2: 主进程 index.ts 替换裸字符串**

`ipcMain.handle('files:listDirectory', ...)` → `ipcMain.handle(IPC_CHANNELS.LIST_DIRECTORY, ...)`

替换清单：
| 原裸字符串 | 替换为 |
|-----------|--------|
| `'files:listDirectory'` | `IPC_CHANNELS.LIST_DIRECTORY` |
| `'files:readFile'` | `IPC_CHANNELS.READ_FILE` |
| `'files:getFileInfo'` | `IPC_CHANNELS.GET_FILE_INFO` |
| `'store:get'` | `IPC_CHANNELS.STORE_GET` |
| `'store:set'` | `IPC_CHANNELS.STORE_SET` |
| `'store:delete'` | `IPC_CHANNELS.STORE_DELETE` |
| `'dialog:openDirectory'` | `IPC_CHANNELS.OPEN_DIRECTORY` |
| `'dialog:openFile'` | `IPC_CHANNELS.OPEN_FILE` |
| `'shell:openExternal'` | `IPC_CHANNELS.OPEN_EXTERNAL` |
| `'watcher:watchFile'` | `IPC_CHANNELS.WATCH_FILE` |
| `'watcher:unwatchFile'` | `IPC_CHANNELS.UNWATCH_FILE` |
| `'files:searchContent'` | `IPC_CHANNELS.SEARCH_CONTENT` |
| `'search:result'` | `IPC_CHANNELS.SEARCH_RESULT` |

- [ ] **Step 3: Preload index.ts 替换裸字符串**

同上映射表。在 preload 中 import `IPC_CHANNELS`（注意 shared 路径 `../../shared/types`）。

**验证：**
```bash
npx tsc --noEmit -p tsconfig.node.json && npx tsc --noEmit -p tsconfig.web.json && npx vitest run --config vitest.config.main.ts
```

---

### Task 13（候选 5）：主进程 handler 抽取 + 测试

**文件：**
- `src/main/handlers.ts`（新建）
- `src/main/handlers.test.ts`（新建）
- `src/main/index.ts`（修改——改为调用 handler）

**目标：** IPC handler 逻辑从 index.ts 抽取为纯函数，独立可测。

- [ ] **Step 1: 创建 handlers.ts**

```ts
import type { StoreSchema } from './store'
import { listDirectory, readFile, getFileInfo } from './files'
import { searchDirectory } from './search'
import type { SearchProgress } from '../shared/types'

export function handleListDirectory(dirPath: string, ignoreList: string[]) {
  return listDirectory(dirPath, ignoreList)
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

export function handleStoreDelete<T extends keyof StoreSchema>(
  deleter: (key: T) => void,
  key: T,
) {
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
```

- [ ] **Step 2: 修改 index.ts 调用 handler**

```ts
import {
  handleListDirectory,
  handleReadFile,
  handleGetFileInfo,
  handleStoreGet,
  handleStoreSet,
  handleStoreDelete,
  handleSearchContent,
} from './handlers'

// ipcMain.handle('files:listDirectory', ...) 改为：
ipcMain.handle('files:listDirectory', (_event, dirPath: string) =>
  handleListDirectory(dirPath, appStore.get('ignoreList')),
)
// 其余同理
```

- [ ] **Step 3: 创建 handlers.test.ts**

```ts
import { describe, it, expect, vi } from 'vitest'
import {
  handleListDirectory,
  handleStoreGet,
  handleStoreSet,
} from './handlers'

vi.mock('./files', () => ({ listDirectory: vi.fn(), readFile: vi.fn(), getFileInfo: vi.fn() }))
vi.mock('./search', () => ({ searchDirectory: vi.fn() }))

describe('handlers', () => {
  it('handleListDirectory 注入 ignoreList', async () => {
    const { listDirectory } = await import('./files')
    vi.mocked(listDirectory).mockResolvedValue([])
    await handleListDirectory('/test', ['.git'])
    expect(listDirectory).toHaveBeenCalledWith('/test', ['.git'])
  })

  it('handleStoreGet 调用 getter', () => {
    const getter = vi.fn().mockReturnValue('dark')
    expect(handleStoreGet(getter, 'theme')).toBe('dark')
    expect(getter).toHaveBeenCalledWith('theme')
  })

  it('handleStoreSet 调用 setter', () => {
    const setter = vi.fn()
    handleStoreSet(setter, 'theme', 'light')
    expect(setter).toHaveBeenCalledWith('theme', 'light')
  })
})
```

**验证：**
```bash
npx tsc --noEmit -p tsconfig.node.json && npx vitest run --config vitest.config.main.ts
```

---

### Task 14（候选 8）：E2E waitForTimeout 替换

**文件：**
- `e2e/settings.spec.ts`（3 处）
- `e2e/shortcuts.spec.ts`（4 处）
- `e2e/theme.spec.ts`（4 处）

**目标：** 固定 `waitForTimeout` 替换为基于断言的 `waitFor` 或 `locator.waitFor()`。

- [ ] **Step 1: settings.spec.ts**

| 行 | 原代码 | 替换 |
|---|--------|------|
| 10 | `await page.waitForTimeout(500)` | `await page.locator('text=忽略列表').waitFor({ state: 'visible', timeout: 5000 })` |
| 27 | `await page.waitForTimeout(500)` | `await expect(page.locator('...')).toBeVisible({ timeout: 5000 })`（根据上下文选择具体 locator） |
| 36 | `await page.waitForTimeout(300)` | 同上 |

- [ ] **Step 2: shortcuts.spec.ts**

| 行 | 原代码 | 替换 |
|---|--------|------|
| 18 | `await page.waitForTimeout(500)` | `await page.locator('selector').waitFor({ state: 'visible' })` |
| 26, 49, 57 | 同上 | 同上 |

- [ ] **Step 3: theme.spec.ts**

| 行 | 原代码 | 替换 |
|---|--------|------|
| 12 | `await page.waitForTimeout(500)` | `await page.locator('...').waitFor({ state: 'visible' })` |
| 18, 22, 27 | 同上 | 同上 |

具体 locator 选择器需根据实际 E2E 场景确定。优先选择 UI 中稳定出现的文本或 data-testid。

**验证：**
```bash
npx playwright test e2e/settings.spec.ts e2e/shortcuts.spec.ts e2e/theme.spec.ts
```

---

## 执行顺序

| 顺序 | Task | 预估 | 依赖 | 验证范围 |
|------|------|------|------|---------|
| 1 | Task 1: DEFAULT_IGNORE 去重 | 10 min | 无 | tsc + vitest main |
| 2 | Task 2: ContentSearch deps | 10 min | 无 | tsc web |
| 3 | Task 3: useSearchStore 测试 | 15 min | 无 | vitest 单文件 |
| 4 | Task 4: useTabStore 测试 | 25 min | 无 | vitest 单文件 |
| 5 | Task 5: useFileStore 测试 | 25 min | 无 | vitest 单文件 |
| 6 | Task 6: useFileWatcher 测试 | 25 min | 无 | vitest 单文件 |
| 7 | Task 7: useScrollRestore 测试 | 25 min | 无 | vitest 单文件 |
| 8 | Task 8: useWorkspaceInit 测试 | 35 min | 无 | vitest 单文件 |
| 9 | Task 9: useMenuIpc 测试 | 25 min | 无 | vitest 单文件 |
| 10 | Task 10: ErrorBoundary 测试 | 15 min | 无 | vitest 单文件 |
| 11 | Task 11: dirtyFiles 防御 | 15 min | Task 4（消费者需同步） | tsc + vitest |
| 12 | Task 12: IPC_CHANNELS 迁移 | 30 min | 无 | tsc both + vitest main |
| 13 | Task 13: main handler 抽取+测试 | 45 min | 无 | tsc node + vitest main |
| 14 | Task 14: E2E waitForTimeout 替换 | 30 min | 无 | playwright 3 文件 |

**预估总工时：约 5.5 小时。**
