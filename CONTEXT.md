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

开发路线图见 [`docs/roadmap.md`](docs/roadmap.md)。阶段 0 基本完成，**阶段 1 已完成**，下一步进入 **阶段 2**。

| # | 候选 | 优先级 | 问题 | 状态 |
|---|------|--------|------|------|
| 1 | 大纲可视区域高亮 | 中 | 滚动正文时 Outline 高亮当前节（阶段 2.1） | 待做 |
| 2 | 欢迎页 Recent Files | 中 | 数据已有，UI 缺失（阶段 2.2） | 待做 |
