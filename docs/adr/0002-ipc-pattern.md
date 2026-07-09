# ADR-0002: IPC 通信模式

## 元数据
- **状态**：已采纳（已迁移至 Tauri）
- **日期**：2026-06-21（Electron 版）
- **更新**：2026-07-08（迁移至 Tauri）
- **决策者**：AI agent + 用户

## 上下文

Tauri 提供多种前后端通信方式：`invoke/command`（请求-响应）、`emit/listen`（事件推送）、以及官方插件（fs / dialog / shell 等）。项目需要统一规则，明确每种场景用哪种模式及如何处理异常。

## 选项

- **选项 A：全部用 invoke/command** — 所有通信都用请求-响应模式
  - 优：统一，调试方便
  - 劣：文件监控、搜索进度等单向推送场景不自然；调用方被迫等待不必要的响应

- **选项 B：混合模式按语义选择（采纳）** — 需要响应用的 `invoke/command`，纯通知用 `emit/listen`；通用能力用官方插件
  - 优：语义匹配，不需要响应的地方不阻塞；官方插件经过安全审计
  - 劣：三种模式错误处理规则不同，需文档明确

- **选项 C：全部用 emit/listen + 回调** — 所有通信用事件 + 独立回调
  - 优：最大灵活性
  - 劣：回调地狱，状态管理复杂

## 决策

选择选项 B：混合模式。

### invoke/command（请求-响应）
用于文件操作、对话框、shell 打开等需要返回值的场景。
- 错误处理：Rust command 返回 `Result<T, String>`，`Err` 自动透传到前端 Promise.reject
- 前端通过 `invoke('command_name', args)` 调用
- 自定义 command 列表：`list_directory`、`search_content`、`cancel_search`、`watch_file`、`unwatch_file`、`update_settings`、`get_launch_paths`、`grant_fs_scope`、`get_setting`、`set_setting`、`migrate_settings`

### emit/listen（事件推送）
用于文件监控变更通知、搜索结果流式推送等单向通知场景。
- 错误处理：前端 `listen` 回调内 catch → `logError`（即发即弃，发送方无法获知处理失败）
- 后端通过 `window.emit('event_name', payload)` 推送
- 事件列表：`search-result`、`file-change`、`menu-action`

### 官方插件
通用能力优先使用 Tauri 官方插件，减少自定义代码和安全风险。
- `@tauri-apps/plugin-fs` — 文件系统读写
- `@tauri-apps/plugin-dialog` — 打开文件/目录对话框
- `@tauri-apps/plugin-shell` — 打开外部链接

> 注：部分文件操作（如 `readFile`）使用 plugin-fs 而非自定义 command，以利用官方插件的安全模型和权限控制。

## 后果

- **正面**：IPC 模式选择有据可依，新增通道时只需判断语义即可确定模式；官方插件降低维护成本
- **负面**：需记住三种模式的不同错误行为；`emit/listen` 的发送方无法获知前端处理失败
- **现状**：所有 IPC 调用集中封装在 `src/renderer/lib/ipc.ts`，前端不直接调用 `invoke` / `emit`

## 迁移说明

原 Electron 版使用 `ipcRenderer.invoke / ipcMain.handle`（请求-响应）和 `send/on`（单向推送）。迁移至 Tauri 后：
- `invoke/handle` → `invoke/command`（概念等价，API 不同）
- `send/on` → `emit/listen`（概念等价，事件名调整）
- preload + contextBridge → Tauri WebView IPC Bridge（框架内置，无需手写）
