# Markdown Viewer — 开发上下文

架构设计见 [`docs/architecture.md`](docs/architecture.md)，架构决策见 [`docs/adr/`](docs/adr/)。

## 架构演进

### Electron 时代 (2026-06-20 ~ 2026-07-07)

- App.tsx 拆分：提取 4 个 hook，281→159 行
- 集中式 IPC 适配器：`lib/ipc.ts` 封装所有 `window.api.*` 调用
- 错误处理全面硬化：主进程 + 渲染进程 + ErrorBoundary
- CLI 参数解析、文件树类型过滤、可拖拽面板分隔条
- CI/CD 流水线搭建

### Tauri 迁移 (2026-07-08)

- 框架从 Electron 迁移到 Tauri v2，安装包体积从 119MB 降至 ~4MB
- Rust 后端实现文件系统操作、内容搜索、文件监听（notify crate）
- 前端 IPC 层适配 Tauri API（invoke / event / plugin-fs / plugin-dialog / plugin-shell）
- 菜单功能改为键盘快捷键（useKeyboardShortcuts）
- mermaid 图表渲染支持完整保留
- GitHub Actions workflow 适配 Tauri 构建流程

### 活跃（截至 2026-07-08）

| # | 候选 | 优先级 | 问题 | 状态 |
|---|------|--------|------|------|
| 1 | E2E 测试重写 | 中 | 旧 E2E 基于 mock IPC，需用 Tauri WebDriver 重写 | 待评估 |
