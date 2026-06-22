# Architecture Deepening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 6-part architecture deepening: extract App.tsx into feature hooks, fix ignore list blind spot, remove dead code, unify module layout, add IPC adapter, fix FileTree subscription, and add missing store tests.

**Architecture:** Electron IPC with React 19 renderer. Zustand stores for state. Vitest for unit tests, Playwright for E2E. Each task is independent and testable in isolation.

**Tech Stack:** Electron 42, React 19, zustand 5, vitest 4, TypeScript 6, Tailwind 3.

## Global Constraints

- All existing tests must pass after each task
- No new dependencies
- IPC adapter must be a pure wrapper (no error handling abstraction)
- Hooks use `initialized` flag for effect ordering, not events
- `createStore.ts` has zero imports — delete, don't deprecate
- Use `pnpm run test` for renderer tests, `pnpm run test:main` for main process tests
- Use `pnpm run test:e2e` to validate no regression after all tasks

---

## File Structure

### Files to Create

| File | Responsibility |
|------|---------------|
| `src/renderer/lib/ipc.ts` | Centralized typed wrapper around all `window.api.*` calls |
| `src/renderer/hooks/useWorkspaceInit.ts` | Restore persisted state, provide workspace/open/handlers |
| `src/renderer/hooks/useFileWatcher.ts` | Watch/unwatch files based on `openFiles` array |
| `src/renderer/hooks/useScrollRestore.ts` | Save/restore scroll position per file |
| `src/renderer/hooks/useMenuIpc.ts` | Register `menu:*` IPC handlers with cleanup |
| `src/renderer/features/markdown-viewer/useEditorStore.test.ts` | Test content loading, error, removal |
| `src/renderer/features/settings/useSettingsStore.test.ts` | Test load/save to disk |

### Files to Move

| From | To |
|------|----|
| `src/renderer/stores/useEditorStore.ts` | `src/renderer/features/markdown-viewer/useEditorStore.ts` |
| `src/renderer/stores/useSettingsStore.ts` | `src/renderer/features/settings/useSettingsStore.ts` |

### Files to Delete

- `src/renderer/stores/createStore.ts`
- `tests/` directory (empty)
- `resources/` directory (empty)

### Files to Modify

| File | Change |
|------|--------|
| `src/renderer/stores/useUIStore.ts` | (none — stays in place) |
| `src/renderer/features/file-tree/useFileStore.ts` | `expanded: Set<string>` → `Record<string, boolean>`, same for `loading` |
| `src/renderer/features/file-tree/FileTree.tsx` | Pass `allEntries` via prop, remove per-node zustand subscription |
| `src/main/files.ts` | Add `ignoreList` param, extract `DEFAULT_IGNORE` |
| `src/main/search.ts` | Add `ignoreList` param to `walkDir` |
| `src/main/index.ts` | Read store before calling `listDirectory`/`searchDirectory` |
| `src/renderer/App.tsx` | Replace inline logic with 4 hook calls |
| `src/renderer/App.test.tsx` | Update mocks to use `ipc` module |
| `src/renderer/test/setup.ts` | Remove `window.api` mock after migration to ipc.ts |
| `src/renderer/features/welcome/WelcomePage.tsx` | Replace `window.api.*` → `ipc.*` |
| `src/renderer/features/settings/SettingsPanel.tsx` | Replace `window.api.*` → `ipc.*`, update store import path |
| `src/renderer/features/search/ContentSearch.tsx` | Replace `window.api.*` → `ipc.*` |
| `src/renderer/features/markdown-viewer/MarkdownViewer.tsx` | Replace `window.api.*` → `ipc.*` |
| `src/main/files.spec.ts` | Add test for `ignoreList` parameter |
| `src/main/search.spec.ts` | No change needed (searchInFile unchanged) |

---

### Task 1: Dead Code Cleanup + Store Relocation

**Files:**
- Delete: `src/renderer/stores/createStore.ts`
- Move: `src/renderer/stores/useEditorStore.ts` → `src/renderer/features/markdown-viewer/useEditorStore.ts`
- Move: `src/renderer/stores/useSettingsStore.ts` → `src/renderer/features/settings/useSettingsStore.ts`
- Delete: `tests/` directory (empty)
- Delete: `resources/` directory (empty)
- Modify: `src/renderer/stores/useUIStore.ts` (unchanged, stays)
- Modify: all files importing from old store paths

**Consumes:** Nothing (first task)
**Produces:** Clean directory structure, stores at correct locations

- [ ] **Step 1: Delete dead code and empty directories**

Run:
```bash
git rm src/renderer/stores/createStore.ts
rmdir tests resources 2>/dev/null; return 0
```

- [ ] **Step 2: Create `features/markdown-viewer/useEditorStore.ts`**

Content is identical to the current `src/renderer/stores/useEditorStore.ts`:

```ts
import { create } from 'zustand'

interface EditorState {
  contents: Record<string, string>
  loading: Record<string, boolean>
  errors: Record<string, string>
  loadContent: (filePath: string) => Promise<void>
  setContent: (filePath: string, content: string) => void
  removeContent: (filePath: string) => void
}

export const useEditorStore = create<EditorState>((set) => ({
  contents: {},
  loading: {},
  errors: {},
  loadContent: async (filePath) => {
    set((s) => ({ loading: { ...s.loading, [filePath]: true } }))
    try {
      const result = await window.api.files.readFile(filePath)
      set((s) => ({
        contents: { ...s.contents, [filePath]: result.content },
        loading: { ...s.loading, [filePath]: false },
      }))
    } catch (e) {
      set((s) => ({
        errors: { ...s.errors, [filePath]: String(e) },
        loading: { ...s.loading, [filePath]: false },
      }))
    }
  },
  setContent: (filePath, content) =>
    set((s) => ({ contents: { ...s.contents, [filePath]: content } })),
  removeContent: (filePath) =>
    set((s) => {
      const { [filePath]: _c, ...rest } = s.contents
      const { [filePath]: _l, ...restLoading } = s.loading
      const { [filePath]: _e, ...restErrors } = s.errors
      return { contents: rest, loading: restLoading, errors: restErrors }
    }),
}))
```

- [ ] **Step 3: Create `features/settings/useSettingsStore.ts`**

Content is identical to the current `src/renderer/stores/useSettingsStore.ts`:

```ts
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
```

- [ ] **Step 4: Delete old files**

```bash
git rm src/renderer/stores/useEditorStore.ts
git rm src/renderer/stores/useSettingsStore.ts
```

- [ ] **Step 5: Update all import paths**

Use grep to find all files importing from old paths:

**`src/renderer/App.tsx`** — lines 3-4:
```ts
import { useEditorStore } from './stores/useEditorStore'
import { useSettingsStore } from './stores/useSettingsStore'
```
Change to:
```ts
import { useEditorStore } from './features/markdown-viewer/useEditorStore'
import { useSettingsStore } from './features/settings/useSettingsStore'
```

**`src/renderer/App.test.tsx`** — no import change (it doesn't import these stores directly).

**`src/renderer/features/settings/SettingsPanel.tsx`** — line 1-2:
```ts
import { useUIStore } from '../../stores/useUIStore'
import { useSettingsStore } from '../../stores/useSettingsStore'
```
Change to:
```ts
import { useUIStore } from '../../stores/useUIStore'
import { useSettingsStore } from './useSettingsStore'
```

- [ ] **Step 6: Run tests to verify**

```bash
pnpm run test
pnpm run test:main
```

Expected: All existing tests pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: remove dead code, move stores to feature dirs"
```

---

### Task 2: Centralized IPC Adapter

**Files:**
- Create: `src/renderer/lib/ipc.ts`
- Modify: all renderer files that reference `window.api.*`
- Modify: `src/renderer/test/setup.ts`
- Modify: `src/renderer/App.test.tsx`

**Consumes:** Task 1 (clean store paths)
**Produces:** `ipc` module with all IPC calls, test setup updated

- [ ] **Step 1: Create `src/renderer/lib/ipc.ts`**

```ts
import type { FileEntry, FileContent, FileChangeEvent, SearchProgress } from '../../shared/types'

export const ipc = {
  files: {
    listDirectory: (dirPath: string): Promise<FileEntry[]> =>
      window.api.files.listDirectory(dirPath),
    readFile: (filePath: string): Promise<FileContent> =>
      window.api.files.readFile(filePath),
    getFileInfo: (filePath: string): Promise<FileEntry> =>
      window.api.files.getFileInfo(filePath),
  },
  search: {
    searchContent: (dirPath: string, query: string): void =>
      window.api.search.searchContent(dirPath, query),
    onResult: (cb: (result: SearchProgress) => void): void =>
      window.api.search.onResult(cb),
    offResult: (cb: (result: SearchProgress) => void): void =>
      window.api.search.offResult(cb),
  },
  watcher: {
    watchFile: (filePath: string): void =>
      window.api.watcher.watchFile(filePath),
    unwatchFile: (filePath: string): void =>
      window.api.watcher.unwatchFile(filePath),
    onChange: (cb: (event: FileChangeEvent, content: string | null) => void): void =>
      window.api.watcher.onChange(cb),
    offChange: (cb: (event: FileChangeEvent, content: string | null) => void): void =>
      window.api.watcher.offChange(cb),
  },
  store: {
    get: <T>(key: string): Promise<T | undefined> =>
      window.api.store.get<T>(key),
    set: (key: string, value: unknown): Promise<void> =>
      window.api.store.set(key, value),
    del: (key: string): Promise<void> =>
      window.api.store.delete(key),
  },
  dialog: {
    openDirectory: (): Promise<string | null> =>
      window.api.dialog.openDirectory(),
    openFile: (): Promise<string | null> =>
      window.api.dialog.openFile(),
  },
  shell: {
    openExternal: (url: string): Promise<void> =>
      window.api.shell.openExternal(url),
  },
  ipc: {
    on: (channel: string, cb: (...args: unknown[]) => void): void =>
      window.api.ipc.on(channel, cb),
    off: (channel: string, cb: (...args: unknown[]) => void): void =>
      window.api.ipc.off(channel, cb),
  },
}
```

- [ ] **Step 2: Global replace `window.api.` → `ipc.` in all renderer files**

Files to update with their specific replacements:

**`src/renderer/features/welcome/WelcomePage.tsx`**:
- Add import: `import { ipc } from '../../lib/ipc'`
- `window.api.store.get` → `ipc.store.get` (lines 12, 15)
- `window.api.dialog.openDirectory` → `ipc.dialog.openDirectory` (line 21)
- `window.api.store.set` → `ipc.store.set` (lines 23, 60)
- `window.api.dialog.openFile` → `ipc.dialog.openFile` (line 29)

**`src/renderer/features/settings/SettingsPanel.tsx`**:
- Add import: `import { ipc } from '../../lib/ipc'`
- `window.api.store.set` → `ipc.store.set` (line 20)

**`src/renderer/features/search/ContentSearch.tsx`**:
- Add import: `import { ipc } from '../../lib/ipc'`
- `window.api.search.onResult(onResult)` → `ipc.search.onResult(onResult)` (line 26)
- `window.api.search.searchContent(workspacePath, query)` → `ipc.search.searchContent(workspacePath, query)` (line 27)
- `window.api.search.offResult(onResult)` → `ipc.search.offResult(onResult)` (line 30)

**`src/renderer/features/markdown-viewer/MarkdownViewer.tsx`**:
- Add import: `import { ipc } from '../../lib/ipc'`
- `window.api.shell.openExternal(href)` → `ipc.shell.openExternal(href)` (line 49)

**`src/renderer/features/file-tree/useFileStore.ts`**:
- Add import: `import { ipc } from '../../../lib/ipc'`
- `window.api.files.listDirectory(dirPath)` → `ipc.files.listDirectory(dirPath)` (line 40)

**`src/renderer/stores/useEditorStore.ts`** (new path: `src/renderer/features/markdown-viewer/useEditorStore.ts`):
- Add import: `import { ipc } from '../../../lib/ipc'`
- `window.api.files.readFile(filePath)` → `ipc.files.readFile(filePath)` (line 19 of new file)

**`src/renderer/stores/useSettingsStore.ts`** (new path: `src/renderer/features/settings/useSettingsStore.ts`):
- Add import: `import { ipc } from '../../../lib/ipc'`
- `window.api.store.get<string[]>('ignoreList')` → `ipc.store.get<string[]>('ignoreList')` (line 14 of new file)
- `window.api.store.set('ignoreList', ignoreList)` → `ipc.store.set('ignoreList', ignoreList)` (line 19 of new file)

**`src/renderer/App.tsx`**:
- Add import: `import { ipc } from './lib/ipc'`
- Replace 18 occurrences of `window.api.*` with `ipc.*` (lines 57, 63, 72, 90-94, 119, 127, 129-130, 136, 142, 151, 162, 178-179)

- [ ] **Step 3: Update test setup**

`src/renderer/test/setup.ts` — no change needed yet. The `window.api` mock stays as fallback. Individual test files can optionally mock `@/lib/ipc` instead.

- [ ] **Step 4: Update `App.test.tsx` to mock via ipc**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import App from './App'
import { useTabStore } from './features/tabs/useTabStore'
import { useUIStore } from './stores/useUIStore'

const mockIpc = {
  store: { get: vi.fn(), set: vi.fn(), del: vi.fn() },
  files: { listDirectory: vi.fn(), readFile: vi.fn(), getFileInfo: vi.fn() },
  search: { searchContent: vi.fn(), onResult: vi.fn(), offResult: vi.fn() },
  watcher: { watchFile: vi.fn(), unwatchFile: vi.fn(), onChange: vi.fn(), offChange: vi.fn() },
  dialog: { openDirectory: vi.fn(), openFile: vi.fn() },
  shell: { openExternal: vi.fn() },
  ipc: { on: vi.fn(), off: vi.fn() },
}

vi.mock('./lib/ipc', () => ({ ipc: mockIpc }))

describe('App', () => {
  beforeEach(() => {
    useTabStore.setState({ openFiles: [], activeFile: null })
    useUIStore.setState({ sidebarVisible: true, outlineVisible: true, searchPanel: 'none' })
    vi.clearAllMocks()
  })

  it('should show WelcomePage when no workspace', () => {
    render(<App />)
    expect(screen.getByText('Markdown Viewer')).toBeDefined()
  })

  it('should restore workspace from electron-store on mount', async () => {
    mockIpc.store.get.mockImplementation(async (key: string) => {
      if (key === 'lastWorkspace') return '/test/workspace'
      return undefined
    })

    await act(async () => {
      render(<App />)
    })

    expect(screen.getByText('workspace')).toBeDefined()
  })

  it('should respond to menu IPC events', async () => {
    const handlers = new Map<string, (...args: unknown[]) => void>()
    mockIpc.ipc.on.mockImplementation((channel: string, cb: (...args: unknown[]) => void) => {
      handlers.set(channel, cb)
    })
    mockIpc.store.get.mockImplementation(async () => undefined)

    render(<App />)

    act(() => {
      handlers.get('menu:toggleFileTree')!()
    })
    expect(useUIStore.getState().sidebarVisible).toBe(false)

    act(() => {
      handlers.get('menu:toggleOutline')!()
    })
    expect(useUIStore.getState().outlineVisible).toBe(false)

    act(() => {
      handlers.get('menu:fileSearch')!()
    })
    expect(useUIStore.getState().searchPanel).toBe('file')

    act(() => {
      handlers.get('menu:contentSearch')!()
    })
    expect(useUIStore.getState().searchPanel).toBe('content')
  })

  it('should handle menu:closeTab', async () => {
    mockIpc.store.get.mockImplementation(async () => undefined)
    mockIpc.files.readFile.mockImplementation(async () => ({ path: '/test/a.md', content: 'a' }))
    mockIpc.files.listDirectory.mockImplementation(async () => [
      { name: 'a.md', path: '/test/a.md', isDirectory: false, isHidden: false },
    ])

    const handlers = new Map<string, (...args: unknown[]) => void>()
    mockIpc.ipc.on.mockImplementation((channel: string, cb: (...args: unknown[]) => void) => {
      handlers.set(channel, cb)
    })

    await act(async () => {
      render(<App />)
    })

    await act(async () => {
      useTabStore.getState().openFile('/test/a.md')
    })
    expect(useTabStore.getState().openFiles).toHaveLength(1)

    act(() => {
      handlers.get('menu:closeTab')!()
    })
    expect(useTabStore.getState().openFiles).toHaveLength(0)
  })
})
```

- [ ] **Step 5: Run tests**

```bash
pnpm run test
```

Expected: All renderer tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add centralized IPC adapter (lib/ipc.ts)"
```

---

### Task 3: Ignore List Blind Spot Fix

**Files:**
- Modify: `src/main/files.ts`
- Modify: `src/main/search.ts`
- Modify: `src/main/index.ts`
- Modify: `src/main/files.spec.ts`

**Consumes:** Nothing (main process only, independent)
**Produces:** Working ignore list feature

- [ ] **Step 1: Modify `src/main/files.ts`**

Add `DEFAULT_IGNORE` constant and `ignoreList` parameter:

```ts
import { readdir, readFile as fsReadFile, stat } from 'fs/promises'
import { basename, join } from 'path'
import type { FileEntry, FileContent } from '../shared/types'

const SUPPORTED_EXTENSIONS = ['.md', '.markdown']

export const DEFAULT_IGNORE = ['.git', 'node_modules', '__pycache__', '.DS_Store']

export async function listDirectory(dirPath: string, ignoreList: string[] = DEFAULT_IGNORE): Promise<FileEntry[]> {
  const entries = await readdir(dirPath, { withFileTypes: true })
  const ignoreSet = new Set(ignoreList)
  const result: FileEntry[] = []

  for (const entry of entries) {
    if (ignoreSet.has(entry.name)) continue
    result.push({
      name: entry.name,
      path: join(dirPath, entry.name),
      isDirectory: entry.isDirectory(),
      isHidden: entry.name.startsWith('.'),
    })
  }

  return result.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

// ... rest unchanged
```

- [ ] **Step 2: Modify `src/main/search.ts`**

```ts
async function walkDir(dirPath: string, ignoreList: string[]): Promise<string[]> {
  const files: string[] = []
  const ignoreSet = new Set(ignoreList)
  const entries = await readdir(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    if (ignoreSet.has(entry.name)) continue
    if (entry.name.startsWith('.')) continue
    const fullPath = join(dirPath, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walkDir(fullPath, ignoreList)))
    } else if (TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      files.push(fullPath)
    }
  }
  return files
}

// Update searchDirectory:
export async function searchDirectory(
  dirPath: string,
  query: string,
  onProgress: (progress: SearchProgress) => void,
  ignoreList: string[] = DEFAULT_IGNORE,
): Promise<void> {
  const allFiles = await walkDir(dirPath, ignoreList)
  // ... rest unchanged
```

Add import at top:
```ts
import { DEFAULT_IGNORE } from './files'
```

- [ ] **Step 3: Modify `src/main/index.ts`**

Wrap IPC handlers to read ignore list from store:

```ts
ipcMain.handle('files:listDirectory', (_event, dirPath: string) => {
  const ignoreList = appStore.get('ignoreList')
  return listDirectory(dirPath, ignoreList)
})

// ... later:

ipcMain.on('files:searchContent', (_event, dirPath: string, query: string) => {
  const mainWin = getMainWindow()
  if (!mainWin) return
  const ignoreList = appStore.get('ignoreList')
  searchDirectory(dirPath, query, (progress) => {
    mainWin.webContents.send('search:result', progress)
  }, ignoreList)
})
```

- [ ] **Step 4: Update `src/main/files.spec.ts`**

Add test for ignoreList parameter after the existing "should sort directories" test:

```ts
it('should respect ignoreList parameter', async () => {
  const { listDirectory } = await import('./files')
  const entries = await listDirectory(tmpDir, ['sub', 'readme.txt'])
  const names = entries.map((e) => e.name)
  expect(names).not.toContain('sub')
  expect(names).not.toContain('readme.txt')
  expect(names).toContain('test.md')
  expect(names).toContain('.hidden.md')
  expect(names).toContain('node_modules')
  expect(names).toContain('empty')
})
```

Also add import: `import { DEFAULT_IGNORE } from './files'` and test default value:

```ts
it('should use DEFAULT_IGNORE when no ignoreList passed', async () => {
  const { listDirectory, DEFAULT_IGNORE } = await import('./files')
  const entries = await listDirectory(tmpDir)
  // node_modules should be excluded by default
  expect(entries.find((e) => e.name === 'node_modules')).toBeUndefined()
})
```

- [ ] **Step 5: Run tests**

```bash
pnpm run test:main
```

Expected: All main process tests pass, new ignore list tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "fix: read ignoreList from store in IPC handlers"
```

---

### Task 4: FileTree Subscription Fix

**Files:**
- Modify: `src/renderer/features/file-tree/useFileStore.ts`
- Modify: `src/renderer/features/file-tree/FileTree.tsx`

**Consumes:** Task 2 (uses `ipc.files` instead of `window.api`)
**Produces:** O(1) subscription model for FileTree

- [ ] **Step 1: Modify `useFileStore.ts`**

Convert `Set<string>` to `Record<string, boolean>`:

```ts
import { create } from 'zustand'
import type { FileEntry } from '../../../shared/types'
import { ipc } from '../../../lib/ipc'

interface FileTreeState {
  entries: Record<string, FileEntry[]>
  expanded: Record<string, boolean>
  loading: Record<string, boolean>
  rootPath: string | null
  setRoot: (path: string) => void
  toggleExpand: (dirPath: string) => Promise<void>
  loadChildren: (dirPath: string) => Promise<void>
}

export const useFileStore = create<FileTreeState>((set, get) => ({
  entries: {},
  expanded: {},
  loading: {},
  rootPath: null,
  setRoot: (path) => {
    set({ rootPath: path })
    get().loadChildren(path)
  },
  toggleExpand: async (dirPath) => {
    const { expanded } = get()
    if (expanded[dirPath]) {
      const next = { ...expanded }
      delete next[dirPath]
      set({ expanded: next })
    } else {
      await get().loadChildren(dirPath)
      const next = { ...get().expanded, [dirPath]: true }
      set({ expanded: next })
    }
  },
  loadChildren: async (dirPath) => {
    const { loading } = get()
    if (loading[dirPath]) return
    set((s) => ({ loading: { ...s.loading, [dirPath]: true } }))
    const entries = await ipc.files.listDirectory(dirPath)
    set((s) => {
      const next = { ...s.loading }
      delete next[dirPath]
      return {
        entries: { ...s.entries, [dirPath]: entries },
        loading: next,
      }
    })
  },
}))
```

- [ ] **Step 2: Modify `FileTree.tsx`**

Remove per-node subscription, pass entries via prop:

```ts
import { basename } from '../../../shared/utils'
import { useFileStore } from './useFileStore'
import { useTabStore } from '../tabs/useTabStore'
import type { FileEntry } from '../../../shared/types'

function FileTreeNode({ entry, depth, allEntries }: { entry: FileEntry; depth: number; allEntries: Record<string, FileEntry[]> }) {
  const expanded = useFileStore((s) => s.expanded)
  const toggleExpand = useFileStore((s) => s.toggleExpand)
  const children = allEntries[entry.path]

  const isExpanded = expanded[entry.path] ?? false

  const handleClick = () => {
    if (entry.isDirectory) {
      toggleExpand(entry.path)
    } else {
      useTabStore.getState().openFile(entry.path)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        className={`w-full text-left px-2 py-0.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1 ${
          entry.isHidden ? 'text-gray-400' : ''
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {entry.isDirectory ? (isExpanded ? '▼' : '▶') : ' '}
        <span>{entry.name}</span>
      </button>
      {entry.isDirectory && isExpanded && children && (
        <div>
          {children.map((child) => (
            <FileTreeNode key={child.path} entry={child} depth={depth + 1} allEntries={allEntries} />
          ))}
        </div>
      )}
    </div>
  )
}

interface FileTreeProps {
  rootPath: string
}

export function FileTree({ rootPath }: FileTreeProps) {
  const entries = useFileStore((s) => s.entries)
  const rootEntries = entries[rootPath]

  return (
    <div className="py-2">
      <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {basename(rootPath)}
      </div>
      {rootEntries?.map((entry) => (
        <FileTreeNode key={entry.path} entry={entry} depth={0} allEntries={entries} />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Run tests**

```bash
pnpm run test
```

Expected: FileTree test and all other renderer tests pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "perf: fix FileTree O(n) subscription, use Record for expanded state"
```

---

### Task 5: App.tsx → Feature Hooks

**Files:**
- Create: `src/renderer/hooks/useWorkspaceInit.ts`
- Create: `src/renderer/hooks/useFileWatcher.ts`
- Create: `src/renderer/hooks/useScrollRestore.ts`
- Create: `src/renderer/hooks/useMenuIpc.ts`
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/App.test.tsx`

**Consumes:** Task 2 (uses `ipc`), Task 1 (correct store paths)
**Produces:** App.tsx ~80 lines, each concern testable in isolation

- [ ] **Step 1: Create `hooks/useWorkspaceInit.ts`**

```ts
import { useState, useEffect, useCallback } from 'react'
import { useUIStore } from '../stores/useUIStore'
import { useSettingsStore } from '../features/settings/useSettingsStore'
import { useTabStore } from '../features/tabs/useTabStore'
import { useFileStore } from '../features/file-tree/useFileStore'
import { useSearchStore } from '../features/search/useSearchStore'
import { ipc } from '../lib/ipc'

export function useWorkspaceInit() {
  const [workspacePath, setWorkspacePath] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const setTheme = useUIStore((s) => s.setTheme)

  const trackRecent = useCallback(async (path: string, isDir: boolean) => {
    const key = isDir ? 'recentDirs' : 'recentFiles'
    const items =
      (await ipc.store.get<{ path: string; name: string; timestamp: number }[]>(key)) || []
    const name = path.split(/[\\/]/).pop() || path
    const updated = [
      { path, name, timestamp: Date.now() },
      ...items.filter((i) => i.path !== path),
    ].slice(0, 20)
    await ipc.store.set(key, updated)
  }, [])

  const handleOpenFolder = useCallback(
    (path: string) => {
      setWorkspacePath(path)
      useFileStore.getState().setRoot(path)
      useTabStore.getState().closeAll()
      useSearchStore.getState().reset()
      ipc.store.set('lastWorkspace', path)
      trackRecent(path, true)
    },
    [trackRecent],
  )

  const handleOpenFile = useCallback(
    (path: string) => {
      useTabStore.getState().openFile(path)
      trackRecent(path, false)
    },
    [trackRecent],
  )

  useEffect(() => {
    async function init() {
      const [savedTheme, savedWorkspace, savedOpenFiles, savedActiveFile, savedIgnoreList] =
        await Promise.all([
          ipc.store.get<ReturnType<typeof useUIStore.getState>['theme']>('theme'),
          ipc.store.get<string | null>('lastWorkspace'),
          ipc.store.get<string[]>('openFiles'),
          ipc.store.get<string | null>('activeFile'),
          ipc.store.get<string[]>('ignoreList'),
        ])

      if (savedTheme) setTheme(savedTheme)
      if (savedIgnoreList) useSettingsStore.getState().setIgnoreList(savedIgnoreList)
      if (savedWorkspace) {
        setWorkspacePath(savedWorkspace)
        useFileStore.getState().setRoot(savedWorkspace)
      }
      if (savedOpenFiles && savedOpenFiles.length > 0) {
        for (const f of savedOpenFiles) useTabStore.getState().openFile(f)
        if (savedActiveFile) useTabStore.getState().setActive(savedActiveFile)
      }
      setInitialized(true)
    }
    init()
  }, [setTheme])

  return {
    initialized,
    workspacePath,
    showSettings,
    setShowSettings,
    handleOpenFolder,
    handleOpenFile,
  }
}
```

- [ ] **Step 2: Create `hooks/useFileWatcher.ts`**

```ts
import { useEffect } from 'react'
import { ipc } from '../lib/ipc'
import { useEditorStore } from '../features/markdown-viewer/useEditorStore'
import { useTabStore } from '../features/tabs/useTabStore'
import type { FileChangeEvent } from '../../shared/types'

export function useFileWatcher(openFiles: string[], enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    if (openFiles.length === 0) return

    openFiles.forEach((p) => ipc.watcher.watchFile(p))
    const onChange = (event: FileChangeEvent, fileContent: string | null) => {
      if (event.type === 'change' && fileContent !== null) {
        useEditorStore.getState().setContent(event.path, fileContent)
        useTabStore.getState().markDirty(event.path)
        setTimeout(() => useTabStore.getState().clearDirty(event.path), 2000)
      }
    }
    ipc.watcher.onChange(onChange)

    return () => {
      openFiles.forEach((p) => ipc.watcher.unwatchFile(p))
      ipc.watcher.offChange(onChange)
    }
  }, [openFiles, enabled])
}
```

- [ ] **Step 3: Create `hooks/useScrollRestore.ts`**

```ts
import { useEffect } from 'react'
import { ipc } from '../lib/ipc'

export function useScrollRestore(activeFile: string | null, content: string | undefined) {
  useEffect(() => {
    if (!activeFile) return
    const container = document.querySelector('main > div:first-child')
    if (!container) return
    const handleScroll = () => {
      ipc.store.set('readingPositions', {
        [activeFile]: container.scrollTop,
      })
    }
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [activeFile])

  useEffect(() => {
    if (!activeFile || !content) return
    ;(async () => {
      const positions = await ipc.store.get<Record<string, number>>('readingPositions')
      if (positions?.[activeFile]) {
        const container = document.querySelector('main > div:first-child')
        if (container) {
          requestAnimationFrame(() => {
            container.scrollTop = positions[activeFile]
          })
        }
      }
    })()
  }, [activeFile, content])
}
```

- [ ] **Step 4: Create `hooks/useMenuIpc.ts`**

```ts
import { useEffect } from 'react'
import { ipc } from '../lib/ipc'
import { useTabStore } from '../features/tabs/useTabStore'

interface MenuHandlers {
  onOpenFolder: (path: string) => void
  onToggleSidebar: () => void
  onToggleOutline: () => void
  onOpenFileSearch: () => void
  onOpenContentSearch: () => void
  onToggleSettings: () => void
}

export function useMenuIpc(handlers: MenuHandlers) {
  useEffect(() => {
    const cleanup: Array<() => void> = []
    function onMenu(channel: string, cb: (...args: unknown[]) => void) {
      ipc.ipc.on(channel, cb)
      cleanup.push(() => ipc.ipc.off(channel, cb))
    }

    onMenu('menu:openFolder', (path) => handlers.onOpenFolder(path as string))
    onMenu('menu:toggleFileTree', () => handlers.onToggleSidebar())
    onMenu('menu:toggleOutline', () => handlers.onToggleOutline())
    onMenu('menu:fileSearch', () => handlers.onOpenFileSearch())
    onMenu('menu:contentSearch', () => handlers.onOpenContentSearch())
    onMenu('menu:openSettings', () => handlers.onToggleSettings())
    onMenu('menu:closeTab', () => {
      const state = useTabStore.getState()
      if (state.activeFile) state.closeFile(state.activeFile)
    })
    onMenu('menu:nextTab', () => {
      const state = useTabStore.getState()
      if (state.openFiles.length < 2) return
      const idx = state.openFiles.indexOf(state.activeFile ?? '')
      const next = (idx + 1) % state.openFiles.length
      state.setActive(state.openFiles[next])
    })
    onMenu('menu:prevTab', () => {
      const state = useTabStore.getState()
      if (state.openFiles.length < 2) return
      const idx = state.openFiles.indexOf(state.activeFile ?? '')
      const prev = (idx - 1 + state.openFiles.length) % state.openFiles.length
      state.setActive(state.openFiles[prev])
    })

    return () => cleanup.forEach((fn) => fn())
  }, [handlers])
}
```

- [ ] **Step 5: Rewrite `App.tsx`**

```tsx
import { useEffect, useMemo } from 'react'
import { useUIStore } from './stores/useUIStore'
import { useEditorStore } from './features/markdown-viewer/useEditorStore'
import { useTabStore } from './features/tabs/useTabStore'
import { useFileStore } from './features/file-tree/useFileStore'
import { ThemeProvider } from './components/ThemeProvider'
import { Layout } from './components/Layout'
import { WelcomePage } from './features/welcome/WelcomePage'
import { FileTree } from './features/file-tree/FileTree'
import { TabBar } from './features/tabs/TabBar'
import { MarkdownViewer } from './features/markdown-viewer/MarkdownViewer'
import { Outline } from './features/outline/Outline'
import { FileSearch } from './features/search/FileSearch'
import { ContentSearch } from './features/search/ContentSearch'
import { SettingsPanel } from './features/settings/SettingsPanel'
import { ipc } from './lib/ipc'
import { useWorkspaceInit } from './hooks/useWorkspaceInit'
import { useFileWatcher } from './hooks/useFileWatcher'
import { useScrollRestore } from './hooks/useScrollRestore'
import { useMenuIpc } from './hooks/useMenuIpc'

function App() {
  const {
    initialized,
    workspacePath,
    showSettings,
    setShowSettings,
    handleOpenFolder,
    handleOpenFile,
  } = useWorkspaceInit()

  const sidebarVisible = useUIStore((s) => s.sidebarVisible)
  const outlineVisible = useUIStore((s) => s.outlineVisible)
  const searchPanel = useUIStore((s) => s.searchPanel)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const toggleOutline = useUIStore((s) => s.toggleOutline)
  const openSearch = useUIStore((s) => s.openSearch)
  const closeSearch = useUIStore((s) => s.closeSearch)

  const openFiles = useTabStore((s) => s.openFiles)
  const activeFile = useTabStore((s) => s.activeFile)

  const content = useEditorStore((s) => (activeFile ? s.contents[activeFile] : undefined))
  const loadContent = useEditorStore((s) => s.loadContent)

  // Fix: compute allFiles from live entries (was useMemo with empty deps bug)
  const allFiles = useMemo(() => {
    const entries = useFileStore.getState().entries
    const files: { path: string; name: string }[] = []
    for (const dir of Object.values(entries)) {
      for (const entry of dir) {
        if (!entry.isDirectory) {
          files.push({ path: entry.path, name: entry.name })
        }
      }
    }
    return files
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized])

  useEffect(() => {
    if (activeFile) {
      loadContent(activeFile)
    }
  }, [activeFile, loadContent])

  useEffect(() => {
    if (initialized && activeFile) {
      ipc.store.set('activeFile', activeFile)
    }
  }, [initialized, activeFile])

  useEffect(() => {
    if (initialized) {
      ipc.store.set('openFiles', openFiles)
    }
  }, [initialized, openFiles])

  useFileWatcher(openFiles, initialized)
  useScrollRestore(activeFile, content)
  useMenuIpc({
    onOpenFolder: handleOpenFolder,
    onToggleSidebar: toggleSidebar,
    onToggleOutline: toggleOutline,
    onOpenFileSearch: () => openSearch('file'),
    onOpenContentSearch: () => openSearch('content'),
    onToggleSettings: () => setShowSettings((v) => !v),
  })

  return (
    <ThemeProvider>
      {!workspacePath ? (
        <WelcomePage onFolderOpen={handleOpenFolder} />
      ) : (
        <Layout
          sidebar={
            <div>
              <FileTree rootPath={workspacePath} />
              <div className="border-t border-gray-200 dark:border-gray-700">
                {searchPanel === 'file' && (
                  <FileSearch
                    files={allFiles}
                    onSelect={(p) => {
                      handleOpenFile(p)
                      closeSearch()
                    }}
                  />
                )}
                {searchPanel === 'content' && (
                  <ContentSearch
                    workspacePath={workspacePath}
                    onSelect={(p) => {
                      handleOpenFile(p)
                      closeSearch()
                    }}
                  />
                )}
              </div>
            </div>
          }
          main={
            showSettings ? (
              <SettingsPanel />
            ) : openFiles.length > 0 ? (
              <div className="h-full flex flex-col">
                <TabBar />
                <div className="flex-1 overflow-y-auto">
                  {content !== undefined ? (
                    <MarkdownViewer content={content} filePath={activeFile ?? undefined} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      Loading...
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <WelcomePage onFolderOpen={handleOpenFolder} />
            )
          }
          outline={content ? <Outline content={content} /> : null}
          sidebarVisible={sidebarVisible}
          outlineVisible={outlineVisible}
        />
      )}
    </ThemeProvider>
  )
}

export default App
```

- [ ] **Step 6: Update `App.test.tsx`**

Use the mock setup from Task 2 step 4 (already done if Task 2 was applied). The only addition: reset handler deps when testing `useMenuIpc`. The existing tests should pass because the mock structure is the same.

- [ ] **Step 7: Remove unused imports from `App.tsx`**

The original import for `useFileStore` is still used in `allFiles` (via `getState()`). Keep it.
The original import for `useSettingsStore` is no longer needed in App.tsx (moved to `useWorkspaceInit`).
Remove `FileChangeEvent` type import (moved to hook).

- [ ] **Step 8: Run tests**

```bash
pnpm run test
```

Expected: All tests pass.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor: extract App.tsx logic into feature hooks"
```

---

### Task 6: Store Unit Tests

**Files:**
- Create: `src/renderer/features/markdown-viewer/useEditorStore.test.ts`
- Create: `src/renderer/features/settings/useSettingsStore.test.ts`

**Consumes:** Task 2 (uses `ipc` mocks), Task 1 (correct file paths)
**Produces:** 2 new test suites, ~6 tests total

- [ ] **Step 1: Create `features/markdown-viewer/useEditorStore.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useEditorStore } from './useEditorStore'

const mockReadFile = vi.fn()

vi.mock('../../../lib/ipc', () => ({
  ipc: {
    files: {
      readFile: (...args: unknown[]) => mockReadFile(...args),
    },
  },
}))

describe('useEditorStore', () => {
  beforeEach(() => {
    useEditorStore.setState({ contents: {}, loading: {}, errors: {} })
    vi.clearAllMocks()
  })

  it('should set loading then content on successful load', async () => {
    mockReadFile.mockResolvedValue({ path: '/a.md', content: '# hello' })

    const loadPromise = useEditorStore.getState().loadContent('/a.md')

    expect(useEditorStore.getState().loading['/a.md']).toBe(true)

    await loadPromise

    expect(useEditorStore.getState().loading['/a.md']).toBe(false)
    expect(useEditorStore.getState().contents['/a.md']).toBe('# hello')
    expect(useEditorStore.getState().errors['/a.md']).toBeUndefined()
  })

  it('should set error on failed load', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'))

    const loadPromise = useEditorStore.getState().loadContent('/missing.md')

    expect(useEditorStore.getState().loading['/missing.md']).toBe(true)

    await loadPromise

    expect(useEditorStore.getState().loading['/missing.md']).toBe(false)
    expect(useEditorStore.getState().errors['/missing.md']).toBe('Error: ENOENT')
    expect(useEditorStore.getState().contents['/missing.md']).toBeUndefined()
  })

  it('should remove content from all maps', () => {
    useEditorStore.setState({
      contents: { '/a.md': 'hello' },
      loading: { '/a.md': false },
      errors: { '/a.md': 'some error' },
    })

    useEditorStore.getState().removeContent('/a.md')

    expect(useEditorStore.getState().contents).not.toHaveProperty('/a.md')
    expect(useEditorStore.getState().loading).not.toHaveProperty('/a.md')
    expect(useEditorStore.getState().errors).not.toHaveProperty('/a.md')
  })

  it('should set content directly', () => {
    useEditorStore.getState().setContent('/a.md', 'direct')

    expect(useEditorStore.getState().contents['/a.md']).toBe('direct')
  })
})
```

- [ ] **Step 2: Create `features/settings/useSettingsStore.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSettingsStore } from './useSettingsStore'

const mockStoreGet = vi.fn()
const mockStoreSet = vi.fn()

vi.mock('../../../lib/ipc', () => ({
  ipc: {
    store: {
      get: (...args: unknown[]) => mockStoreGet(...args),
      set: (...args: unknown[]) => mockStoreSet(...args),
    },
  },
}))

describe('useSettingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({ ignoreList: [] })
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

    expect(useSettingsStore.getState().ignoreList).toEqual([])
  })

  it('should save ignore list to disk', async () => {
    useSettingsStore.setState({ ignoreList: ['dist', '.cache'] })

    await useSettingsStore.getState().saveToDisk()

    expect(mockStoreSet).toHaveBeenCalledWith('ignoreList', ['dist', '.cache'])
  })
})
```

- [ ] **Step 3: Run tests**

```bash
pnpm run test
```

Expected: 7 new tests pass (4 editor + 3 settings).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: add useEditorStore and useSettingsStore unit tests"
```

---

## Verification

After all 6 tasks, run full test suite:

```bash
pnpm run test && pnpm run test:main && pnpm run test:e2e
```

Expected: 51 unit tests + 28 E2E tests all pass.
