# Markdown Viewer — Architecture Context

## Project Identity

跨平台 Electron 桌面应用，用于浏览和渲染 Markdown 文件（GFM、KaTeX、Mermaid）。基于工作区的文件管理、多标签编辑、主题切换、全文搜索。

## Ubiquitous Language

| Term | Definition |
|------|-----------|
| **Workspace** | 用户在文件系统中打开的目录，作为文件浏览的根。存储在 `lastWorkspace`。 |
| **Entry** | 文件树中的一个节点（文件或目录），由 `FileEntry` 类型描述。每个目录有自己的 `entries[dirPath]` 列表。 |
| **Tab** | 打开的文件的导航单元。`openFiles: string[]` 列表 + `activeFile` 表示当前可见的标签。 |
| **Content** | 从磁盘读取的文件原始字符串。编辑器缓存 `contents[filePath]`。 |
| **Seam** | IPC 通道是主进程和渲染进程之间的 seam。`ElectronAPI` 类型是契约。 |
| **Ignore List** | 用户配置的目录/文件忽略列表，存储在 electron-store 的 `ignoreList` 键下。 |
| **Adapter** | 主进程模块（files, watcher, search, store）是 Electron API 的 adapter。 |

## Architecture Overview

```
                     ┌──────────────────────────────────┐
                     │       Renderer (React 19)         │
                     │  features/ + stores/ + hooks/     │
                     │           lib/ipc.ts              │
                     │           │                       │
                     │    contextBridge (preload)         │
                     │           │                       │
                     ├──────────────────────────────────┤
                     │    Main Process (Node.js)         │
                     │  files / watcher / search / store  │
                     │           │                       │
                     │    electron-store (disk, JSON)    │
                     └──────────────────────────────────┘
```

### IPC 三层设计（未完全利用）

当前实际只用两层：
- **invoke/handle**（请求/响应）：files, store, dialog, shell
- **send/on**（推送）：watcher, search streaming, menu

缺少第三层——**Channel（二进制流）**，当前不需要。

## Module Map

### Main Process Modules

| Module | File | Depth | Tests | Notes |
|--------|------|-------|-------|-------|
| `files` | `src/main/files.ts` | Shallow | 6 tests | 纯函数，薄封装 fs。忽略列表通过 IPC handler 注入。 |
| `watcher` | `src/main/watcher.ts` | Medium | 4 tests | 管理 `Map<string, FSWatcher>`。耦合单个 window 引用。 |
| `search` | `src/main/search.ts` | Medium | 4 tests | 忽略列表通过 IPC handler 注入。 |
| `store` | `src/main/store.ts` | Shallow | 5 tests | 简化版 `electron-store` 封装。`DEFAULT_IGNORE` 与 `files.ts` 重复定义。 |
| `menu` | `src/main/menu.ts` | Shallow | 2 tests | 菜单定义 + 键盘加速器，通过 IPC 推送消息。 |
| `window` | `src/main/window.ts` | Shallow | 3 tests | 单窗口 singleton，边界持久化。 |
| `protocol` | `src/main/protocol.ts` | Shallow | 2 tests | `local-file://` 协议注册。 |
| `index` | `src/main/index.ts` | Medium | 0 tests | 入口点：8 个 IPC handler + app 生命周期 + 全局错误处理器。零单元测试。 |

### Renderer Modules

| Module | Location | Depth | Tests | Notes |
|--------|----------|-------|-------|-------|
| App orchestrator | `App.tsx` | Medium | 4 integration | 159 行（曾 281），5 个 useEffect。组装 hook + UI 组件。 |
| FileTree | `features/file-tree/` | Medium | 1 smoke | `entries` 通过 prop 传递已修复；`expanded` 仍是 O(n) 独立订阅。 |
| Tabs | `features/tabs/` | Medium | 2 | `useTabStore` 被 4 个模块依赖。`dirtyFiles`（Set）无独立测试。 |
| MarkdownViewer | `features/markdown-viewer/` | Deep | 2 | 丰富的插件链 + 自定义组件。MermaidBlock 未测试。 |
| Outline | `features/outline/` | Medium | 2 | 正则提取标题。 |
| Search | `features/search/` | Medium | 2 | ContentSearch 无测试；useEffect deps 不完整。 |
| Settings | `features/settings/` | Shallow | 1 | 主题切换 + 忽略列表编辑器。 |
| `useEditorStore` | `features/markdown-viewer/useEditorStore.ts` | Medium | 4 tests | 惰性加载内容 + IPC readFile 封装。 |
| `useSettingsStore` | `features/settings/useSettingsStore.ts` | Shallow | 3 tests | ignoreList 读写 electron-store。 |
| `useUIStore` | `stores/useUIStore.ts` | Shallow | 5 tests | 主题 / 搜索面板 / 文件树可见性。 |
| `useTabStore` | `features/tabs/useTabStore.ts` | Medium | 0 standalone | `openFiles`/`activeFile`/`dirtyFiles` 管理。无独立测试。 |
| `useFileStore` | `features/file-tree/useFileStore.ts` | Medium | 0 standalone | 文件树数据 + 惰性加载守卫。无独立测试。 |
| `useSearchStore` | `features/search/useSearchStore.ts` | Shallow | 0 standalone | 搜索结果状态。无独立测试。 |
| `ipc` | `lib/ipc.ts` | Shallow | 0 | 集中式 IPC 适配器，封装所有 `window.api.*` 调用。 |
| `useWorkspaceInit` | `hooks/useWorkspaceInit.ts` | Deep | 0 | 工作区加载 + 最近文件 + ignoreList 恢复。84 行，无测试。 |
| `useMenuIpc` | `hooks/useMenuIpc.ts` | Medium | 0 | 10 个菜单通道 IPC 监听。52 行，无测试。 |
| `useScrollRestore` | `hooks/useScrollRestore.ts` | Shallow | 0 | 保存/恢复滚动位置。40 行，无测试。 |
| `useFileWatcher` | `hooks/useFileWatcher.ts` | Shallow | 0 | 打开文件注册 fs 监视器。27 行，无测试。 |
| `ErrorBoundary` | `components/ErrorBoundary.tsx` | Medium | 0 | React 类组件降级 UI + `logError`。无测试。 |
| `Layout` | `components/Layout.tsx` | Shallow | 0 | 纯展示组件。无测试。 |

## Known Deepening Opportunities

### ✅ Completed (2026-06-20)

- **App.tsx God Component → Feature Hooks**：提取 4 个 hook（useMenuIpc / useFileWatcher / useScrollRestore / useWorkspaceInit），281→159 行。
- **Ignore List Blind Spot**：IPC handler 在调用 `listDirectory()`/`searchDirectory()` 前注入 `appStore.get('ignoreList')`。
- **Dead Code Cleanup**：`createStore.ts` 已删除。
- **Centralized IPC Adapter**：`lib/ipc.ts` 封装所有 `window.api.*` 调用，零个直接引用。
- **Store Tests**：`useEditorStore` / `useSettingsStore` / `useUIStore` 各有 3-5 个测试用例。

### 🔲 Active (2026-06-21 review)

| # | Candidate | Priority | Files | Problem |
|---|-----------|----------|-------|---------|
| 1 | Hook 测试 | P0 | `hooks/use*.ts` × 4 | 从 App.tsx 提取后零测试覆盖，含 IPC、store、DOM、错误恢复逻辑 |
| 2 | Store 独立测试 | P0 | `useTabStore` / `useFileStore` / `useSearchStore` | 纯 zustand store，仅通过组件测试间接覆盖 |
| 3 | ErrorBoundary 测试 | P1 | `components/ErrorBoundary.tsx` | 最后防线无验证 → 白屏风险 |
| 4 | ContentSearch deps | P1 | `features/search/ContentSearch.tsx` | useEffect 依赖数组不完整，过时闭包风险 |
| 5 | main/index.ts 测试 | P2 | `main/index.ts` | 8 个 IPC handler + 生命周期，零单元测试 |
| 6 | DEFAULT_IGNORE 去重 | P3 | `main/files.ts` + `main/store.ts` | 同一数组两处独立定义，漂移风险 |
| 7 | IPC_CHANNELS 清理 | P3 | `shared/types.ts` | 完整定义了通道名常量但无人引用——死代码或未执行约定 |
| 8 | E2E waitForTimeout | P3 | `e2e/settings.spec.ts` + `shortcuts.spec.ts` + `theme.spec.ts` | 固定等待替代基于断言的 `waitFor`，CI 下脆弱 |
| 9 | dirtyFiles 防御 | P3 | `features/tabs/useTabStore.ts` | `getState().dirtyFiles` 返回可变 Set 引用，可能被外部修改 |

完整分析见 `docs/superpowers/specs/2026-06-21-architecture-review-design.md`。
