# Markdown Viewer — 架构总览

## 1. 项目标识
- **定位**：跨平台 Electron 桌面应用，以工作区方式浏览和渲染 Markdown 文件（GFM、KaTeX、Mermaid），支持多标签、搜索、主题切换
- **技术栈**：Electron · React 19 · TypeScript · zustand · Tailwind CSS · electron-vite · electron-builder

## 2. 架构图

```
                    ┌──────────────────────────────────────┐
                    │          Renderer (React 19)          │
                    │                                       │
                    │  ┌─────────┐  ┌──────────┐           │
                    │  │ features │  │  stores  │           │
                    │  │ file-tree│  │ useUI    │           │
                    │  │ tabs     │  │ editor   │           │
                    │  │ markdown │  │ settings │           │
                    │  │ search   │  │ tab      │           │
                    │  │ outline  │  │ file     │           │
                    │  │ settings │  │ search   │           │
                    │  └────┬─────┘  └────┬─────┘           │
                    │       │             │                 │
                    │  ┌────┴─────────────┴────┐            │
                    │  │     lib/ipc.ts        │            │
                    │  │  集中式 IPC 适配器     │            │
                    │  └───────────┬───────────┘            │
                    │              │                        │
                    │      contextBridge (preload)           │
                    ├──────────────┼────────────────────────┤
                    │    Main Process (Node.js)              │
                    │              │                        │
                    │  ┌───────────┼───────────┐            │
                    │  │           │           │            │
                    │  ▼           ▼           ▼            │
                    │ files     watcher     search          │
                    │ store      menu      window           │
                    │ protocol                             │
                    │  │                                   │
                    │  └─────── electron-store (JSON)       │
                    └──────────────────────────────────────┘
```

两层进程通过 IPC 通信。渲染进程所有 `window.api.*` 调用集中在 `lib/ipc.ts` 单一适配器中。主进程模块各自封装一个职责领域，通过 `src/main/index.ts` 注册 IPC handler。

## 3. 模块地图

### 主进程

| 模块 | 文件 | 职责 | 复杂度 | 依赖 |
|------|------|------|--------|------|
| files | `src/main/files.ts` | 目录扫描、文件读取，薄封装 fs | 浅 | store (ignoreList) |
| watcher | `src/main/watcher.ts` | 管理 `Map<path, FSWatcher>`，文件变更通知渲染 | 中 | window |
| search | `src/main/search.ts` | 异步全文搜索，结果流式推送 | 中 | store (ignoreList) |
| store | `src/main/store.ts` | electron-store 封装，持久化配置 | 浅 | — |
| menu | `src/main/menu.ts` | 应用菜单定义 + 键盘快捷键，通过 IPC 推送操作 | 浅 | — |
| window | `src/main/window.ts` | 单窗口管理，位置/大小持久化 | 浅 | — |
| protocol | `src/main/protocol.ts` | `local-file://` 自定义协议注册 | 浅 | — |
| index | `src/main/index.ts` | 入口：IPC handler 注册 + 全局错误处理 | 中 | 所有主进程模块 |

### 渲染进程

| 模块 | 位置 | 职责 | 复杂度 | 依赖 |
|------|------|------|--------|------|
| FileTree | `features/file-tree/` | 递归文件树渲染、展开/折叠 | 中 | useFileStore |
| Tabs | `features/tabs/` | 多标签管理、切换、关闭 | 中 | useTabStore |
| MarkdownViewer | `features/markdown-viewer/` | Markdown 渲染（react-markdown + 插件链）| 深 | useEditorStore, mermaid, katex, highlight.js |
| Outline | `features/outline/` | 标题提取 + 大纲面板 + 点击跳转 | 中 | useEditorStore |
| Search | `features/search/` | 文件搜索 (Ctrl+P) + 全局内容搜索 (Ctrl+Shift+F) | 中 | useSearchStore |
| Settings | `features/settings/` | 主题切换 + 忽略列表编辑器 | 浅 | useSettingsStore |
| WelcomePage | `features/welcome/` | 欢迎页：最近文件、恢复会话 | 浅 | useEditorStore |
| App | `App.tsx` | 顶层组装 hook + UI 组件 | 中 | 所有 feature hook |
| ipc adapter | `lib/ipc.ts` | 集中式 `window.api.*` 封装 | 浅 | — |
| ErrorBoundary | `components/ErrorBoundary.tsx` | React 组件崩溃降级 UI | 中 | logger |

### Store 清单

| Store | 文件 | 职责 |
|-------|------|------|
| useUIStore | `stores/useUIStore.ts` | 主题、面板可见性 |
| useEditorStore | `features/markdown-viewer/useEditorStore.ts` | 文件内容惰性加载 |
| useSettingsStore | `features/settings/useSettingsStore.ts` | 用户设置读写 |
| useTabStore | `features/tabs/useTabStore.ts` | openFiles、activeFile、dirtyFiles |
| useFileStore | `features/file-tree/useFileStore.ts` | 文件树数据、惰性加载守卫 |
| useSearchStore | `features/search/useSearchStore.ts` | 搜索结果状态 |

## 4. 横切关注点

### 错误处理
详见 [ADR-0001](adr/0001-error-handling-model.md)。核心原则：纯函数自然抛出，边界层统一捕获，`logError('模块名:子操作', err)` 格式记录。

### IPC 通信
详见 [ADR-0002](adr/0002-ipc-pattern.md)。核心原则：`handle` → rethrow，`on` → 即发即弃。通道名在 `shared/types.ts` 定义。

### 日志
- 主进程：`src/main/logger.ts` → `process.stderr`
- 渲染进程：`src/renderer/logger.ts` → `console.error`

### 状态管理
zustand store 各自独立，无 store 间交叉依赖。组件通过 hook 订阅，不直接操作 store。

### 主题
`useUIStore.theme` 驱动。默认跟随系统 `prefers-color-scheme`，手动选择覆盖。代码高亮主题同步切换。

## 5. 设计约束
- 不引入 `Result<T,E>` 类型或统一 Error 类
- 不使用 `dialog.showErrorBox`（E2E 拦截）
- 不引入新依赖（除非明确批准）
- 纯函数不捕获异常，不修改签名以引入错误处理
- 版本号规范见 `AGENTS.md`

## 6. 术语表

| 术语 | 定义 |
|------|------|
| 工作区 (Workspace) | 用户打开的文件系统目录，文件树根节点 |
| Entry | 文件树节点（文件或目录），由 `FileEntry` 类型描述 |
| Tab | 已打开文件的导航单元，`openFiles[]` + `activeFile` |
| 内容 (Content) | 磁盘文件原始字符串，缓存在 `contents[filePath]` |
| IPC Seam | 主进程与渲染进程通过 `ElectronAPI` 类型定义的契约通信 |
| 忽略列表 (Ignore List) | 用户配置的目录/文件忽略规则 |
