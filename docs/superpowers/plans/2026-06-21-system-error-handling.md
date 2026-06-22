# 系统错误处理实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 为 markdown-viewer 所有系统错误添加处理路径，消除任何进程中的未捕获异常。

**架构：** 两层模型 — 纯函数自然抛出，边界层（IPC 处理器、事件监听器、副作用）统一捕获记录。main 用 `process.stderr.write`，renderer 用 `console.error`。

**技术栈：** Electron, TypeScript, React, zustand

**全局约束：**
- 不引入新依赖
- 不修改 `shared/types.ts`
- 不创建 `Result<T,E>` 类型或统一 Error 类
- 不修改纯函数签名（`files.ts`, `search.ts`）
- 所有异常在边界层捕获（IPC 处理器、事件监听器、渲染进程副作用）
- `process.on('uncaughtException')` / `'unhandledRejection'` 是最后防线，仅用于日志记录
- 每条错误路径必须记录：位置、错误类型、消息、stack

---

### Task 1: Logger 模块

**文件：**
- 创建：`src/main/logger.ts`
- 创建：`src/renderer/logger.ts`
- 验证：`pnpm run build`

**接口：**
- `logError(context: string, err: unknown): void` — 两个进程同名导出，实现不同

- [ ] **Step 1: 创建 `src/main/logger.ts`**

```ts
export function logError(context: string, err: unknown): void {
  if (err instanceof Error) {
    process.stderr.write(`[${context}] ${err.name}: ${err.message}\n`)
    if (err.stack) {
      process.stderr.write(`${err.stack}\n`)
    }
  } else {
    process.stderr.write(`[${context}] ${String(err)}\n`)
  }
}
```

- [ ] **Step 2: 创建 `src/renderer/logger.ts`**

```ts
export function logError(context: string, err: unknown): void {
  if (err instanceof Error) {
    console.error(`[${context}] ${err.name}: ${err.message}`)
    if (err.stack) {
      console.error(err.stack)
    }
  } else {
    console.error(`[${context}]`, err)
  }
}
```

- [ ] **Step 3: 验证编译**

运行：`pnpm run build`
预期：编译通过

---

### Task 2: 主进程全局处理器 + app.on('ready') 包裹

**文件：**
- 修改：`src/main/index.ts`
- 验证：`pnpm run build`

**接口：**
- 消费：`logError` from `./logger`

- [ ] **Step 1: 添加全局处理器**

在 `index.ts` 导入之后、`app.on('ready')` 之前插入：

```ts
import { logError } from './logger'

process.on('uncaughtException', (err) => {
  logError('uncaughtException', err)
})
process.on('unhandledRejection', (err) => {
  logError('unhandledRejection', err)
})
```

- [ ] **Step 2: 包裹 app.on('ready') 主体**

```ts
app.on('ready', () => {
  try {
    registerFileProtocol()
    // ... 所有现有内容
    const win = createWindow()
    createAppMenu(win)
    // ... 所有 IPC 处理器
  } catch (err) {
    logError('app:ready', err)
  }
})
```

需要将已有的 `app.on('ready', () => {` 改为带 `try {`，并在末尾 `})` 之前加上 `}` + `catch`。

- [ ] **Step 3: 将 `console.error` 替换为 `logError`**

现有 `console.error('[files:xxx]', err)` → `logError('files:xxx', err)`
现有 `console.error('[shell:xxx]', err)` → `logError('shell:xxx', err)`
现有 `console.error('[watcher:xxx]', err)` → `logError('watcher:xxx', err)`
`files:searchContent` 中的 `.catch((err) => console.error(...))` → `logError`

- [ ] **Step 4: 验证编译**

运行：`pnpm run build`
预期：编译通过

---

### Task 3: 主进程裸 IPC 处理器补全 + window.ts/menu.ts

**文件：**
- 修改：`src/main/index.ts`
- 修改：`src/main/window.ts`
- 修改：`src/main/menu.ts`
- 修改：`src/main/watcher.ts`
- 验证：`pnpm run build`

**接口：**
- 消费：`logError` from `./logger`

- [ ] **Step 1: 包裹 `store:get`（handle，重新抛出）**

```ts
ipcMain.handle('store:get', (_event, key: string) => {
  try {
    return appStore.get(key as keyof StoreSchema)
  } catch (err) {
    logError('store:get', err)
    throw err
  }
})
```

- [ ] **Step 2: 包裹 `store:set`（handle，仅记录）**

```ts
ipcMain.handle('store:set', (_event, key: string, value: unknown) => {
  try {
    appStore.set(key as keyof StoreSchema, value as any)
  } catch (err) {
    logError('store:set', err)
  }
})
```

- [ ] **Step 3: 包裹 `store:delete`（handle，仅记录）**

```ts
ipcMain.handle('store:delete', (_event, key: string) => {
  try {
    appStore.delete(key as keyof StoreSchema)
  } catch (err) {
    logError('store:delete', err)
  }
})
```

- [ ] **Step 4: 包裹 `dialog:openDirectory` / `dialog:openFile`（handle，重新抛出）**

```ts
ipcMain.handle('dialog:openDirectory', async () => {
  try {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  } catch (err) {
    logError('dialog:openDirectory', err)
    throw err
  }
})
```

`dialog:openFile` 同理。

- [ ] **Step 5: 包裹 `watcher:unwatchFile`（on，仅记录）**

```ts
ipcMain.on('watcher:unwatchFile', (_event, filePath: string) => {
  try {
    unwatchFile(filePath)
  } catch (err) {
    logError('watcher:unwatchFile', err)
  }
})
```

- [ ] **Step 6: 包裹 `window.ts` resize/move 事件处理器**

在 `window.ts` 中添加 `import { logError } from './logger'`，然后：

```ts
mainWindow.on('resize', () => {
  try {
    // 现有代码
  } catch (err) {
    logError('window:resize', err)
  }
})
// move 同理
```

- [ ] **Step 7: 包裹 `menu.ts` Open Folder 和 About 点击处理器**

在 `menu.ts` 中添加 `import { logError } from './logger'`，然后：

```ts
click: async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, { ... })
    // 现有代码
  } catch (err) {
    logError('menu:openFolder', err)
  }
}
```

About click 同理。

- [ ] **Step 8: 更新 `watcher.ts` 使用 `logError`**

将 `console.error(`[watcher]...`)` → `logError('watcher', err)`

- [ ] **Step 9: 验证编译**

运行：`pnpm run build`
预期：编译通过

---

### Task 4: React ErrorBoundary + 渲染进程全局处理器

**文件：**
- 创建：`src/renderer/components/ErrorBoundary.tsx`
- 修改：`src/renderer/main.tsx`
- 验证：`pnpm run build`

- [ ] **Step 1: 创建 ErrorBoundary 组件**

```tsx
import { Component, type ReactNode, type ErrorInfo } from 'react'
import { logError } from '../logger'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logError('ErrorBoundary', error)
    if (info.componentStack) {
      console.error(info.componentStack)
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300">
          <div className="text-center p-8">
            <h1 className="text-xl font-semibold mb-2">出错了</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              应用遇到意外错误。请查看控制台了解详情。
            </p>
            <pre className="text-xs text-left bg-gray-100 dark:bg-gray-800 p-4 rounded max-w-lg overflow-auto">
              {this.state.error.message}
            </pre>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
```

- [ ] **Step 2: 在 main.tsx 中添加全局事件监听和 ErrorBoundary**

```tsx
import { ErrorBoundary } from './components/ErrorBoundary'
import { logError } from './logger'

window.addEventListener('error', (event) => {
  logError('window:error', event.error ?? event.message)
})
window.addEventListener('unhandledrejection', (event) => {
  logError('unhandledRejection', event.reason)
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
```

- [ ] **Step 3: 验证编译**

运行：`pnpm run build`
预期：编译通过

---

### Task 5: 渲染进程 async 缺口补全

**文件：**
- 修改：`src/renderer/hooks/useWorkspaceInit.ts`
- 修改：`src/renderer/hooks/useScrollRestore.ts`
- 修改：`src/renderer/features/settings/SettingsPanel.tsx`
- 修改：`src/renderer/features/settings/useSettingsStore.ts`
- 修改：`src/renderer/features/welcome/WelcomePage.tsx`
- 验证：`pnpm run build`

- [ ] **Step 1: useWorkspaceInit.ts — init() 添加 .catch()，handleOpenFolder/handleOpenFile 添加 .catch()**

导入 `logError`，然后：

```ts
// init 调用
init().catch((err) => logError('useWorkspaceInit:init', err))

// handleOpenFolder 中的异步调用
ipc.store.set('lastWorkspace', path).catch((err) =>
  logError('useWorkspaceInit:setLastWorkspace', err)
)
trackRecent(path, true).catch((err) =>
  logError('useWorkspaceInit:trackRecent', err)
)

// handleOpenFile 中的异步调用
trackRecent(path, false).catch((err) =>
  logError('useWorkspaceInit:trackRecent', err)
)
```

- [ ] **Step 2: useScrollRestore.ts — store 调用添加 .catch()**

```ts
// scroll 保存
ipc.store.set('readingPositions', {
  [activeFile]: container.scrollTop,
}).catch((err) => logError('useScrollRestore:save', err))

// scroll 恢复
const positions = await ipc.store.get<Record<string, number>>('readingPositions')
  .catch((err) => {
    logError('useScrollRestore:load', err)
    return null as Record<string, number> | undefined
  })
```

- [ ] **Step 3: SettingsPanel.tsx — 所有异步操作添加 .catch()**

```ts
// loadFromDisk
loadFromDisk().catch((err) => logError('SettingsPanel:loadFromDisk', err))

// handleThemeChange
await ipc.store.set('theme', newTheme).catch((err) =>
  logError('SettingsPanel:setTheme', err)
)

// handleIgnoreChange
await saveToDisk().catch((err) => logError('SettingsPanel:saveToDisk', err))
```

- [ ] **Step 4: useSettingsStore.ts — loadFromDisk/saveToDisk 内部添加 try/catch**

```ts
loadFromDisk: async () => {
  try {
    const list = await ipc.store.get<string[]>('ignoreList')
    if (list) set({ ignoreList: list })
  } catch (err) {
    logError('useSettingsStore:loadFromDisk', err)
  }
},
saveToDisk: async () => {
  try {
    const { ignoreList } = useSettingsStore.getState()
    await ipc.store.set('ignoreList', ignoreList)
  } catch (err) {
    logError('useSettingsStore:saveToDisk', err)
  }
},
```

- [ ] **Step 5: WelcomePage.tsx — 所有 .then() 链和 ipc.store.set 添加 .catch()**

```ts
// loadRecent
ipc.store.get<any[]>('recentFiles')
  .then((files) => { if (files) setRecentFiles(files.slice(0, 10)) })
  .catch((err) => logError('WelcomePage:loadRecentFiles', err))
// recentDirs 同理

// handleOpenFolder 和 recent button 中的 set
ipc.store.set('lastWorkspace', dir).catch((err) =>
  logError('WelcomePage:setLastWorkspace', err)
)
```

- [ ] **Step 6: 验证编译**

运行：`pnpm run build`
预期：编译通过

---

### Task 6: E2E 对话框拦截

**文件：**
- 修改：`e2e/utils.ts`
- 验证：`pnpm run build`

- [ ] **Step 1: 在 launchApp() 中添加 dialog.showErrorBox 空操作**

在 `clearStoredConfig(page)` 之后：

```ts
await electronApp.evaluate(({ dialog }) => {
  dialog.showErrorBox = () => {}
})
```

- [ ] **Step 2: 验证编译**

运行：`pnpm run build`
预期：编译通过

---

### Task 7: 运行全部测试

**文件：**
- 无修改，仅验证

- [ ] **Step 1: 构建生产版本**

运行：`pnpm run build`
预期：编译通过

- [ ] **Step 2: 运行单元测试**

运行：`pnpm run test:unit` 或查找可用的测试命令

- [ ] **Step 3: 运行 E2E 测试**

运行：`pnpm run test:e2e`
预期：现有 10 个测试全部通过。如果测试挂起（原生错误对话框阻塞），杀进程后排查根因并修复，然后重试。
