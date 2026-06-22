# 架构加深检查报告

日期：2026-06-21

## 已有机会回顾

CONTEXT.md 记录的 6 项已知加深机会状态：

| # | 机会 | 状态 | 说明 |
|---|------|------|------|
| 1 | App.tsx God Component → Feature Hooks | 已完成 | 281→159 行，4 个 hook（useWorkspaceInit / useMenuIpc / useScrollRestore / useFileWatcher） |
| 2 | Ignore List Blind Spot | 已完成 | IPC handler 在调用 `listDirectory()`/`searchDirectory()` 前注入 `appStore.get('ignoreList')` |
| 3 | Dead Code + Inconsistent Layout | 部分完成 | `createStore.ts` 已删除；5/6 store 仍在 `features/` 而非 `stores/` 集中 |
| 4 | No Centralized IPC Adapter | 已完成 | `lib/ipc.ts` 存在，零个 `window.api.*` 直接调用 |
| 5 | FileTree Over-Subscription | 部分完成 | `entries` 已通过 prop 传递修复；`expanded` 仍是 O(n) 单独订阅 |
| 6 | Missing Store Tests | 已完成 | `useEditorStore` / `useSettingsStore` / `useUIStore` 各有 3-5 个测试用例 |

---

## 测试覆盖现状

| 层级 | 文件数 | 测试用例 | 备注 |
|------|--------|----------|------|
| 单元测试 (src/) | 20 | 60 `it()` 块 | |
| E2E 测试 (e2e/) | 9 | 29 `test()` 块 | |
| **总计** | **29** | **89** | |

### 覆盖空白

| 模块 | 位置 | 行数 | 测试 | 风险级别 |
|------|------|------|------|----------|
| useWorkspaceInit | `hooks/useWorkspaceInit.ts` | 84 | 无 | 严重 |
| useMenuIpc | `hooks/useMenuIpc.ts` | 52 | 无 | 严重 |
| useScrollRestore | `hooks/useScrollRestore.ts` | 40 | 无 | 严重 |
| useFileWatcher | `hooks/useFileWatcher.ts` | 27 | 无 | 严重 |
| useTabStore | `features/tabs/useTabStore.ts` | 53 | 无独立测试 | 中等 |
| useFileStore | `features/file-tree/useFileStore.ts` | 50 | 无独立测试 | 中等 |
| useSearchStore | `features/search/useSearchStore.ts` | 22 | 无独立测试 | 中等 |
| ErrorBoundary | `components/ErrorBoundary.tsx` | 43 | 无 | 高 |
| MermaidBlock | `features/markdown-viewer/MermaidBlock.tsx` | 38 | 无 | 中等 |
| Layout | `components/Layout.tsx` | 29 | 无 | 低 |
| ContentSearch | `features/search/ContentSearch.tsx` | 68 | 无 | 中等 |
| main/index.ts | `main/index.ts` | 108 | 无 | 高 |

---

## 新发现摩擦点 — 加深候选

### 候选 1：4 个 Hook 零测试覆盖（P0）

- **文件**：`hooks/useWorkspaceInit.ts`（84 行）、`useMenuIpc.ts`（52 行）、`useScrollRestore.ts`（40 行）、`useFileWatcher.ts`（27 行）
- **问题**：从 App.tsx 提取后成为独立模块，含 IPC 调用、store 操作、DOM 查询、错误恢复逻辑，但无任何测试。App.tsx 集成测试覆盖不到边界情况。`useWorkspaceInit` 最复杂——5 个 IPC 调用、3 个 store 操作、异步初始化、trackRecent 逻辑。
- **方案**：用 `renderHook`（`@testing-library/react`）为每个 hook 写单元测试；mock `ipc` 模块（同现有测试模式）。
- **收益**：高 locality——hook bug 在 hook 测试中暴露；leverag——每个 hook 的返回值与副作用契约成为测试面。

### 候选 2：useTabStore / useFileStore / useSearchStore 无独立测试（P0）

- **文件**：`features/tabs/useTabStore.ts`（53 行）、`features/file-tree/useFileStore.ts`（50 行）、`features/search/useSearchStore.ts`（22 行）
- **问题**：纯 zustand store（最容易测试的模块），仅通过组件测试间接覆盖。`useTabStore.dirtyFiles`（Set）逻辑完全未验证。
- **方案**：直接 `create()` 实例化 store，调用 action，断言 `getState()`。无需 mock。
- **收益**：zustand store 接口即测试面。当前 bug 只能通过 UI 交互暴露。

### 候选 3：ErrorBoundary 组件无测试（P1）

- **文件**：`components/ErrorBoundary.tsx`（43 行）
- **问题**：错误捕获基础设施本身未验证。如果 `componentDidCatch` 或降级 UI 有 bug，整个渲染进程白屏。
- **方案**：渲染触发 throw 的子组件，断言降级 UI 出现且 `logError` 被调用。
- **收益**：最后防线不可无验证（per AGENTS.md 约束）。

### 候选 4：ContentSearch useEffect 依赖数组不完整（P1）

- **文件**：`features/search/ContentSearch.tsx` 第 33 行
- **问题**：`ipc.search.onResult` 和 `ipc.search.searchContent` 在 effect 中使用但未列入 deps。React StrictMode 下可能产生过时闭包。
- **方案**：补全依赖数组或重构为 ref 模式。
- **收益**：一行修复消除 concurrency bug。

### 候选 5：主进程 index.ts 零单元测试（P2）

- **文件**：`main/index.ts`（108 行）
- **问题**：8 个 IPC handler、app 生命周期、全局错误处理器——全部通过 E2E 验证，无单元测试。任何 handler 重构可能无声损坏。
- **方案**：抽取 handler 为纯函数（接收 `appStore` 参数），使 handler 可脱离 Electron 单独测试；或 mock `ipcMain.handle` + `appStore`。
- **收益**：locality——IPC 逻辑错误在毫秒级单元测试中发现，而非秒级 E2E。

### 候选 6：重复的 DEFAULT_IGNORE 定义（P3）

- **文件**：`main/files.ts:7` + `main/store.ts:17`
- **问题**：同一数组两处独立定义。一处改动未同步 → 用户忽略列表与默认忽略列表漂移。
- **方案**：提取到共享常量或让 `store.ts` 从 `files.ts` 导入。
- **收益**：locality——默认值变更只需改一处。

### 候选 7：IPC_CHANNELS 常量无人引用（P3）

- **文件**：`shared/types.ts:1-17`
- **问题**：完整定义了 IPC 通道名常量，但主进程、preload、渲染进程全用裸字符串。死接口或未执行约定。
- **方案**：① 迁移所有 IPC 字符串引用为 `IPC_CHANNELS.*`；② 或删除。
- **收益**：选择①——拼写错误编译期暴露；选择②——减少噪音。

### 候选 8：E2E 测试中脆弱的 waitForTimeout（P3）

- **文件**：`e2e/settings.spec.ts`、`e2e/shortcuts.spec.ts`、`e2e/theme.spec.ts`
- **问题**：固定 `waitForTimeout(500)` 替代基于断言的 `waitFor`。测试更慢、CI 负载高时可能 flaky。
- **方案**：替换为 `waitFor(() => expect(...))` 或 `locator.waitFor()`。
- **收益**：测试可靠性——CI 稳定性提升。

### 候选 9：TabStore dirtyFiles 可变 Set（P3）

- **文件**：`features/tabs/useTabStore.ts:19`
- **问题**：`dirtyFiles: new Set()`。Zustand 期望不可变状态。虽然 `markDirty`/`clearDirty` 创建新 Set（正确），但 `getState().dirtyFiles` 返回对当前 Set 的可变引用，外部代码可能原地修改。
- **方案**：文档约束或封装为只读接口。
- **收益**：防御性——防止未来调试困难的不变性 bug。

---

## 优先级排序

| 优先级 | 候选 | 理由 |
|--------|------|------|
| P0 | 1. Hook 测试 | 最复杂逻辑，零覆盖 |
| P0 | 2. Store 测试 | 纯函数、最易测、覆盖空白最大 |
| P1 | 3. ErrorBoundary 测试 | 最后防线不可无验证 |
| P1 | 4. ContentSearch deps | 一行修复，消除 concurrency bug |
| P2 | 5. main/index.ts 测试 | 需架构调整（抽取纯函数），投入产出比中等 |
| P3 | 6. DEFAULT_IGNORE 去重 | 微小投入 |
| P3 | 7. IPC_CHANNELS 清理 | 死代码决策 |
| P3 | 8. waitForTimeout 替换 | 可靠性提升 |
| P3 | 9. dirtyFiles 防御 | 微小投入 |

---

## 模块大小概览

| 文件 | 行数 | 分类 |
|------|------|------|
| `src/main/menu.ts` | 123 | 主进程 — 中等 |
| `src/main/index.ts` | 108 | 主进程入口 |
| `src/preload/index.ts` | 101 | Preload |
| `src/renderer/App.tsx` | 159 | 已改善（曾 281） |
| `src/renderer/features/markdown-viewer/MarkdownViewer.tsx` | 88 | 特性 |
| `src/renderer/features/welcome/WelcomePage.tsx` | 88 | 特性 |
| `src/renderer/hooks/useWorkspaceInit.ts` | 84 | Hook |
| `src/renderer/features/settings/SettingsPanel.tsx` | 74 | 特性 |
| `src/main/search.ts` | 73 | 主进程 |
| `src/renderer/features/search/ContentSearch.tsx` | 68 | 特性 |
| `src/renderer/features/file-tree/FileTree.tsx` | 62 | 特性 |
| `src/main/window.ts` | 61 | 主进程 |
| `src/renderer/lib/ipc.ts` | 54 | IPC 适配器 |
| `src/renderer/features/tabs/useTabStore.ts` | 53 | Store |
| `src/renderer/features/tabs/TabBar.tsx` | 52 | 特性 |
| `src/renderer/hooks/useMenuIpc.ts` | 52 | Hook |
| `src/renderer/features/file-tree/useFileStore.ts` | 50 | Store |
| `src/main/files.ts` | 49 | 主进程 |
| `src/main/watcher.ts` | 45 | 主进程 |
| `src/main/store.ts` | 42 | 主进程 |
| `src/renderer/features/markdown-viewer/useEditorStore.ts` | 41 | Store |
| `src/renderer/hooks/useScrollRestore.ts` | 40 | Hook |
| `src/renderer/features/markdown-viewer/MermaidBlock.tsx` | 38 | 特性 |
| `src/renderer/stores/useUIStore.ts` | 32 | Store |
| `src/renderer/features/settings/useSettingsStore.ts` | 31 | Store |
| `src/renderer/components/Layout.tsx` | 29 | 组件 |
| `src/renderer/hooks/useFileWatcher.ts` | 27 | Hook |
| `src/main/protocol.ts` | 24 | 主进程 |
| `src/renderer/features/search/useSearchStore.ts` | 22 | Store |
| `src/renderer/components/ThemeProvider.tsx` | 21 | 组件 |
| `src/shared/utils.ts` | 16 | 共享 |
| `src/renderer/main.tsx` | 23 | 入口 |
| `src/renderer/components/ErrorBoundary.tsx` | 43 | 组件 |
| `src/shared/types.ts` | 109 | 共享类型 |
