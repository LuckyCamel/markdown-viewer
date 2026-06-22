# 系统错误处理 — 设计规约

## 1. 统一日志

| 文件 | 导出 | 行为 |
|---|---|---|
| `src/main/logger.ts` | `logError(context, err)` | `process.stderr.write` 格式化输出 |
| `src/renderer/logger.ts` | `logError(context, err)` | `console.error` 格式化输出（同形状） |

格式：`[${context}] ${err.name}: ${err.message}` + stack（如果有）。

## 2. 主进程错误覆盖

### 2a. 全局处理器 — `src/main/index.ts`

```ts
process.on('uncaughtException', (err) => {
  logError('uncaughtException', err)
})
process.on('unhandledRejection', (err) => {
  logError('unhandledRejection', err)
})
```

### 2b. 包裹 `app.on('ready')` 主体

```ts
app.on('ready', () => {
  try {
    registerFileProtocol()
    // ... 所有处理程序
    createWindow()
    createAppMenu(win)
  } catch (err) {
    logError('app:ready', err)
  }
})
```

### 2c. 包裹所有裸 IPC 处理器

**`ipcMain.handle` 需要包裹的：**
- `store:get` — 包裹并重新抛出
- `store:set` — 包裹并记录（不重新抛出，即发即弃）
- `store:delete` — 包裹并记录
- `dialog:openDirectory` — 包裹并重新抛出
- `dialog:openFile` — 包裹并重新抛出

**`ipcMain.on` 需要包裹的：**
- `watcher:unwatchFile` — 包裹并记录

### 2d. `window.ts` — 包裹 resize/move 事件处理器

### 2e. `src/main/menu.ts` — 包裹异步点击处理器

### 2f. `src/main/protocol.ts` — 已有包裹 ✓

### 2g. `src/main/watcher.ts` — 错误处理器已存在 ✓

## 3. 渲染进程错误覆盖

### 3a. React Error Boundary — `src/renderer/components/ErrorBoundary.tsx`

### 3b. 渲染进程全局处理器 — `src/renderer/main.tsx`

```ts
window.addEventListener('error', ...)
window.addEventListener('unhandledrejection', ...)
```

### 3c. `useWorkspaceInit.ts` — `init()` 添加 `.catch()`，handleOpenFolder/handleOpenFile 添加 `.catch()`

### 3d. `useScrollRestore.ts` — store 调用添加 `.catch()`

### 3e. `SettingsPanel.tsx` — 所有异步操作添加 `.catch()`

### 3f. `useSettingsStore.ts` — `loadFromDisk` / `saveToDisk` 内部添加 try/catch

### 3g. `WelcomePage.tsx` — 所有 `.then()` 链添加 `.catch()`

### 3h. 已处理的文件 ✓

- `useFileStore.ts` — `loadChildren` 已有 try/catch
- `useEditorStore.ts` — `loadContent` 已有 try/catch
- `App.tsx` 持久化副作用 — 已有 `.catch()`
- `MarkdownViewer.tsx` — `shell.openExternal` 已有 `.catch()`
- `MermaidBlock.tsx` — 渲染副作用已有 try/catch
- `ContentSearch.tsx` — 即发即弃 `send()`，无 promise 需处理

## 4. E2E 对话框拦截

在 `e2e/utils.ts` 的 `launchApp()` 中添加 `dialog.showErrorBox` 空操作。

## 5. 设计原则

**两层模型：** 纯函数（`files.ts`、`search.ts`）自然抛出异常；边界层（IPC 处理器、协议处理器、事件监听器）统一捕获。

**主进程：**
- `ipcMain.handle`：捕获 → 记录 → 重新抛出（Electron 将拒绝转发到渲染进程）
- `ipcMain.on`：捕获 → 记录（即发即弃，无返回路径）
- 事件监听器：捕获 → 记录

**渲染进程：**
- Store 操作：捕获 → 清除加载状态 → 记录
- 副作用 hook：`.catch()` → 记录
- Error boundary：捕获组件渲染错误 → 显示降级 UI

**非目标：** 不引入 `Result<T,E>` 类型，不创建统一 Error 类，不修改纯函数签名，不修改 `shared/types.ts`。
