# 架构加深 — 解决方案

日期：2026-06-21  
依据：`docs/superpowers/specs/2026-06-21-architecture-review-design.md`

---

## 候选 1：4 个 Hook 零测试覆盖（P0）

### 涉及文件
- `src/renderer/hooks/useWorkspaceInit.ts`（84 行）
- `src/renderer/hooks/useMenuIpc.ts`（52 行）
- `src/renderer/hooks/useScrollRestore.ts`（40 行）
- `src/renderer/hooks/useFileWatcher.ts`（27 行）

### 问题
从 App.tsx 提取后成为独立模块，无任何测试。App.tsx 集成测试覆盖不到边界情况。`useWorkspaceInit` 尤其复杂——5 个 IPC 调用、3 个 store 操作、trackRecent 去重/上限逻辑、错误恢复。

### 方案

使用 `@testing-library/react` 的 `renderHook` + `vi.mock('../lib/ipc')`（与现有 store 测试相同模式）。

#### 1A: useWorkspaceInit 测试

`src/renderer/hooks/useWorkspaceInit.test.ts`

**核心测试用例：**
- 挂载时并行调用 5 个 `ipc.store.get` 恢复状态，返回 `initialized=true`
- `savedIgnoreList` 非空时调用 `useSettingsStore.setIgnoreList`
- `savedTheme` 非空时调用 `useUIStore.setTheme`
- `savedWorkspace` 非空时调用 `useFileStore.setRoot` + `setWorkspacePath`
- `savedOpenFiles` 非空时遍历调用 `useTabStore.openFile`，最后 `setActive`
- init 异常时 catch 调用 `logError`，`initialized` 仍为 false
- `handleOpenFolder`：调用 `setRoot`/`closeAll`/`reset` + `ipc.store.set('lastWorkspace')` + `trackRecent(..., true)`
- `handleOpenFile`：调用 `useTabStore.openFile` + `trackRecent(..., false)`
- `trackRecent`：追加新条目、去重旧 path、截断到 20 条
- `trackRecent` 异常时 catch 调用 `logError`

**关键 mock 模式：**
```ts
import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'

const mockStoreGet = vi.fn()
vi.mock('../lib/ipc', () => ({
  ipc: { store: { get: (...args) => mockStoreGet(...args), set: vi.fn() } },
}))
```

#### 1B: useMenuIpc 测试

`src/renderer/hooks/useMenuIpc.test.ts`

**核心测试用例：**
- 挂载时注册 10 个 IPC 通道监听器
- 卸载时注销全部 10 个监听器（验证 cleanup）
- `menu:openFolder` 触发时调用 `handlersRef.current.onOpenFolder` 并传入正确 path
- `menu:toggleFileTree` → `onToggleSidebar`，其他 toggle 通道同理
- `menu:closeTab` → `useTabStore.closeFile(activeFile)`
- `menu:nextTab` → 循环切换，单文件时不操作
- `menu:prevTab` → 逆向循环，单文件时不操作
- handler 更新后 ref 更新，下次 IPC 事件使用新 handler

**关键 mock 模式：**
```ts
const onSpy = vi.fn()
const offSpy = vi.fn()
vi.mock('../lib/ipc', () => ({
  ipc: { ipc: { on: (...args) => onSpy(...args), off: (...args) => offSpy(...args) } },
}))
```

#### 1C: useScrollRestore 测试

`src/renderer/hooks/useScrollRestore.test.ts`

**核心测试用例：**
- `activeFile` 为 null 时不在 DOM 上注册 scroll 监听
- DOM 查询不到 `main > div:first-child` 时不在 DOM 注册
- scroll 事件触发时将 `scrollTop` 保存到 `ipc.store.set('readingPositions', ...)`
- `activeFile` 和 `content` 均有效时从 store 读取位置并恢复到 `container.scrollTop`
- 位置不存在时不设置 scrollTop
- IPC 异常时调用 `logError`

**DOM mock 策略：**
```ts
beforeEach(() => {
  document.body.innerHTML = '<main><div></div></main>'
})
```

#### 1D: useFileWatcher 测试

`src/renderer/hooks/useFileWatcher.test.ts`

**核心测试用例：**
- `enabled=true` 且 `openFiles` 非空时对每个文件调用 `ipc.watcher.watchFile` + 注册 `onChange`
- 卸载时对每个文件调用 `ipc.watcher.unwatchFile` + `offChange`
- `enabled=false` 时不注册任何监听
- `openFiles` 为空时不注册监听
- 文件 change 事件触发时调用 `useEditorStore.setContent` + `useTabStore.markDirty` + 2s 后 `clearDirty`
- delete 事件触发时不设置 content

**收益：**
- Hook bug 在毫秒级单元测试中发现，而非秒级 App 集成测试
- 每个 hook 的返回值与副作用契约成为测试面（leverag）
- 变更集中在 hook 测试文件中（locality）

---

## 候选 2：useTabStore / useFileStore / useSearchStore 无独立测试（P0）

### 涉及文件
- `src/renderer/features/tabs/useTabStore.ts`（53 行）
- `src/renderer/features/file-tree/useFileStore.ts`（50 行）
- `src/renderer/features/search/useSearchStore.ts`（22 行）

### 问题
纯 zustand store（最容易测试的模块），仅通过组件测试间接覆盖。`useTabStore.dirtyFiles`（Set）逻辑、`useFileStore.loadChildren` 去重守卫完全未验证。

### 方案
直接 `create()` 实例化 store，调用 action，断言 `getState()`。无需 mock（除 `useFileStore` 需 mock `ipc.files.listDirectory`）。

#### 2A: useTabStore.test.ts

`src/renderer/features/tabs/useTabStore.test.ts`

**核心测试用例：**
- **openFile**：新文件追加到 `openFiles` 末尾并设为 `activeFile`
- **openFile**：重复文件只更新 `activeFile`，不追加
- **closeFile**：移除文件，调整 `activeFile` 到相邻文件，清除 dirty 标记
- **closeFile**：关闭最后一个文件时 `activeFile` 为 null
- **closeFile**：关闭非激活文件时 `activeFile` 不变
- **closeOthers**：只保留指定文件
- **closeAll**：清空 `openFiles` 和 `activeFile`
- **markDirty / clearDirty**：创建新 Set 实例（不变性验证）
- **markDirty / clearDirty**：不影响其他 dirty 条目

#### 2B: useFileStore.test.ts

`src/renderer/features/file-tree/useFileStore.test.ts`

mock `ipc.files.listDirectory`。

**核心测试用例：**
- **setRoot**：设置 `rootPath` + 自动触发 `loadChildren(rootPath)`
- **loadChildren**：加载条目后写入 `entries[dirPath]` 和清除 `loading[dirPath]`
- **loadChildren**：正在加载时重复调用不触发第二次 fetch（去重守卫）
- **toggleExpand**：未展开 → `loadChildren` → 标记 `expanded=true`
- **toggleExpand**：已展开 → 移除 `expanded` 标记，不加载
- **loadChildren**：`ipc.files.listDirectory` 异常时状态不变（或错误处理）

#### 2C: useSearchStore.test.ts

`src/renderer/features/search/useSearchStore.test.ts`

纯状态 store，无需 mock。

**核心测试用例：**
- **setQuery**：更新 query
- **setResults**：更新 results
- **setIsSearching**：更新搜索状态
- **reset**：清空所有字段

**收益：**
- zustand store 接口即测试面——直接通过 `getState()` + setter 断言
- `dirtyFiles` Set 不变性验证防止未来调试困难的 bug

---

## 候选 3：ErrorBoundary 组件无测试（P1）

### 涉及文件
- `src/renderer/components/ErrorBoundary.tsx`（43 行）

### 问题
错误捕获基础设施本身未验证。如果 `componentDidCatch` 或降级 UI 有 bug，整个渲染进程白屏。

### 方案

`src/renderer/components/ErrorBoundary.test.tsx`

使用 React 测试工具渲染 ErrorBoundary，子组件 throw Error 触发边界。Mock `../logger` 验证 `logError` 调用。

**核心测试用例：**
- 正常渲染时透传子组件
- 子组件 throw Error 时渲染降级 UI（"出错了" + 错误消息）
- `componentDidCatch` 调用 `logError('ErrorBoundary', error)`
- 降级 UI 显示错误消息文本（`pre` 标签内容）
- 错误恢复后降级 UI 消失（可通过 key 强制重新挂载）

```ts
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

const mockLogError = vi.fn()
vi.mock('../logger', () => ({ logError: (...args) => mockLogError(...args) }))

function Thrower({ msg }: { msg: string }) {
  throw new Error(msg)
  return null
}
```

**收益：**
- 最后防线可验证（per AGENTS.md 约束 "无未捕获异常"）
- leverag——所有组件崩溃路径经过同一验证点

---

## 候选 4：ContentSearch useEffect 依赖数组不完整（P1）

### 涉及文件
- `src/renderer/features/search/ContentSearch.tsx:33`

### 问题
第 33 行：`}, [query, workspacePath, setResults, setIsSearching])`

`ipc.search.onResult` 和 `ipc.search.searchContent` 在 effect 中使用但未列入 deps。React StrictMode 下 effect 重复触发时可能产生过时闭包。

### 方案

重构为 ref 模式——在 effect 内部读取最新的 callback/函数引用，而不把它们列入 deps：

```ts
const onResultRef = useRef(onResult)
onResultRef.current = onResult

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

`setResults` 和 `setIsSearching` 是 zustand 稳定引用，留在 deps 中无害。`handleResult` 在 effect 内定义，与 `onResult` 引用无关。

**如果不想改变量名：**直接在 deps 中补全 `ipc.search.onResult` 和 `ipc.search.searchContent` —— 但因为它们来自 `ipc` 对象字面量（每次 render 新引用），会导致 effect 频繁重建。ref 模式是更正确的解。

**收益：**
- 消除过时闭包——搜索流式结果不再可能丢失/重复
- 符合 React StrictMode 预期行为

---

## 候选 5：主进程 index.ts 零单元测试（P2）

### 涉及文件
- `src/main/index.ts`（108 行）

### 问题
8 个 IPC handler + app 生命周期 + 全局错误处理器，全部通过 E2E 验证，无单元测试。

### 方案

分两层处理：

#### 5A：抽取纯 handler 函数（优先）

将 IPC handler 体内逻辑抽取为纯函数，函数签名不依赖 `ipcMain`/`electron`：

```ts
// src/main/handlers.ts (新文件)
import type { StoreSchema } from './store'
import { listDirectory } from './files'
import { searchDirectory } from './search'

export function handleListDirectory(dirPath: string, ignoreList: string[]) {
  return listDirectory(dirPath, ignoreList)
}

export function handleSearchContent(
  dirPath: string,
  query: string,
  ignoreList: string[],
  onProgress: (progress: SearchProgress) => void,
) {
  searchDirectory(dirPath, query, onProgress, ignoreList)
}

export function handleStoreGet<T extends keyof StoreSchema>(appStore: ..., key: string) {
  return appStore.get(key)
}
```

`index.ts` 变为薄调用层。

#### 5B：测试 handler 函数

`src/main/handlers.test.ts`（新文件）

```ts
import { describe, it, expect, vi } from 'vitest'
import { handleListDirectory } from './handlers'
import * as files from './files'

vi.mock('./files', () => ({ listDirectory: vi.fn() }))

it('handleListDirectory 注入 ignoreList', async () => {
  vi.mocked(files.listDirectory).mockResolvedValue([])
  await handleListDirectory('/test', ['.git'])
  expect(files.listDirectory).toHaveBeenCalledWith('/test', ['.git'])
})
```

**如果不抽取（备选方案）：**直接 mock `ipcMain.handle` + `appStore` + 依赖模块：

```ts
vi.mock('electron', () => ({ app: ..., ipcMain: { handle: vi.fn(), on: vi.fn() }, ... }))
vi.mock('./store', () => ({ appStore: { get: vi.fn() } }))
// 然后 import('./index') 触发 app.on('ready') handler
```

抽取方案更优——函数签名本身就是测试面。

**收益：**
- IPC 逻辑错误在毫秒级单元测试中发现
- handler 接口变更编译期暴露
- E2E 测试可专注于集成路径而非穷举边界情况

---

## 候选 6：重复的 DEFAULT_IGNORE 定义（P3）

### 涉及文件
- `src/main/files.ts:7` — `export const DEFAULT_IGNORE = ['.git', 'node_modules', '__pycache__', '.DS_Store']`
- `src/main/store.ts:17` — `ignoreList: ['.git', 'node_modules', '__pycache__', '.DS_Store']`

### 问题
同一数组两处独立定义。改一处未改另一处 → 漂移。

### 方案

移除 `store.ts` 中的内联数组，改为从 `files.ts` 导入：

```ts
// src/main/store.ts
import { DEFAULT_IGNORE } from './files'

const defaults: StoreSchema = {
  ignoreList: [...DEFAULT_IGNORE], // 浅拷贝，避免引用共享
  // ...
}
```

`files.ts` 中的 `DEFAULT_IGNORE` 成为**单一事实来源**。`store.ts` 拷贝一份用于 `electron-store` 的默认值（store 初始化时写入磁盘的那份）。

**收益：**
- locality——默认值变更只需改 `files.ts` 一处
- 非常小的投入（≈ 2 行改动）

---

## 候选 7：IPC_CHANNELS 常量无人引用（P3）

### 涉及文件
- `src/shared/types.ts:1-17` — `IPC_CHANNELS` 对象
- `src/main/index.ts` — 裸字符串（如 `'files:listDirectory'`）
- `src/preload/index.ts` — 裸字符串
- `src/renderer/lib/ipc.ts` — 裸字符串

### 问题
`IPC_CHANNELS` 定义了完整的通道名常量 map，但无人引用。主进程、preload、渲染进程全用裸字符串 —— 拼写错误运行时才暴露。

### 方案

**选择 A：全面迁移（推荐）**

1. 主进程 `index.ts` 中 `ipcMain.handle('files:listDirectory', ...)` → `ipcMain.handle(IPC_CHANNELS.LIST_DIRECTORY, ...)`
2. Preload `index.ts` 中 ipc 通道名同理
3. 渲染进程 `ipc.ts` 中方法名不直接改——`ipc.ts` 已封装，`window.api.files.listDirectory` 本身就是契约；但 preload 中 `ipcRenderer.invoke('files:listDirectory')` → `ipcRenderer.invoke(IPC_CHANNELS.LIST_DIRECTORY)`

**注意：**`IPC_CHANNELS` 中部分名字与实际使用不完全一致，需对照修正：

| IPC_CHANNELS 键 | 值 | 实际使用 |
|-----------------|-----|---------|
| `SEARCH_CONTENT` | `'search:searchContent'` | 实际用 `'files:searchContent'` |
| `SEARCH_RESULT` | `'search:searchResult'` | 实际用 `'search:result'` |
| `SEARCH_DONE` | `'search:searchDone'` | 未使用 |
| `FILE_CHANGED` | `'watcher:fileChanged'` | 实际用 `'watcher:change'` |
| `OPEN_DIRECTORY` | `'dialog:openDirectory'` | 实际用 `'dialog:openDirectory'` ✓ |
| `OPEN_FILE` | `'dialog:openFile'` | 实际用 `'dialog:openFile'` ✓ |
| `OPEN_EXTERNAL` | `'shell:openExternal'` | 实际用 `'shell:openExternal'` ✓ |

**选择 B：删除 `IPC_CHANNELS`**

如果不想迁移成本，直接删除 `types.ts` 中的 `IPC_CHANNELS` 定义和 `as const` 块。减少噪音。

**推荐 A**——成本有限（约 20 处替换），收益是编译期拼写检查。

---

## 候选 8：E2E 测试中脆弱的 waitForTimeout（P3）

### 涉及文件
- `e2e/settings.spec.ts` — 3 处 `waitForTimeout`
- `e2e/shortcuts.spec.ts` — 4 处 `waitForTimeout`
- `e2e/theme.spec.ts` — 4 处 `waitForTimeout`

### 问题
固定 `waitForTimeout(500)` 替代基于断言的 `waitFor`。测试更慢、CI 负载高时可能 flaky。

### 方案

将确定性 `waitForTimeout` 替换为基于条件的 `waitFor` 或 `locator.waitFor()`：

| 文件 | 原用法 | 替换为 |
|------|--------|--------|
| `settings.spec.ts:10` | 打开设置面板后 `waitForTimeout(500)` | `waitFor(() => expect(page.locator('...')).toBeVisible())` |
| `settings.spec.ts:27` | 添加忽略项后等待 | `waitFor(() => expect(page.locator('text=newItem')).toBeVisible())` |
| `shortcuts.spec.ts` | 快捷键打开面板后等待 | `page.locator('selector').waitFor({ state: 'visible' })` 或 `waitFor` |
| `theme.spec.ts` | 主题切换后等待 | 断言 body class 或背景色变化 |

**示例——`settings.spec.ts` 替换：**

```ts
// Before
await page.keyboard.press('Control+,')
await page.waitForTimeout(500)

// After
await page.keyboard.press('Control+,')
await page.locator('text=忽略列表').waitFor({ state: 'visible', timeout: 5000 })
```

```ts
// Before
await addIgnoreBtn.click()
await page.waitForTimeout(500)

// After
await addIgnoreBtn.click()
await expect(page.locator('text=我的忽略项')).toBeVisible({ timeout: 5000 })
```

**收益：**
- CI 稳定性——消除固定延迟竞态条件
- 测试速度——断言通过即继续，不空等 500ms
- 安全性——Playwright 超时有明确错误消息，比 silent timeout 更易调试

---

## 候选 9：TabStore dirtyFiles 可变 Set（P3）

### 涉及文件
- `src/renderer/features/tabs/useTabStore.ts:19` — `dirtyFiles: new Set()`

### 问题
zustand 期望不可变状态。虽然 `markDirty`/`clearDirty` 正确创建新 Set，但 `getState().dirtyFiles` 和 `useTabStore(s => s.dirtyFiles)` 返回对当前 Set 的可变引用。外部代码可能原地 `.add()`/`.delete()` 破坏不变性。

### 方案

**选择 A：封装为只读接口（最小改动）**

```ts
interface TabState {
  // ...
  isDirty: (filePath: string) => boolean
  // dirtyFiles 从接口移除，改为内部实现
}

// create 内部
dirtyFiles: new Set() as Set<string>,
isDirty: (filePath) => get().dirtyFiles.has(filePath),
```

外部只能通过 `isDirty(filePath)` 查询，无法直接获取 Set 引用。

**选择 B：文档约束**

在代码注释中标注 `dirtyFiles` 为只读引用。Zustand 社区常见做法——依赖开发者纪律。实际风险因代码库规模小（已知消费者 2 个：FileWatcher hook 和 TabBar 组件，均通过 `markDirty`/`clearDirty` 修改）。

**推荐 A**——彻底消除风险，投入极小（新增一个 getter, 从接口移除 Set 暴露）。

---

## 实施顺序建议

| 顺序 | 候选 | 预估工时 | 依赖 |
|------|------|----------|------|
| 1 | 6. DEFAULT_IGNORE 去重 | 15 min | 无 |
| 2 | 4. ContentSearch deps | 15 min | 无 |
| 3 | 2C. useSearchStore 测试 | 20 min | 无（纯状态，简单） |
| 4 | 2A. useTabStore 测试 | 30 min | 无 |
| 5 | 2B. useFileStore 测试 | 30 min | mock ipc |
| 6 | 1D. useFileWatcher 测试 | 30 min | mock ipc + DOM |
| 7 | 1C. useScrollRestore 测试 | 30 min | mock ipc + DOM |
| 8 | 1A. useWorkspaceInit 测试 | 45 min | mock ipc + store |
| 9 | 1B. useMenuIpc 测试 | 30 min | mock ipc |
| 10 | 3. ErrorBoundary 测试 | 20 min | mock logger |
| 11 | 9. dirtyFiles 防御 | 15 min | 无 |
| 12 | 7. IPC_CHANNELS 迁移 | 30 min | 无 |
| 13 | 5. main/index.ts 测试 | 60 min | 需抽取 handler |
| 14 | 8. E2E waitForTimeout 替换 | 45 min | E2E 环境 |

**P0 + P1 合计：约 4 小时。** 全部候选约 6.5 小时。
