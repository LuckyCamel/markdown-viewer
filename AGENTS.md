## Constraints
- **工作语言：中文**。所有技术产出（规约、注释、提交信息、报告）默认使用中文。代码标识符、类型名、文件名保持英文。
- `docs/` 目录不纳入 Git 追踪，已在 `.gitignore` 中排除
- 不引入新依赖
- **版本号规范**：未经用户明确许可不得变更版本号。左侧第一位（major）：软件定位发生变化时变更；中间位（minor）：主要功能新增或架构大幅调整时变更；右侧位（patch）：功能细节变更、debug、依赖版本变更时变更
- 不引入 `Result<T,E>` 类型或统一 Error 类

### 错误处理规则
- 边界层统一捕获，使用 `logError('模块名:子操作', err)` 格式记录
- 详见 `docs/architecture.md`

### 开发命令
- 类型检查：`tsc --noEmit --skipLibCheck`
- 测试：`vitest run`（渲染进程）
- 构建：`pnpm build`（前端）/ `pnpm tauri build`（打包）
- Rust 检查：`cargo check`（在 `src-tauri/` 目录下）

## Key Files
- `src/renderer/logger.ts` — 统一日志入口
- `src-tauri/src/main.rs` — Tauri 后端入口：文件操作、搜索、文件监听
- `src-tauri/tauri.conf.json` — Tauri 配置（窗口、打包等）
- `src-tauri/Cargo.toml` — Rust 依赖管理
- `src/renderer/main.tsx` — 渲染进程入口
- `src/renderer/components/ErrorBoundary.tsx` — React 错误边界
- `src/renderer/lib/ipc.ts` — 前端 IPC 适配器（封装 Tauri API）
- `src/renderer/hooks/useKeyboardShortcuts.ts` — 键盘快捷键（替代原生菜单）
