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
                     │  features/ + stores/ + lib/       │
                     │         window.api.*               │
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
| `files` | `src/main/files.ts` | Shallow | 6 tests | 纯函数，薄封装 fs。`listDirectory` 忽略列表硬编码。 |
| `watcher` | `src/main/watcher.ts` | Medium | 4 tests | 管理 `Map<string, FSWatcher>`。耦合单个 window 引用。 |
| `search` | `src/main/search.ts` | Medium | 4 tests | `walkDir` 忽略逻辑硬编码，不支持用户配置。 |
| `store` | `src/main/store.ts` | Shallow | 5 tests | 简化版 `electron-store` 封装。 |
| `menu` | `src/main/menu.ts` | Shallow | 2 tests | 菜单定义 + 键盘加速器，通过 IPC 推送消息。 |
| `window` | `src/main/window.ts` | Shallow | 3 tests | 单窗口 singleton，边界持久化。 |
| `protocol` | `src/main/protocol.ts` | Shallow | 2 tests | `local-file://` 协议注册。 |

### Renderer Modules

| Module | Location | Depth | Tests | Notes |
|--------|----------|-------|-------|-------|
| App orchestrator | `App.tsx` | **God component** | 4 integration | 281 行，11 个 useEffect。混合所有关注点。 |
| FileTree | `features/file-tree/` | Medium | 1 smoke | 递归组件，每个节点独立订阅 zustand。 |
| Tabs | `features/tabs/` | Medium | 2 | `useTabStore` 被 4 个模块依赖（最高耦合）。 |
| MarkdownViewer | `features/markdown-viewer/` | Deep | 2 | 丰富的插件链 + 自定义组件。好的深度。 |
| Outline | `features/outline/` | Medium | 2 | 正则提取标题。 |
| Search | `features/search/` | Medium | 2 | 客户端文件搜索 + IPC 全文搜索。 |
| Settings | `features/settings/` | Shallow | 1 | 主题切换 + 忽略列表编辑器。 |
| **useEditorStore** | `stores/useEditorStore.ts` | **No tests** | 0 | 最靠近 I/O 的 store（调用 `window.api.files.readFile`）。 |
| **useSettingsStore** | `stores/useSettingsStore.ts` | **No tests** | 0 | 存储忽略列表，但主进程不读取。 |
| **createStore** | `stores/createStore.ts` | **Dead code** | 0 | 无任何 import。 |

## Known Deepening Opportunities

### 1. App.tsx God Component → Feature Hooks

- 提取 4-5 个 hook：`useMenuIpc`、`useFileWatcher`、`useScrollRestore`、`useWorkspaceInit`
- App.tsx 从 281 行缩至 ~80 行

### 2. Ignore List Blind Spot

- 设置面板写 `ignoreList` 到 electron-store，但 `listDirectory()` 和 `walkDir()` 用硬编码忽略
- 功能破损：用户配置了但永不生效
- Fix: IPC handler 在调用前读取 store 传入

### 3. Dead Code + Inconsistent Module Layout

- `createStore.ts` 死代码
- store 分散在 `stores/` 和 `features/` 两个位置
- `tests/` 和 `resources/` 空目录

### 4. No Centralized IPC Adapter

- `window.api.*` 散落在各个组件和 store
- 测试需要 mock 全局 `window`
- 建议 `lib/ipc.ts` 封装所有 IPC 调用

### 5. FileTree Over-Subscription

- 每个 `FileTreeNode` 独立订阅 `s.entries[entry.path]`（O(n) 订阅）
- 大目录下可见性能问题

### 6. Missing Store Tests

- `useEditorStore`（最靠近 I/O）无测试
- `useSettingsStore` 无测试
