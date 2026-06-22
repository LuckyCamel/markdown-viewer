# 架构深化第三轮 — 设计方案

日期：2026-06-22
依据：`CONTEXT.md` + `improve-codebase-architecture` 技能分析

---

## 目标

处理 improve-codebase-architecture 分析中发现的 10 项架构问题——2 个用户可见 Bug、4 项结构缺陷、2 项防御缺口、2 项测试空白。（原分析含 10 项；#9 index.ts 测试划入专项）

---

## 约束

- 不引入新依赖
- 不修改纯函数签名本质（不引入 `Result<T,E>` 类型）
- 所有边界层使用 `logError('模块:操作', err)` 格式
- 纯函数自然抛出，边界捕获
- Pre-commit hook 保持：`tsc -p tsconfig.node.json` + `tsc -p tsconfig.web.json`

---

## 1. allFiles 派生值依赖陈旧 → FileSearch 搜索结果不完整（Bug）

### 涉及文件

- `src/renderer/App.tsx:47-59` — `allFiles` useMemo
- `src/renderer/features/file-tree/useFileStore.ts` — file tree store

### 问题

`App.tsx` 中 `allFiles` 计算使用 `useMemo([initialized])`，内部通过 `useFileStore.getState().entries` 获取文件树数据快照。初始化完成后 `initialized` 不再变化，`useMemo` 永不重新计算。用户展开目录（`toggleExpand` → `loadChildren` → 新 entries）后，`FileSearch` 永远看不到新加载的文件。

`allFiles` 作为文件树数据的扁平派生视图，应归属 `useFileStore`——那里的 `entries` 变化自然触发重新计算。

### 方案

将 `allFiles` 作为派生 selector 移入 `useFileStore`：

```ts
// useFileStore.ts — 新增 selector
const selectAllFiles = (state: FileState): FileItem[] => {
  const result: FileItem[] = []
  for (const [, items] of Object.entries(state.entries)) {
    for (const entry of items) {
      if (entry.type === 'file') {
        result.push({ name: entry.name, path: entry.path })
      }
    }
  }
  return result
}
// 或使用 zustand 的 computed 模式
```

`App.tsx` 改为：

```ts
const allFiles = useFileStore(state => {
  const result: FileItem[] = []
  for (const [, items] of Object.entries(state.entries)) {
    for (const entry of items) {
      if (entry.type === 'file') result.push({ name: entry.name, path: entry.path })
    }
  }
  return result
})

// 仅 useFileStore 的 initialized 守卫保留在 App.tsx
const { initialized, ... } = useWorkspaceInit(...)
```

移除当前的 `eslint-disable` 注释和内联 `allFilesMemo` + `allFilesRef` 变通代码。

### 收益

- 修复用户可见 Bug——展开目录后 FileSearch 能搜到新文件
- **局域性**——文件树数据的"全量扁平视图"由文件树 store 自己维护
- 消除 App.tsx 中的 `eslint-disable` 和 ref 变通代码

---

## 2. 滚动位置保存覆写——其他文件的滚动位置丢失（Bug）

### 涉及文件

- `src/renderer/hooks/useScrollRestore.ts:12-14`

### 问题

每次滚动触发保存时：

```ts
ipc.store.set('readingPositions', { [activeFile]: container.scrollTop })
```

这行代码**完全覆写** `readingPositions` 对象。用户滚动文件 A → 保存 `{ a.md: 500 }` → 滚动文件 B → 保存 `{ b.md: 300 }` → 文件 A 的位置 500 永久丢失。

### 方案

每次保存前从 store 读取旧值再合并：

```ts
const saveScrollPosition = async () => {
  if (!activeFile) return
  const container = getScrollContainer()
  if (!container) return
  const top = container.scrollTop
  try {
    const saved = await ipc.store.get<Record<string, number>>('readingPositions') || {}
    await ipc.store.set('readingPositions', { ...saved, [activeFile]: top })
  } catch (err) {
    logError('useScrollRestore:save', err)
  }
}
```

将当前的匿名函数抽取为命名函数，增强可读性。

### 收益

- 修复数据丢失 Bug
- 修改极其局部化（单文件内的 10 行变更）

---

## 3. StoreSchema / AppSettings 类型重复

### 涉及文件

- `src/main/store.ts:4-14` — `StoreSchema` 接口（14 字段）
- `src/shared/types.ts:44-54` — `AppSettings` 接口（9 字段）

### 问题

两个接口描述相同的持久化数据结构，字段定义散落在主进程和共享层。新增字段需两端同步。当前 `StoreSchema` 有 14 字段而 `AppSettings` 有 9 字段——已经在漂移。

### 方案

**选择 A（推荐）：以 `types.ts` 为单一事实来源**

1. 盘点 `StoreSchema` 中比 `AppSettings` 多的字段，将其合并到 `types.ts` 的 `AppSettings` 中——确保 `AppSettings` 包含所有持久化字段
2. `store.ts` 中的 `StoreSchema` 定义替换为 `import type { AppSettings } from '../shared/types'` 并重导出别名 `type StoreSchema = AppSettings`

执行时第一步先盘点两个接口的实际字段差异，然后一次性合并。

```ts
// store.ts
import type { AppSettings } from '../shared/types'
export type StoreSchema = AppSettings // 保持向后兼容的导出名
```

**选择 B：`StoreSchema extends AppSettings`**

只在 store.ts 保留扩展需要。

推荐**选择 A**——类型位于共享层天然合理，因为 preload 暴露的 `ElectronAPI` 也用到 `AppSettings`。

### 收益

- **局域性**——持久化 schema 只有一个真实来源
- 新增字段只需改 `types.ts` 一处，编译期检查所有引用点

---

## 4. Menu IPC 通道硬编码 + watcher.ts 字符串字面量

### 涉及文件

- `src/main/menu.ts:12-95` — 10 个菜单通道（发送端，硬编码字符串）
- `src/renderer/hooks/useMenuIpc.ts:1-52` — 9 个菜单通道（接收端，硬编码字符串）
- `src/main/watcher.ts:21` — 使用字符串字面量而非 `IPC_CHANNELS.WATCHER_FILE_CHANGED`
- `src/shared/types.ts:1-17` — `IPC_CHANNELS` 常量（缺菜单通道）

### 问题

菜单通道 `'menu:openFolder'`、`'menu:toggleFileTree'` 等在两端独立维护为裸字符串，不在 `IPC_CHANNELS` 中。`watcher.ts:21` 使用字符串 `'watcher:fileChanged'` 而 `types.ts` 定义了 `IPC_CHANNELS.WATCHER_FILE_CHANGED = 'watcher:fileChanged'`——恰好值相同，但未引用常量。

### 方案

1. **补全 `IPC_CHANNELS`**：在 `types.ts` 中添加 9 个菜单通道常量

```ts
// shared/types.ts
export const IPC_CHANNELS = {
  // ... 现有通道
  // 菜单通道
  MENU_OPEN_FOLDER: 'menu:openFolder',
  MENU_TOGGLE_FILE_TREE: 'menu:toggleFileTree',
  MENU_TOGGLE_OUTLINE: 'menu:toggleOutline',
  MENU_FILE_SEARCH: 'menu:fileSearch',
  MENU_CONTENT_SEARCH: 'menu:contentSearch',
  MENU_OPEN_SETTINGS: 'menu:openSettings',
  MENU_CLOSE_TAB: 'menu:closeTab',
  MENU_NEXT_TAB: 'menu:nextTab',
  MENU_PREV_TAB: 'menu:prevTab',
} as const
```

2. **`menu.ts`**：将所有 `mainWindow.webContents.send('menu:...')` 替换为 `mainWindow.webContents.send(IPC_CHANNELS.MENU_...)`

3. **`useMenuIpc.ts`**：将所有 `ipc.on('menu:...')` 和 `ipc.off('menu:...')` 替换为常量引用

4. **`watcher.ts:21`**：`'watcher:fileChanged'` → `IPC_CHANNELS.WATCHER_FILE_CHANGED`

### 收益

- IPC 通道的**局域性**——所有通道名在 `types.ts` 一处定义
- 编译器可捕获拼写错误和更名遗漏
- 消除 `watcher.ts` 中的渠道不一致风险（字符串值虽相同，但未来更名会遗漏此处）

---

## 5. ThemeProvider 不响应 OS 主题变更

### 涉及文件

- `src/renderer/components/ThemeProvider.tsx`

### 问题

`useEffect([theme])` 仅在 `useUIStore` 中的主题值变化时触发。当 `theme='system'` 且用户在应用运行期间更改 OS 主题偏好：

1. `useEffect` 不重新执行 → `dark` 类不更新 → UI 主题滞后于 OS
2. 只有手动切换 theme 到非 system 再切回才会刷新

### 方案

添加 `matchMedia` 监听器，仅在 `theme === 'system'` 时响应 OS 变更：

```tsx
useEffect(() => {
  const applyTheme = (isDark: boolean) => {
    document.documentElement.classList.toggle('dark', isDark)
  }

  if (theme === 'system') {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    applyTheme(mq.matches)
    const handler = (e: MediaQueryListEvent) => applyTheme(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }

  applyTheme(theme === 'dark')
  // light 模式无需清理，下一个 effect 会覆盖
}, [theme])
```

### 收益

- **深度**提升——ThemeProvider 的 `'system'` 模式真正实现"跟随系统"语义
- 用户体验改善——切换 OS 暗黑模式后应用立即响应
- 无新依赖——`matchMedia` 是浏览器标准 API（Electron 渲染进程原生支持）

---

## 6. 搜索无取消机制——旧查询结果覆盖新查询

### 涉及文件

- `src/main/search.ts:53-73` — `searchDirectory` 同步遍历
- `src/renderer/features/search/ContentSearch.tsx` — 搜索结果订阅
- `src/main/index.ts` — IPC handler 注册

### 问题

`searchDirectory` 顺序遍历所有文件并流式推送结果。用户修改查询 → 新搜索启动，但旧搜索的回调继续推送 `.send(SEARCH_RESULT)` → 结果列表中的条目同时来自新旧两个查询 → UI 显示混乱。

### 方案

利用 IPC handler 层的闭包实现轻量取消：`searchDirectory` 纯函数签名**完全不修改**（遵守约束），但传给它的 `onProgress` 回调在每次被调用时检查取消标记——如果新搜索已启动则静默跳过（no-op），不再 `webContents.send` 结果。CPU 上 `searchDirectory` 仍会遍历完文件列表（可接受——本地文本搜索通常毫秒级完成），渲染进程不再收到过期结果。

**主进程侧（仅 `index.ts` 改动）：**

```ts
// index.ts
let activeSearchId = 0

ipcMain.on(IPC_CHANNELS.SEARCH_CONTENT, (_event, dirPath: string, query: string) => {
  // 递增 id，旧搜索的 onProgress 回调变为 no-op
  const searchId = ++activeSearchId
  const mainWin = getMainWindow()
  if (!mainWin) return
  const ignoreList = appStore.get('ignoreList')

  searchDirectory(dirPath, query, (progress) => {
    // 只在仍是活跃搜索时才发送结果
    if (searchId === activeSearchId) {
      mainWin.webContents.send(IPC_CHANNELS.SEARCH_RESULT, progress)
    }
  }, ignoreList)
})
```

**关键点：**
- `searchDirectory` 签名不变（`searchDirectory(dirPath, query, onProgress, ignoreList?)`）
- `onProgress` 类型不变（`SearchProgress => void`）
- 取消逻辑完全在 `index.ts` 闭包中实现——`searchId` 捕获在回调创建时，与模块级 `activeSearchId` 比较
- 新搜索启动 → `activeSearchId` 递增 → 旧回调的 `searchId !== activeSearchId` → `webContents.send` 被跳过
- 渲染进程 `ContentSearch.tsx` 无需改造——它只收到当前查询的正确结果

### 收益

- 消除搜索竞态——用户快速修改查询时不再看到旧结果
- 为 `watcher` 等其他流式 IPC 模块建立通用取消模式
- **杠杆**——同一个 `searchStates` map 可承载超时取消、手动取消等后续扩展

---

## 7. `protocol.ts` 无错误处理

### 涉及文件

- `src/main/protocol.ts:15-23`

### 问题

```ts
const data = await readFile(filePath)
```

自定义 `local-file://` 协议处理器中 `readFile` 无 try/catch。文件不存在、权限拒绝、磁盘错误时：
- 无 `logError` 记录
- 错误传播为 Electron 协议层未处理异常，渲染进程显示默认错误页面
- 违反项目"所有边界层捕获"的决策

### 方案

包裹 `readFile` 调用：

```ts
protocol.handle('local-file', async (request) => {
  try {
    const filePath = request.url.replace('local-file://', '')
    const ext = extname(filePath).toLowerCase()
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream'
    const data = await readFile(filePath)
    return new Response(data, { headers: { 'content-type': mimeType } })
  } catch (err) {
    logError('protocol:readFile', err)
    return new Response('File not found', { status: 404 })
  }
})
```

### 收益

- 符合项目"所有边界层捕获"决策
- 协议错误不会泛化为未处理异常
- 渲染进程获得 404 响应而非 Electron 默认错误页

---

## 8. 菜单点击处理器错误处理不一致

### 涉及文件

- `src/main/menu.ts:12-95` — 10 个点击处理器的 `click` 回调

### 问题

10 个菜单点击处理器中，仅 2 个（`openFolder`、`about`）有 try/catch + `logError`。其余 8 个：
- `closeTab`、`toggleFileTree`、`toggleOutline`、`fileSearch`、`contentSearch`、`openSettings`、`nextTab`、`prevTab`

这些函数调用 `mainWindow.webContents.send(...)`——如果 mainWindow 为 null（窗口关闭中触发菜单）或 `webContents.send` 抛出异常，将被 `process.on('uncaughtException')` 作为最后防线捕获。

### 方案

为 8 个缺少错误处理的点击处理器添加统一的 try/catch + `logError`：

```ts
{
  label: '关闭标签页',
  accelerator: 'CmdOrCtrl+W',
  click: () => {
    try {
      mainWindow?.webContents.send('menu:closeTab')
    } catch (err) {
      logError('menu:closeTab', err)
    }
  },
}
```

注意：保持使用 IPC 通道常量（见第 4 项），此处仅关注缺失的 try/catch。

### 收益

- 统一菜单错误处理模式——10 个处理器全部遵守边界捕获
- 符合项目"事件监听器边界捕获"决策
- 8 个 touchpoint 的错误路径在 3 行内（单一 catch 块）

---

## 9. index.ts 零单元测试

### 涉及文件

- `src/main/index.ts`（116 行）
- 新增 `src/main/index.spec.ts`

### 问题

8 个 IPC handler 注册 + 应用生命周期 + 全局错误处理器，全部零单元测试。这是主进程组合根，任何重构（如第 4、6、8 项的 index.ts 修改）缺乏安全网。

### 方案

由于 `index.ts` 的大部分逻辑已抽取到 `handlers.ts`（第 2 轮成果），测试策略分两层：

#### 9A：App 工厂函数抽取

将 `app.on('ready')` 内的 wiring 逻辑抽取为可测试的工厂函数：

```ts
// index.ts — 新增导出（仅测试使用）
export function registerIpcHandlers(
  handlers: typeof import('./handlers'),
  deps: { appStore: Store, getMainWindow: () => BrowserWindow | null, watchFile: Function, unwatchFile: Function }
): void {
  // 原 app.on('ready') 内部的 ipcMain.handle/on 注册
}
```

#### 9B：index.spec.ts 测试用例

`src/main/index.spec.ts`

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerIpcHandlers } from './index'

// mock electron
vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn(), on: vi.fn() },
  app: { on: vi.fn() },
  // ...
}))

describe('index', () => {
  it('注册 8 个 IPC handler', () => {
    const mockIpcMain = { handle: vi.fn(), on: vi.fn() }
    registerIpcHandlers(handlers, deps)
    // files:listDirectory, files:readFile, files:getFileInfo
    // store:get, store:set, store:delete
    // dialog:openDirectory, dialog:openFile, shell:openExternal
    expect(mockIpcMain.handle).toHaveBeenCalledTimes(6)
  })

  it('注册 search 和 watcher 通道 (send/on)', () => {
    // watcher.watchFile, watcher.unwatchFile, search.searchContent
    expect(mockIpcMain.on).toHaveBeenCalledTimes(3)
  })

  it('注册未捕获异常和拒绝处理', () => {
    // process.on('uncaughtException') + process.on('unhandledRejection')
  })

  it('app.on(\'ready\') 调用 createWindow + createAppMenu + registerIpcHandlers', () => {
    // 验证生命周期链
  })
})
```

### 收益

- 主进程组合根有测试安全网
- 后续 IPC handler 增删改有测试保护
- `registerIpcHandlers` 的接口签名即为可测试的 seam

---

## 实施顺序建议

按依赖链自底向上排列：

| 顺序 | 项 | 预估工时 | 依赖 | 风险 |
|------|-----|----------|------|------|
| 1 | #3 类型去重 (StoreSchema→AppSettings) | 20 min | 无 | 低——影响多个 import |
| 2 | #4 通道规范化 (IPC_CHANNELS + menu + watcher) | 25 min | 无 | 低——纯字符串替换 |
| 3 | #7 protocol.ts 错误处理 | 5 min | 无 | 低——单函数 try/catch |
| 4 | #8 菜单错误处理统一 | 15 min | #4（共享通道常量） | 低——复制 try/catch 模式 |
| 5 | #6 搜索取消机制 | 30 min | 无 | 中——涉及 IPC 协议变更 |
| 6 | #1 allFiles 陈旧 Bug | 20 min | 无 | 低——useFileStore selector 模式 |
| 7 | #2 滚动位置覆盖 Bug | 10 min | 无 | 低——单文件 merge 逻辑 |
| 8 | #5 ThemeProvider OS 响应 | 15 min | 无 | 低——matchMedia API 标准 |
| 9 | #9 index.ts 测试 | 45 min | #4（测试含通道常量）、#8（测试含错误处理） | 中——需抽取工厂函数 |

**合计约 3 小时。** 全部 123 单元测试 + 29 E2E 测试预期继续通过。

---

## 非目标

- 不合并 `handlers.ts` 回 `index.ts`——第 2 轮架构深化中故意抽出以提升测试性，保留现有分层
- 不删除 `lib/ipc.ts`——它是集中式 IPC adapter，提供类型安全和单一导入点
- 不修改 `searchDirectory` 的异步并发模型（保持同步遍历）
- 不引入 `path-browserify` 替代 `shared/utils.ts` 的 path 工具函数
- 不修改 `dirtyFiles` Set 的暴露方式——现有 `markDirty`/`clearDirty` 封装已足够
