# Architecture Deepening Design

Date: 2026-06-20
Status: Draft

## Overview

六项架构深化改进，目标：降低 App.tsx 耦合、消除死代码/破损功能、统一模块布局、建立 IPC seam、修复性能问题、补齐测试缺口。

---

## 1. App.tsx → Feature Hooks

### Problem

App.tsx 281 行，11 个 useEffect，混合启动编排、菜单 IPC、文件监听、滚动恢复、状态持久化。改任一项功能都要改这个文件，测试需要 mock 半个应用。

### Design

提取 4 个 hook：

**`useWorkspaceInit()`**

- 从 electron-store 恢复 theme / workspacePath / openFiles / activeFile / ignoreList
- 返回 `{ initialized, workspacePath, showSettings, setShowSettings, handleOpenFolder, handleOpenFile }`
- `handleOpenFolder` 负责：setWorkspacePath → setRoot → closeAll → persist lastWorkspace → trackRecent
- `handleOpenFile`：openTab → trackRecent
- init 期间 `initialized` 为 false，下游 hook 用它做 gate

**`useFileWatcher(openFiles: string[], enabled: boolean)`**

- `enabled` 为 false 时跳过（init 未完成）
- 监听 `openFiles` 数组，watch file / unwatch stale
- 注册 `window.api.watcher.onChange` callback，脏标记 2s 后清除
- cleanup 时 unwatch all + offChange

**`useScrollRestore(activeFile: string | null, content: string | undefined)`**

- activeFile 变化时存当前位置
- content 到位后从 store 恢复位置（requestAnimationFrame）
- 使用 `window.api.store.get/set('readingPositions')`

**`useMenuIpc(handlers)`**

- 注册 `menu:*` 通道：openFolder, toggleFileTree, toggleOutline, fileSearch, contentSearch, openSettings, closeTab, nextTab, prevTab
- 接收 `handlers` 对象，避免闭包捕获 stale callback
- cleanup 时 off all

### Residue

App.tsx 剩余 ~80 行：
- import hooks + zustand selectors
- 条件渲染分支（无 workspace → WelcomePage，有 → Layout）
- `allFiles` bug 在内联修复（`useMemo([], [])` → 正确的依赖或改用实时遍历）

### Not Changing

- 不引入事件总线。init flag 控制 effect 执行顺序已足够。
- 不改变任何 store 接口。

---

## 2. Ignore List Blind Spot

### Problem

设置面板写 `ignoreList` 到 electron-store，但 `listDirectory()` 和 `walkDir()` 各自硬编码忽略列表。"忽略列表"功能破损。

### Design

- `files.listDirectory` 增加可选参数 `ignoreList: string[]`，默认 `DEFAULT_IGNORE`
- `search.walkDir` 增加 `ignoreList` 参数
- IPC handler（`src/main/index.ts`）在调用前从 `appStore.get('ignoreList')` 读取
- 渲染进程不改任何代码

### File Changes

| File | Change |
|------|--------|
| `src/main/files.ts` | 提取 `DEFAULT_IGNORE` 常量，`listDirectory` 接受 `ignoreList` 参数 |
| `src/main/search.ts` | `walkDir` 接受 `ignoreList` 参数 |
| `src/main/index.ts` | `files:listDirectory` / `files:searchContent` handler 读取 store 后传入 |

### Testing

- `files.spec.ts`: 传不同 ignoreList 验证过滤效果
- `search.spec.ts`: 传 ignoreList 验证不会遍历忽略目录

---

## 3. Dead Code + Inconsistent Layout

### a) 删除 createStore.ts

`src/renderer/stores/createStore.ts` 无任何 import，直接删。

### b) Store 位置迁移

| Store | 当前 | 迁移至 |
|-------|------|--------|
| `useEditorStore` | `stores/` | `features/markdown-viewer/useEditorStore.ts` |
| `useSettingsStore` | `stores/` | `features/settings/useSettingsStore.ts` |
| `useUIStore` | `stores/` | 不变（跨 feature 共享） |

更新所有 import 路径。

### c) 空目录

删除 `tests/` 和 `resources/`（git 不追踪空目录）。如需占位用 `.gitkeep`，但当前无需要。

---

## 4. Central IPC Adapter

### Design

创建 `src/renderer/lib/ipc.ts`，统一封装所有 `window.api.*` 调用：

```typescript
export const ipc = {
  files: {
    listDirectory: (dirPath: string) => window.api.files.listDirectory(dirPath),
    readFile: (filePath: string) => window.api.files.readFile(filePath),
    getFileInfo: (filePath: string) => window.api.files.getFileInfo(filePath),
  },
  search: {
    searchContent: (dirPath: string, query: string) => window.api.search.searchContent(dirPath, query),
    onResult: (cb: (r: SearchProgress) => void) => window.api.search.onResult(cb),
    offResult: (cb: (r: SearchProgress) => void) => window.api.search.offResult(cb),
  },
  watcher: {
    watchFile: (filePath: string) => window.api.watcher.watchFile(filePath),
    unwatchFile: (filePath: string) => window.api.watcher.unwatchFile(filePath),
    onChange: (cb: (ev: FileChangeEvent, content: string | null) => void) => window.api.watcher.onChange(cb),
    offChange: (cb: (ev: FileChangeEvent, content: string | null) => void) => window.api.watcher.offChange(cb),
  },
  store: {
    get: <T>(key: string) => window.api.store.get<T>(key),
    set: (key: string, value: unknown) => window.api.store.set(key, value),
    del: (key: string) => window.api.store.delete(key),
  },
  dialog: {
    openDirectory: () => window.api.dialog.openDirectory(),
    openFile: () => window.api.dialog.openFile(),
  },
  shell: {
    openExternal: (url: string) => window.api.shell.openExternal(url),
  },
  ipc: {
    on: (channel: string, cb: (...args: unknown[]) => void) => window.api.ipc.on(channel, cb),
    off: (channel: string, cb: (...args: unknown[]) => void) => window.api.ipc.off(channel, cb),
  },
}
```

纯 wrapper 起步，不加统一错误处理（YAGNI）。

### Migration

一次性 grep 替换所有 `window.api.` 引用。

### Testing Benefit

现有测试从 `(global as any).window.api = mock` 变为 `vi.mock('@/lib/ipc', () => ({ ipc: { files: { readFile: vi.fn() } } }))`。

---

## 5. FileTree Subscription Fix

### Design

两个修改：

**a) `expanded` / `loading` Set → `Record<string, boolean>`**

`useFileStore` 内 `Set<string>` 改为 `Record<string, boolean>`，zustand 默认 `Object.is` 比较可以正确判断引用变化。

```typescript
interface FileTreeState {
  entries: Record<string, FileEntry[]>
  expanded: Record<string, boolean>   // true = expanded
  loading: Record<string, boolean>
  // ...
}
```

**b) children 通过 prop 传递**

`FileTree` 一次订阅 `s.entries`，`FileTreeNode` 从 `allEntries[entry.path]` 取 children，不自建订阅。

### File Changes

| File | Change |
|------|--------|
| `useFileStore.ts` | `expanded: Set<string>` → `expanded: Record<string, boolean>`，同 `loading`，更新 toggleExpand 逻辑 |
| `FileTree.tsx` | 移除每个节点的条目订阅，一次订阅 + prop 传递 |

---

## 6. Missing Store Tests

### Design

分两步：

1. **等第 4 项（IPC 层）完成**后再写 store 测试，避免中途改 mock 策略。
2. 在 `features/markdown-viewer/` 下创建 `useEditorStore.test.ts`，在三叉路径（loading→成功/loading→错误/removeContent）上覆盖。mock `ipc.files.readFile`。
3. 在 `features/settings/` 下创建 `useSettingsStore.test.ts`，测试 loadFromDisk / saveToDisk 与 ipc 交互。

### Priority

低。前 5 项完成后在 E2E 不回归的前提下补充。

---

## Migration Order

1. **第 3 项**（死代码+迁移）——零风险，先清场
2. **第 4 项**（IPC 层）——建立 seam，为后续测试铺路
3. **第 2 项**（Ignore List）——小范围主进程改动
4. **第 5 项**（FileTree 订阅）——单个文件改动
5. **第 1 项**（App.tsx 解耦）——最大改动，有 IPC seam + 干净目录后做
6. **第 6 项**（Store 测试）——接第 4 项的 mock
