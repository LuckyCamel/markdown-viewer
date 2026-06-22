## Goal
- 系统错误处理全面硬化：所有进程异常均有捕获路径，无未捕获异常

## Constraints & Preferences
- **工作语言：中文**。所有技术产出（规约、注释、提交信息、报告）默认使用中文。代码标识符、类型名、文件名保持英文。
- 不引入新依赖
- 所有异常在边界层捕获（IPC 处理器、事件监听器、副作用）；纯函数自然抛出
- `process.on('uncaughtException')`/`'unhandledRejection'` 仅作为最后防线日志记录
- `dialog.showErrorBox` 已拦截（E2E 测试不会被原生错误对话框阻塞）
- React ErrorBoundary 已添加（防止组件崩溃 → 白屏）
- 每条错误路径用统一 `logError` 记录：位置、错误类型、消息、stack
- Pre-commit hook 已修复（`lint-staged` 中 `tsc --noEmit` 改为指定子项目 `-p tsconfig.node.json` + `-p tsconfig.web.json`）

## Progress
### Done
- 架构深化（6 项 task）：死代码清理、Store 搬迁集中、IPC 适配器、Ignore List 修复、FileTree 订阅修复、App.tsx → 特征 Hooks 拆分、Store 单元测试
- 错误处理 T1：Logger 模块 — 主进程 `src/main/logger.ts`（`process.stderr`）+ 渲染进程 `src/renderer/logger.ts`（`console.error`）
- 错误处理 T2：主进程全局处理器 + `app.on('ready')` 包裹
- 错误处理 T3：IPC 处理器（store:dialog:watcher）+ window/menu 事件包裹
- 错误处理 T4：ErrorBoundary + 渲染进程全局处理器
- 错误处理 T5：渲染进程 async 缺口补全（6 个 hook/组件）
- 错误处理 T6：E2E 对话框拦截
- 架构加深第二轮（9 项候选 14 个 task 全部完成）
  - P0：4 个 Hook 测试 + 3 个 Store 独立测试
  - P1：ErrorBoundary 测试 + ContentSearch deps 修复
  - P2：主进程 handler 抽取 + 测试（`src/main/handlers.ts`）
  - P3：DEFAULT_IGNORE 去重 + IPC_CHANNELS 常量迁移 + E2E waitForTimeout 替换 + dirtyFiles 防御封装
- 架构加深第三轮（9 个 Task 全部完成）：2 Bug 修复 + 4 结构修复 + 2 防御缺口 + 1 测试补全
  - Bug：allFiles 陈旧（FileSearch 结果不完整）、滚动位置覆写（数据丢失）
  - 结构：StoreSchema/AppSettings 类型去重、Menu IPC 通道规范化、搜索取消机制、ThemeProvider OS 响应
  - 防御：protocol.ts 错误处理、菜单 8 个 click 处理器 try/catch 补齐
  - 测试：`src/main/index.spec.ts`（7 个测试用例，index.ts 抽取 `registerIpcHandlers()`）
- 全部 131 单元测试（主 43 + 渲染 88）+ 29 E2E 测试通过

## Key Decisions
- **两层模型**：纯函数自然抛出；边界层统一捕获
- **主进程 IPC 规则**：`handle` → catch → `logError` → rethrow；`on` → catch → `logError`（即发即弃）；`store:set/delete` 故意不 rethrow
- **渲染进程规则**：Store 操作 → catch → 清除加载状态 → `logError`；副作用 hook → `.catch()` → `logError`；ErrorBoundary → `componentDidCatch` → `logError` + 降级 UI
- **日志统一**：`logError('模块名:子操作', err)` 格式
- **`dialog.showErrorBox` 空操作**：在 `electronApp.evaluate` 中注入
- **非目标**：不引入 `Result<T,E>` 类型，不创建统一 Error 类，不修改纯函数签名
- 非目标：不引入 `createStore.ts` wrapper（`|| []` 修复已解决 React error #185）

## Relevant Files
- `src/main/logger.ts` / `src/renderer/logger.ts`：统一日志入口
- `src/main/index.ts`：全局 `process.on` + `app.on('ready')` try/catch + IPC 处理器包裹
- `src/main/window.ts` / `src/main/menu.ts` / `src/main/watcher.ts`：事件处理器 try/catch
- `src/renderer/components/ErrorBoundary.tsx`：React 类组件降级 UI
- `src/renderer/main.tsx`：`window:error`/`unhandledrejection` 监听 + ErrorBoundary 包裹
- `src/renderer/hooks/useWorkspaceInit.ts` / `useScrollRestore.ts`：`.catch()` 补齐
- `src/renderer/features/settings/SettingsPanel.tsx` / `useSettingsStore.ts`：try/catch 补齐
- `src/renderer/features/welcome/WelcomePage.tsx`：`.catch()` 补齐
- `e2e/utils.ts`：`dialog.showErrorBox` 空操作
- `e2e/file-tree.spec.ts` / `e2e/tabs.spec.ts`：10 E2E 测试
- `docs/superpowers/specs/2026-06-21-system-error-handling-design.md`：设计规约
- `docs/superpowers/plans/2026-06-21-system-error-handling.md`：实现计划
- `docs/superpowers/specs/2026-06-21-architecture-review-design.md`：架构检查报告
- `docs/superpowers/specs/2026-06-21-architecture-review-solution.md`：架构加深方案
- `docs/superpowers/plans/2026-06-21-architecture-deepening-round2.md`：架构加深执行计划
- `src/main/handlers.ts` / `src/main/handlers.spec.ts`：IPC handler 纯函数 + 测试
- `docs/superpowers/specs/2026-06-22-architecture-deepening-round3-design.md`：第三轮架构设计
- `docs/superpowers/plans/2026-06-22-architecture-deepening-round3.md`：第三轮实现计划
