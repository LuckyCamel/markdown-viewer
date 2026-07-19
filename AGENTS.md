## Constraints
- **工作语言：中文**。所有技术产出（规约、注释、提交信息、报告）默认使用中文。代码标识符、类型名、文件名保持英文。
- `docs/` 目录纳入 Git 追踪；文档导航见根目录 [README.md#文档](README.md#文档)
- **发布洁净**：参与 GitHub 发布的文档（README、CHANGELOG、AGENTS、docs/）每次 commit 不得含未完成规划、任务墙（`- [ ]`）或待办信息
- 不引入新依赖（**例外**：已批准 `rehype-sanitize`、CodeMirror 6 相关包）
- **版本号规范**：未经用户明确许可不得变更版本号。左侧第一位（major）：软件定位发生变化时变更；中间位（minor）：主要功能新增或架构大幅调整时变更；右侧位（patch）：功能细节变更、debug、依赖版本变更时变更
- 不引入 `Result<T,E>` 类型或统一 Error 类

### 错误处理规则
- 边界层统一捕获，使用 `logError('模块名:子操作', err)` 格式记录
- 详见 [docs/architecture.md](docs/architecture.md)

### 开发命令
- 类型检查：`tsc --noEmit --skipLibCheck`
- 测试：`vitest run`（渲染进程）
- 构建：`pnpm build`（前端）/ `pnpm tauri build`（打包）
- Rust 检查：`cargo check`（在 `src-tauri/` 目录下）

## Key Files
- `src/renderer/logger.ts` — 统一日志入口
- `src-tauri/src/main.rs` — 进程入口（CLI 解析、`windows_subsystem`）
- `src-tauri/src/lib.rs` — Tauri 应用入口：插件、State、command 注册
- `src-tauri/src/menu.rs` — 原生菜单与 `menu-action` 事件
- `src-tauri/src/commands/` — invoke command 实现
- `src-tauri/tauri.conf.json` — Tauri 配置（窗口、CSP、打包）
- `src-tauri/Cargo.toml` — Rust 依赖管理
- `src/renderer/main.tsx` — 渲染进程入口
- `src/renderer/components/ErrorBoundary.tsx` — React 错误边界
- `src/renderer/components/ThemeProvider.tsx` — 主题与阅读设置注入
- `src/renderer/lib/ipc.ts` — 前端 IPC 适配器（封装 Tauri API）
- `src/renderer/lib/themes.ts` — 主题定义与解析（6 套内置主题）
- `src/renderer/lib/fonts.ts` — 系统字体选择列表
- `src/renderer/styles/themes.css` — 主题 CSS 变量
- `src/renderer/stores/useThemeStore.ts` — 主题状态（theme、themeId、codeTheme）
- `src/renderer/stores/useLayoutStore.ts` — 布局状态（侧边栏/大纲可见性与宽度、搜索面板）
- `src/renderer/stores/useNavigationStore.ts` — 导航意图状态（跨文件跳转、搜索高亮）
- `src/renderer/features/settings/useSettingsStore.ts` — 阅读设置状态
- `src/renderer/hooks/useKeyboardShortcuts.ts` — 键盘快捷键
- `src/renderer/hooks/useMenuEvents.ts` — 原生菜单事件分发
- `src/renderer/components/CommandPalette.tsx` — 命令面板 UI（Ctrl+Shift+P 唤起）
- `src/renderer/features/commands/commands.ts` — 命令注册中心（单例）
- `src/renderer/features/commands/fuzzyMatch.ts` — 模糊匹配函数
- `src/renderer/features/commands/useRegisterCommands.ts` — 启动时注册命令
- `src/renderer/stores/useCommandStore.ts` — 命令面板显示状态
- `src/renderer/lib/exporter.ts` — HTML / PDF 导出工具
- `src/renderer/lib/dailyNote.ts` — 每日笔记创建/打开
- `src/renderer/features/markdown-viewer/useEditorDocument.ts` — 统一编辑会话（状态机：saved/dirty/saving/error/conflict、seed/reset、保存、冲突处理）
- `src/renderer/lib/codemirror/pathCompletion.ts` — 相对路径补全（纯函数 + CodeMirror 扩展）
- `src/renderer/lib/codemirror/table.ts` — 表格编辑核心（解析/插入/删除/导航 + keymap）
- `src/renderer/components/TableInsertDialog.tsx` — 表格插入弹窗（行/列配置）
- `src/renderer/stores/useTableDialogStore.ts` — 表格弹窗状态（工具栏与命令面板共享）
- `src-tauri/src/commands/export.rs` — `save_text_file` Rust command
