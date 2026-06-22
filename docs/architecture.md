# 架构决策

## 错误处理

### 两层模型
- **纯函数**：自然抛出异常，不捕获
- **边界层**（IPC 处理器、事件监听器、副作用 hook）：统一 try/catch 捕获

### 全局异常
- `process.on('uncaughtException')` / `'unhandledRejection'` 仅作最后防线日志记录
- 不依赖全局处理器做业务恢复

### 日志格式
- 统一使用 `logError('模块名:子操作', err)` 格式

## 主进程 IPC 规则

| 类型 | 处理方式 |
|------|----------|
| `ipcMain.handle` | catch → `logError` → rethrow |
| `ipcMain.on` | catch → `logError`（即发即弃，不 rethrow） |
| `store:set` / `store:delete` | catch → `logError`（故意不 rethrow） |

## 渲染进程规则

| 场景 | 处理方式 |
|------|----------|
| Store 操作 | catch → 清除加载状态 → `logError` |
| 副作用 hook | `.catch()` → `logError` |
| 组件崩溃 | ErrorBoundary → `componentDidCatch` → `logError` + 降级 UI |

## 设计边界

- 不使用 `dialog.showErrorBox`（由 E2E 测试在 `electronApp.evaluate` 中注入空操作拦截）
- 不引入 `Result<T,E>` 类型或统一 Error 类
- 不修改现有纯函数签名以引入错误处理
