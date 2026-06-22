# 架构深化第三轮 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 修复 2 个用户可见 Bug + 4 项结构修复 + 2 项防御缺口 + 1 项测试补全。共 9 个 Task。

**技术栈：** TypeScript、Electron、React 19、Zustand、Vitest

**全局约束：**
- 不引入新依赖
- 不修改纯函数签名本质
- 所有边界层使用 `logError('模块:操作', err)` 格式
- Pre-commit hook: `tsc -p tsconfig.node.json && tsc -p tsconfig.web.json`
- 每个 Task 完成后运行对应验证命令

---

### Task 1: #3 StoreSchema / AppSettings 类型去重

**文件：**
- 修改：`src/main/store.ts`

**接口：**
- 产出：`store.ts` 中的 `StoreSchema` 改为从 `types.ts` 导入 `AppSettings` 的类型别名（对外导出名不变）

两者字段完全一致（9 字段），合并为单一来源。

- [ ] **Step 1: 将 StoreSchema 替换为 AppSettings 的类型别名**

编辑 `src/main/store.ts`：
- 删除第 4-14 行的 `StoreSchema` 接口定义
- 在第 3 行后添加从 `../shared/types` 导入 `AppSettings`
- 用 `export type StoreSchema = AppSettings` 替代原接口

```ts
import ElectronStore from 'electron-store'
import { DEFAULT_IGNORE } from './files'
import type { AppSettings } from '../shared/types'

export type StoreSchema = AppSettings
```

原接口定义（第 4-14 行）删除。`appStore` 的泛型 `StoreSchema` 通过类型别名自动解析为 `AppSettings`，对外接口完全不变。

- [ ] **Step 2: 验证类型检查和现有测试**

```bash
npx tsc --noEmit -p tsconfig.node.json
```

预期：0 errors。

```bash
npx vitest run --config vitest.config.main.ts
```

预期：所有 main 测试通过。

---

### Task 2: #4 IPC_CHANNELS 补充菜单通道 + watcher/useMenuIpc 迁移

**文件：**
- 修改：`src/shared/types.ts`（添加 9 个菜单通道常量）
- 修改：`src/main/menu.ts`（替换 10 个硬编码字符串）
- 修改：`src/renderer/hooks/useMenuIpc.ts`（替换 9 个硬编码字符串）
- 修改：`src/main/watcher.ts:21`（替换硬编码字符串）

- [ ] **Step 1: 在 IPC_CHANNELS 中添加 9 个菜单通道常量**

编辑 `src/shared/types.ts`，在 `IPC_CHANNELS` 对象末尾添加（`SHELL_OPEN_EXTERNAL` 之后）：

```ts
export const IPC_CHANNELS = {
  FILES_LIST_DIRECTORY: 'files:listDirectory',
  FILES_READ_FILE: 'files:readFile',
  FILES_GET_FILE_INFO: 'files:getFileInfo',
  FILES_SEARCH_CONTENT: 'files:searchContent',
  SEARCH_RESULT: 'search:result',
  WATCHER_WATCH_FILE: 'watcher:watchFile',
  WATCHER_UNWATCH_FILE: 'watcher:unwatchFile',
  WATCHER_FILE_CHANGED: 'watcher:fileChanged',
  STORE_GET: 'store:get',
  STORE_SET: 'store:set',
  STORE_DELETE: 'store:delete',
  DIALOG_OPEN_DIRECTORY: 'dialog:openDirectory',
  DIALOG_OPEN_FILE: 'dialog:openFile',
  SHELL_OPEN_EXTERNAL: 'shell:openExternal',
  MENU_OPEN_FOLDER: 'menu:openFolder',
  MENU_CLOSE_TAB: 'menu:closeTab',
  MENU_TOGGLE_FILE_TREE: 'menu:toggleFileTree',
  MENU_TOGGLE_OUTLINE: 'menu:toggleOutline',
  MENU_FILE_SEARCH: 'menu:fileSearch',
  MENU_CONTENT_SEARCH: 'menu:contentSearch',
  MENU_OPEN_SETTINGS: 'menu:openSettings',
  MENU_NEXT_TAB: 'menu:nextTab',
  MENU_PREV_TAB: 'menu:prevTab',
} as const
```

- [ ] **Step 2: 修复 watcher.ts:21 的硬编码字符串**

编辑 `src/main/watcher.ts:21`，将：

```ts
window.webContents.send('watcher:fileChanged', event, null)
```

替换为：

```ts
window.webContents.send(IPC_CHANNELS.WATCHER_FILE_CHANGED, event, null)
```

`IPC_CHANNELS` 已在第 6 行导入，无需新增 import。

- [ ] **Step 3: 更新 menu.ts 中的 10 个硬编码字符串**

编辑 `src/main/menu.ts`，在文件顶部添加导入：

```ts
import { IPC_CHANNELS } from '../shared/types'
```

然后替换 10 处 `mainWindow.webContents.send(...)` 调用：

| 行号 | 原字符串 | 替换为 |
|------|----------|--------|
| 18 | `'menu:openFolder'` | `IPC_CHANNELS.MENU_OPEN_FOLDER` |
| 29 | `'menu:closeTab'` | `IPC_CHANNELS.MENU_CLOSE_TAB` |
| 53 | `'menu:toggleFileTree'` | `IPC_CHANNELS.MENU_TOGGLE_FILE_TREE` |
| 58 | `'menu:toggleOutline'` | `IPC_CHANNELS.MENU_TOGGLE_OUTLINE` |
| 64 | `'menu:fileSearch'` | `IPC_CHANNELS.MENU_FILE_SEARCH` |
| 69 | `'menu:contentSearch'` | `IPC_CHANNELS.MENU_CONTENT_SEARCH` |
| 75 | `'menu:openSettings'` | `IPC_CHANNELS.MENU_OPEN_SETTINGS` |
| 91 | `'menu:nextTab'` | `IPC_CHANNELS.MENU_NEXT_TAB` |
| 96 | `'menu:prevTab'` | `IPC_CHANNELS.MENU_PREV_TAB` |

第 18 行额外传递 `result.filePaths[0]` 作为第二个参数，保持参数不变：
```ts
mainWindow.webContents.send(IPC_CHANNELS.MENU_OPEN_FOLDER, result.filePaths[0])
```

- [ ] **Step 4: 更新 useMenuIpc.ts 中的 9 个硬编码字符串**

编辑 `src/renderer/hooks/useMenuIpc.ts`，在文件顶部添加导入：

```ts
import { IPC_CHANNELS } from '../../shared/types'
```

然后替换 9 处 `ipc.ipc.on(channel, ...)` 调用的第一个参数：

| 行号 | 原字符串 | 替换为 |
|------|----------|--------|
| 25 | `'menu:openFolder'` | `IPC_CHANNELS.MENU_OPEN_FOLDER` |
| 26 | `'menu:toggleFileTree'` | `IPC_CHANNELS.MENU_TOGGLE_FILE_TREE` |
| 27 | `'menu:toggleOutline'` | `IPC_CHANNELS.MENU_TOGGLE_OUTLINE` |
| 28 | `'menu:fileSearch'` | `IPC_CHANNELS.MENU_FILE_SEARCH` |
| 29 | `'menu:contentSearch'` | `IPC_CHANNELS.MENU_CONTENT_SEARCH` |
| 30 | `'menu:openSettings'` | `IPC_CHANNELS.MENU_OPEN_SETTINGS` |
| 31 | `'menu:closeTab'` | `IPC_CHANNELS.MENU_CLOSE_TAB` |
| 35 | `'menu:nextTab'` | `IPC_CHANNELS.MENU_NEXT_TAB` |
| 42 | `'menu:prevTab'` | `IPC_CHANNELS.MENU_PREV_TAB` |

- [ ] **Step 5: 验证类型检查**

主进程：
```bash
npx tsc --noEmit -p tsconfig.node.json
```
预期：0 errors。

渲染进程：
```bash
npx tsc --noEmit -p tsconfig.web.json
```
预期：0 errors。

- [ ] **Step 6: 运行现有测试确认回归**

```bash
npx vitest run --config vitest.config.main.ts && npx vitest run --config vitest.config.ts
```

预期：所有主进程和渲染进程测试通过。

---

### Task 3: #7 protocol.ts 添加错误处理

**文件：**
- 修改：`src/main/protocol.ts`

- [ ] **Step 1: 为 readFile 添加 try/catch + logError**

编辑 `src/main/protocol.ts`，在第 3 行后添加 logger import，包裹 `readFile` 调用：

```ts
import { protocol } from 'electron'
import { readFile } from 'fs/promises'
import { extname } from 'path'
import { logError } from './logger'

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
}

export function registerFileProtocol(): void {
  protocol.handle('local-file', async (request) => {
    try {
      const filePath = decodeURIComponent(request.url.slice('local-file://'.length))
      const ext = extname(filePath).toLowerCase()
      const data = await readFile(filePath)
      return new Response(data, {
        headers: { 'Content-Type': MIME_MAP[ext] || 'application/octet-stream' },
      })
    } catch (err) {
      logError('protocol:readFile', err)
      return new Response('File not found', { status: 404 })
    }
  })
}
```

- [ ] **Step 2: 验证**

```bash
npx tsc --noEmit -p tsconfig.node.json
```
预期：0 errors。

```bash
npx vitest run --config vitest.config.main.ts
```
预期：所有 main 测试通过（protocol.spec.ts 已有 2 tests）。

---

### Task 4: #8 菜单点击处理器错误处理统一

**文件：**
- 修改：`src/main/menu.ts`

- [ ] **Step 1: 为 8 个缺少 try/catch 的 click 处理器添加错误处理**

编辑 `src/main/menu.ts`。以下 8 个 click 处理器当前只有 `mainWindow.webContents.send(...)` 调用，需要包裹 try/catch：

**第 29 行 — closeTab：**
```ts
click: () => {
  try {
    mainWindow.webContents.send(IPC_CHANNELS.MENU_CLOSE_TAB)
  } catch (err) {
    logError('menu:closeTab', err)
  }
},
```

**第 53 行 — toggleFileTree：**
```ts
click: () => {
  try {
    mainWindow.webContents.send(IPC_CHANNELS.MENU_TOGGLE_FILE_TREE)
  } catch (err) {
    logError('menu:toggleFileTree', err)
  }
},
```

**第 58 行 — toggleOutline：**
```ts
click: () => {
  try {
    mainWindow.webContents.send(IPC_CHANNELS.MENU_TOGGLE_OUTLINE)
  } catch (err) {
    logError('menu:toggleOutline', err)
  }
},
```

**第 64 行 — fileSearch：**
```ts
click: () => {
  try {
    mainWindow.webContents.send(IPC_CHANNELS.MENU_FILE_SEARCH)
  } catch (err) {
    logError('menu:fileSearch', err)
  }
},
```

**第 69 行 — contentSearch：**
```ts
click: () => {
  try {
    mainWindow.webContents.send(IPC_CHANNELS.MENU_CONTENT_SEARCH)
  } catch (err) {
    logError('menu:contentSearch', err)
  }
},
```

**第 75 行 — openSettings：**
```ts
click: () => {
  try {
    mainWindow.webContents.send(IPC_CHANNELS.MENU_OPEN_SETTINGS)
  } catch (err) {
    logError('menu:openSettings', err)
  }
},
```

**第 91 行 — nextTab：**
```ts
click: () => {
  try {
    mainWindow.webContents.send(IPC_CHANNELS.MENU_NEXT_TAB)
  } catch (err) {
    logError('menu:nextTab', err)
  }
},
```

**第 96 行 — prevTab：**
```ts
click: () => {
  try {
    mainWindow.webContents.send(IPC_CHANNELS.MENU_PREV_TAB)
  } catch (err) {
    logError('menu:prevTab', err)
  }
},
```

已有 try/catch 的两个（openFolder 第 12-23 行、about 第 105-115 行）保持不变，仅将其中字符串替换为 `IPC_CHANNELS.MENU_OPEN_FOLDER`（如 Task 2 未覆盖则一并完成）。

- [ ] **Step 2: 验证**

```bash
npx tsc --noEmit -p tsconfig.node.json
```
预期：0 errors。

```bash
npx vitest run --config vitest.config.main.ts
```
预期：所有 main 测试通过。

---

### Task 5: #6 搜索取消机制

**文件：**
- 修改：`src/main/index.ts`

**接口：**
- 消耗：`searchDirectory`（来自 `search.ts`，签名不变）
- 消耗：`handleSearchContent`（来自 `handlers.ts`，签名不变）

纯函数 `searchDirectory` 和 `handleSearchContent` **不修改**。取消逻辑完全在 `index.ts` 的 IPC handler 闭包中实现。

- [ ] **Step 1: 在 index.ts 的搜索 IPC handler 中添加 searchId 取消机制**

编辑 `src/main/index.ts`，在第 97-104 行的 `FILES_SEARCH_CONTENT` handler 上方添加模块级计数器：

```ts
let activeSearchId = 0

ipcMain.on(IPC_CHANNELS.FILES_SEARCH_CONTENT, (_event, dirPath: string, query: string) => {
  const searchId = ++activeSearchId
  const mainWin = getMainWindow()
  if (!mainWin) return
  const ignoreList = appStore.get('ignoreList')
  handleSearchContent(dirPath, query, ignoreList, (progress) => {
    if (searchId === activeSearchId) {
      mainWin.webContents.send(IPC_CHANNELS.SEARCH_RESULT, progress)
    }
  })
})
```

**原理：**
- 每次新搜索启动 → `activeSearchId` 递增 → 旧回调的 capture 的 `searchId` 不再等于全局 `activeSearchId` → `webContents.send` 被跳过
- `searchDirectory` 持续遍历但结果不再被发送到渲染进程
- 纯函数签名零变更

- [ ] **Step 2: 验证类型检查**

```bash
npx tsc --noEmit -p tsconfig.node.json
```
预期：0 errors。

- [ ] **Step 3: 运行现有测试**

```bash
npx vitest run --config vitest.config.main.ts
```
预期：所有 main 测试通过。

---

### Task 6: #1 allFiles 派生值依赖陈旧 Bug

**文件：**
- 修改：`src/renderer/App.tsx:46-59`

- [ ] **Step 1: 将 allFiles 改为响应 entries 变化的 zustand selector**

编辑 `src/renderer/App.tsx`，删除第 46-59 行的 `useMemo` 块（含 `eslint-disable` 注释），替换为对 `useFileStore` 的 selector：

删除：
```ts
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
```

替换为：
```ts
  const allFiles = useFileStore((s) => {
    const files: { path: string; name: string }[] = []
    for (const dir of Object.values(s.entries)) {
      for (const entry of dir) {
        if (!entry.isDirectory) {
          files.push({ path: entry.path, name: entry.name })
        }
      }
    }
    return files
  })
```

同时删除 `App.tsx` 顶部第 1 行中不再需要的 `useMemo` 导入（如果 `useMemo` 仅在 allFiles 中使用）：
```ts
import { useEffect } from 'react'  // 删除 useMemo
```

检查：`useMemo` 仅在 allFiles 计算中使用，`useEffect` 在第 61/67/73/79 行仍使用 → 可以移除 `useMemo` 导入。

- [ ] **Step 2: 验证类型检查**

```bash
npx tsc --noEmit -p tsconfig.web.json
```
预期：0 errors。

- [ ] **Step 3: 运行渲染进程测试**

```bash
npx vitest run --config vitest.config.ts
```
预期：所有 renderer 测试通过。（`App.test.tsx` 有 4 个集成测试，需确认 `allFiles` 变化不影响它们）

---

### Task 7: #2 滚动位置保存覆写 Bug

**文件：**
- 修改：`src/renderer/hooks/useScrollRestore.ts:10-16`

- [ ] **Step 1: 保存时先读后合并，避免覆写其他文件的位置**

编辑 `src/renderer/hooks/useScrollRestore.ts`，将第 10-16 行的 `handleScroll` 改为异步（先读取旧值再合并）：

```ts
import { useEffect, useCallback } from 'react'
import { ipc } from '../lib/ipc'
import { logError } from '../logger'

export function useScrollRestore(activeFile: string | null, content: string | undefined) {
  useEffect(() => {
    if (!activeFile) return
    const container = document.querySelector('main > div:first-child')
    if (!container) return

    const handleScroll = () => {
      const top = container.scrollTop
      ipc.store
        .get<Record<string, number>>('readingPositions')
        .then((saved) => ({ ...saved, [activeFile]: top }))
        .then((merged) => ipc.store.set('readingPositions', merged))
        .catch((err) => logError('useScrollRestore:save', err))
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [activeFile])

  useEffect(() => {
    if (!activeFile || !content) return
    ;(async () => {
      const positions = await ipc.store
        .get<Record<string, number>>('readingPositions')
        .catch((err) => {
          logError('useScrollRestore:load', err)
          return undefined
        })
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

- [ ] **Step 2: 验证类型检查**

```bash
npx tsc --noEmit -p tsconfig.web.json
```
预期：0 errors。

- [ ] **Step 3: 运行相关测试**

```bash
npx vitest run --config vitest.config.ts src/renderer/hooks/useScrollRestore.test.ts
```
预期：useScrollRestore 测试通过。

---

### Task 8: #5 ThemeProvider OS 主题变更响应

**文件：**
- 修改：`src/renderer/components/ThemeProvider.tsx`

- [ ] **Step 1: 添加 matchMedia change 监听器**

编辑 `src/renderer/components/ThemeProvider.tsx`，完整替换：

```ts
import { useEffect, type ReactNode } from 'react'
import { useUIStore } from '../stores/useUIStore'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useUIStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement

    const applyTheme = (isDark: boolean) => {
      root.classList.toggle('dark', isDark)
    }

    if (theme === 'dark') {
      applyTheme(true)
      return
    } else if (theme === 'light') {
      applyTheme(false)
      return
    }

    // system 模式：监听 OS 主题变更
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    applyTheme(mq.matches)

    const handleChange = (e: MediaQueryListEvent) => applyTheme(e.matches)
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [theme])

  return <>{children}</>
}
```

**改动点：**
- 提取 `applyTheme(isDark)` 辅助函数，消除重复的 `classList.add/remove` 逻辑
- `dark` / `light` 模式：`effect` 不返回 cleanup（`return` 意为 effect 自身无清理工作；下一个 `[theme]` 变化时 React 会自动重新 effect）
- `system` 模式：`effect` 返回 `removeEventListener` cleanup，确保切换离开 system 模式时移除监听

- [ ] **Step 2: 验证类型检查**

```bash
npx tsc --noEmit -p tsconfig.web.json
```
预期：0 errors。

- [ ] **Step 3: 运行相关测试**

```bash
npx vitest run --config vitest.config.ts src/renderer/components/ThemeProvider.test.tsx
```
预期：ThemeProvider 测试通过。

---

### Task 9: #9 index.ts 单元测试

**文件：**
- 修改：`src/main/index.ts`（抽取 `registerIpcHandlers` 函数）
- 创建：`src/main/index.spec.ts`

- [ ] **Step 1: 从 index.ts 中抽取 registerIpcHandlers 工厂函数**

编辑 `src/main/index.ts`，将 `app.on('ready')` 内部的 IPC handler 注册逻辑抽取为独立导出函数。

修改 `app.on('ready')` 块（第 26-108 行）为两步：先调用 `registerIpcHandlers`，再创建窗口和菜单。

完整替换 `app.on('ready', () => { ... })` 块：

```ts
app.on('ready', () => {
  try {
    registerFileProtocol()
    registerIpcHandlers()
    const win = createWindow()
    createAppMenu(win)
  } catch (err) {
    logError('app:ready', err)
  }
})
```

在 `app.on('ready')` 之前（第 25 行之后，26 行之前）插入导出的 `registerIpcHandlers` 函数：

```ts
export function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.FILES_LIST_DIRECTORY, (_event, dirPath: string) =>
    handleListDirectory(dirPath, appStore.get('ignoreList')),
  )
  ipcMain.handle(IPC_CHANNELS.FILES_READ_FILE, (_event, filePath: string) =>
    handleReadFile(filePath),
  )
  ipcMain.handle(IPC_CHANNELS.FILES_GET_FILE_INFO, (_event, filePath: string) =>
    handleGetFileInfo(filePath),
  )
  ipcMain.handle(IPC_CHANNELS.STORE_GET, (_event, key: string) => {
    try {
      return handleStoreGet(appStore.get, key as keyof StoreSchema)
    } catch (err) {
      logError('store:get', err)
      throw err
    }
  })
  ipcMain.handle(IPC_CHANNELS.STORE_SET, (_event, key: string, value: unknown) => {
    try {
      handleStoreSet(appStore.set, key as keyof StoreSchema, value as any)
    } catch (err) {
      logError('store:set', err)
    }
  })
  ipcMain.handle(IPC_CHANNELS.STORE_DELETE, (_event, key: string) => {
    try {
      handleStoreDelete(appStore.delete, key as keyof StoreSchema)
    } catch (err) {
      logError('store:delete', err)
    }
  })
  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_DIRECTORY, async () => {
    try {
      const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
      return result.canceled ? null : result.filePaths[0]
    } catch (err) {
      logError('dialog:openDirectory', err)
      throw err
    }
  })
  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_FILE, async () => {
    try {
      const result = await dialog.showOpenDialog({ properties: ['openFile'] })
      return result.canceled ? null : result.filePaths[0]
    } catch (err) {
      logError('dialog:openFile', err)
      throw err
    }
  })
  ipcMain.handle(IPC_CHANNELS.SHELL_OPEN_EXTERNAL, (_event, url: string) =>
    shell.openExternal(url),
  )

  ipcMain.on(IPC_CHANNELS.WATCHER_WATCH_FILE, (_event, filePath: string) => {
    watchFile(filePath, win)
  })
  ipcMain.on(IPC_CHANNELS.WATCHER_UNWATCH_FILE, (_event, filePath: string) => {
    try {
      unwatchFile(filePath)
    } catch (err) {
      logError('watcher:unwatchFile', err)
    }
  })

  let activeSearchId = 0
  ipcMain.on(IPC_CHANNELS.FILES_SEARCH_CONTENT, (_event, dirPath: string, query: string) => {
    const searchId = ++activeSearchId
    const mainWin = getMainWindow()
    if (!mainWin) return
    const ignoreList = appStore.get('ignoreList')
    handleSearchContent(dirPath, query, ignoreList, (progress) => {
      if (searchId === activeSearchId) {
        mainWin.webContents.send(IPC_CHANNELS.SEARCH_RESULT, progress)
      }
    })
  })
}
```

注意：`registerIpcHandlers` 内部引用 `win` 变量（第 85 行的 `watchFile(filePath, win)`），需要改为通过 `getMainWindow()` 获取。修复：

```ts
ipcMain.on(IPC_CHANNELS.WATCHER_WATCH_FILE, (_event, filePath: string) => {
  const mainWin = getMainWindow()
  if (mainWin) watchFile(filePath, mainWin)
})
```

- [ ] **Step 2: 编写 index.spec.ts**

创建 `src/main/index.spec.ts`：

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockIpcMain = {
  handle: vi.fn(),
  on: vi.fn(),
}

vi.mock('electron', () => ({
  app: {
    on: vi.fn(),
    getVersion: () => '1.0.0',
  },
  BrowserWindow: vi.fn(),
  ipcMain: mockIpcMain,
  dialog: {
    showOpenDialog: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }),
    showMessageBox: vi.fn(),
  },
  shell: { openExternal: vi.fn() },
  Menu: {
    buildFromTemplate: vi.fn().mockReturnValue({}),
    setApplicationMenu: vi.fn(),
  },
  protocol: { handle: vi.fn() },
}))

vi.mock('./store', () => ({
  appStore: {
    get: vi.fn().mockReturnValue(['.git']),
    set: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
  },
  StoreSchema: {} as any,
}))

vi.mock('./watcher', () => ({
  watchFile: vi.fn(),
  unwatchFile: vi.fn(),
  unwatchAll: vi.fn(),
}))

vi.mock('./logger', () => ({
  logError: vi.fn(),
}))

vi.mock('./window', () => ({
  createWindow: vi.fn().mockReturnValue({
    webContents: { send: vi.fn() },
    on: vi.fn(),
    loadURL: vi.fn(),
  }),
  getMainWindow: vi.fn().mockReturnValue({
    webContents: { send: vi.fn() },
  }),
}))

vi.mock('./handlers', () => ({
  handleListDirectory: vi.fn(),
  handleReadFile: vi.fn(),
  handleGetFileInfo: vi.fn(),
  handleStoreGet: vi.fn(),
  handleStoreSet: vi.fn(),
  handleStoreDelete: vi.fn(),
  handleSearchContent: vi.fn(),
}))

describe('registerIpcHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('注册 8 个 ipcMain.handle 调用', async () => {
    const { registerIpcHandlers } = await import('./index')
    registerIpcHandlers()
    expect(mockIpcMain.handle).toHaveBeenCalledTimes(8)
  })

  it('注册 3 个 ipcMain.on 调用', async () => {
    const { registerIpcHandlers } = await import('./index')
    registerIpcHandlers()
    expect(mockIpcMain.on).toHaveBeenCalledTimes(3)
  })

  it('注册 files:listDirectory handler', async () => {
    const { registerIpcHandlers } = await import('./index')
    registerIpcHandlers()
    const calls = mockIpcMain.handle.mock.calls.map((c: any[]) => c[0])
    expect(calls).toContain('files:listDirectory')
  })

  it('注册 store:get handler', async () => {
    const { registerIpcHandlers } = await import('./index')
    registerIpcHandlers()
    const calls = mockIpcMain.handle.mock.calls.map((c: any[]) => c[0])
    expect(calls).toContain('store:get')
  })

  it('注册 dialog:openDirectory handler', async () => {
    const { registerIpcHandlers } = await import('./index')
    registerIpcHandlers()
    const calls = mockIpcMain.handle.mock.calls.map((c: any[]) => c[0])
    expect(calls).toContain('dialog:openDirectory')
  })

  it('注册 watcher:watchFile 和 watcher:unwatchFile 通道', async () => {
    const { registerIpcHandlers } = await import('./index')
    registerIpcHandlers()
    const calls = mockIpcMain.on.mock.calls.map((c: any[]) => c[0])
    expect(calls).toContain('watcher:watchFile')
    expect(calls).toContain('watcher:unwatchFile')
  })

  it('注册 search 通道', async () => {
    const { registerIpcHandlers } = await import('./index')
    registerIpcHandlers()
    const calls = mockIpcMain.on.mock.calls.map((c: any[]) => c[0])
    expect(calls).toContain('files:searchContent')
  })
})
```

- [ ] **Step 3: 验证 index.ts 类型检查**

```bash
npx tsc --noEmit -p tsconfig.node.json
```
预期：0 errors。

- [ ] **Step 4: 运行 index.spec.ts**

```bash
npx vitest run --config vitest.config.main.ts src/main/index.spec.ts
```
预期：7 tests pass。

---

### 最终验证

全部 Task 完成后，运行完整测试套件：

```bash
npx tsc --noEmit -p tsconfig.node.json && npx tsc --noEmit -p tsconfig.web.json && npx vitest run --config vitest.config.main.ts && npx vitest run --config vitest.config.ts
```

预期：类型检查 0 errors，所有单元测试通过（123+，含新增的 7 个 index.spec 测试）。
