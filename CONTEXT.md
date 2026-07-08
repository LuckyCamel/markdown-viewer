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

### 阶段 3 安全与架构加固 (2026-07-09)

- Rust 后端模块化：`state/`、`commands/`、`search/`、`scope/`
- fs:scope 动态授权 + command 层路径校验
- 搜索增量 emit（500 条上限）+ 前端 append 合并
- `rehype-sanitize` 白名单 + CSP 收紧
- 持久化从 localStorage 迁移至 Rust `settings.json`

开发路线图见 [`docs/roadmap.md`](docs/roadmap.md)。**阶段 3 已完成**（v1.2.1）。

阶段 3 文档：[`docs/phase3/requirements.md`](docs/phase3/requirements.md) · [`design.md`](docs/phase3/design.md) · [`tasks.md`](docs/phase3/tasks.md)

| # | 项 | 状态 |
|---|-----|------|
| 1 | fs:scope 收窄 | 已完成 |
| 2 | rehype-sanitize XSS | 已完成 |
| 3 | Rust 模块拆分 | 已完成 |
| 4 | 搜索增量协议 | 已完成 |
| 5 | Rust JSON store | 已完成 |
