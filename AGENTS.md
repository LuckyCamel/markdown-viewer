## Constraints
- **工作语言：中文**。所有技术产出（规约、注释、提交信息、报告）默认使用中文。代码标识符、类型名、文件名保持英文。
- `docs/` 目录不纳入 Git 追踪，已在 `.gitignore` 中排除
- 不引入新依赖
- **版本号规范**：未经用户明确许可不得变更版本号。左侧第一位（major）：软件定位发生变化时变更；中间位（minor）：主要功能新增或架构大幅调整时变更；右侧位（patch）：功能细节变更、debug、依赖版本变更时变更
- 不使用 `dialog.showErrorBox`（E2E 测试已拦截，防止原生错误对话框阻塞）
- 不引入 `Result<T,E>` 类型或统一 Error 类

### 错误处理规则
- 边界层统一捕获，使用 `logError('模块名:子操作', err)` 格式记录
- 详见 `docs/architecture.md`

### 开发命令
- 类型检查：`tsc --noEmit -p tsconfig.node.json --skipLibCheck && tsc --noEmit -p tsconfig.web.json --skipLibCheck`
- 测试：`vitest run`（渲染）/ `vitest run --config vitest.config.main.ts`（主进程）/ `playwright test --config e2e/playwright.config.ts`（E2E）

## Key Files
- `src/main/logger.ts` / `src/renderer/logger.ts` — 统一日志入口
- `src/main/index.ts` — 主进程入口 + IPC 注册
- `src/main/handlers.ts` — IPC handler 纯函数
- `src/main/window.ts` / `src/main/menu.ts` — 窗口/菜单管理
- `src/renderer/main.tsx` — 渲染进程入口
- `src/renderer/components/ErrorBoundary.tsx` — React 错误边界
- `electron-builder.yml` — 打包配置
- `e2e/utils.ts` — E2E 工具函数（含 dialog 拦截）
