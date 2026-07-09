# ADR-0006: Tauri 迁移决策

## 元数据
- **状态**：已采纳（迁移基本完成）
- **日期**：2026-07-08
- **更新**：2026-07-09（阶段 3 收尾）
- **决策者**：AI agent + 用户

## 决策

全面迁移至 Tauri 2：Rust 后端 + 系统 WebView，前端 React 保持不变。

## 迁移状态（截至 v1.2.2）

### 已完成
- 文件系统：list_directory、plugin-fs 读文件、动态 fs:scope
- 全文搜索：增量 emit、cancel_search、500 条上限
- 文件监控：notify + file-change
- 对话框 / 外部链接：官方插件
- 持久化：Rust `settings.json`（自 localStorage 迁移）
- CLI：`-v`/`-h`、启动路径
- 后端模块化：commands / state / search / scope
- 图片：`asset://localhost/`（ADR-0004）
- HTML 安全：rehype-sanitize（ADR-0007）
- 原生菜单 + 键盘快捷键并存
- 打包：Windows NSIS、macOS DMG、Linux deb + AppImage
- E2E：Playwright + mock IPC；CI `tauri build --no-bundle`

### 仍开放 / 非目标
- 窗口位置/大小持久化
- Tauri WebDriver 集成测试
- 编辑模式

## 后果

- **正面**：安装包 ~4MB 级；安全模型严谨；Rust 后端可维护性提升
- **负面**：Rust 调试链路与 Electron 不同；E2E 不覆盖真实 Tauri IPC
