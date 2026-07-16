# Markdown Viewer — 架构总览

## 1. 项目标识

- **定位**：跨平台 Tauri 桌面应用，以工作区方式浏览、渲染和编辑 Markdown 文件
- **技术栈**：Tauri 2 · Rust · React 19 · TypeScript · zustand · Tailwind CSS · Vite · CodeMirror 6
- **核心特性**：GFM 渲染、KaTeX、Mermaid、多标签、全文搜索、原生菜单、主题切换、Markdown 编辑器、自动保存、冲突检测

---

## 2. 架构风格与分层

### 2.1 两层进程模型
Tauri Rust 后端 + Web 前端，通过 IPC 通信。

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend (WebView)                     │
│  features / stores / hooks / components                      │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  lib/ipc.ts — 集中式 IPC 适配器                        │ │
│  └───────────────────────────┬─────────────────────────────┘ │
├─────────────────────────────┼───────────────────────────────┤
│                    Backend (Rust / Tauri)                    │
│  lib.rs — 插件注册、State、invoke_handler、menu::setup_menu  │
│  ┌──────────┬──────────┬──────────┬──────────┐            │
│  │ commands/│  state/  │ search/  │  scope/  │            │
│  └──────────┴──────────┴──────────┴──────────┘            │
│  Tauri Plugins: fs · dialog · shell                          │
│  入口: main.rs → cli::prepare_launch() → lib::run()          │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 前端分层
- **features**：按业务域组织的功能模块（file-tree、tabs、markdown-viewer 等），每个 feature 自包含组件 + store
- **stores**：全局 UI 状态（useUIStore），feature 级 store 放在各自 feature 目录下
- **hooks**：跨 feature 复用的副作用逻辑（文件监控、键盘快捷键、原生菜单事件、滚动恢复等）
- **components**：UI 骨架组件（Layout、ThemeProvider、ErrorBoundary）
- **lib**：基础设施封装（IPC 适配器）

### 2.3 后端分层
- **Commands**：Tauri `#[tauri::command]` 标注的异步函数，前端通过 `invoke` 调用
- **State**：Tauri 托管的共享状态（如 `WatcherState`），通过 `State<'_, T>` 注入 command
- **Tauri Plugins**：官方插件（fs / dialog / shell），通过 capabilities 配置权限

---

## 3. 模块设计

### 3.1 后端模块（Rust）

| 目录/模块 | 职责 |
|-----------|------|
| `lib.rs` | 注册插件、State、`invoke_handler`、`menu::setup_menu` |
| `commands/` | `list_directory`、`search_content`、`cancel_search`、`watch_file`、`unwatch_file`、`update_settings`、`get_launch_paths`、`grant_fs_scope`、`get_setting`/`set_setting`/`migrate_settings`、`save_file`、`get_mtime` |
| `state/` | `SettingsState`（忽略列表、扩展名、`allowed_roots`）、`WatcherState`、`SearchState`、`LaunchState` |
| `search/` | `walk_dir`、`matcher`（行匹配）、`types`（`SearchProgress` 增量协议） |
| `scope/` | `grant_fs_paths` — 运行时 `fs_scope` 动态授权 |
| `menu.rs` | 原生菜单构建；点击 emit `menu-action` 至前端 |
| `cli.rs` | `-v`/`-h` 与启动路径解析 |

> 文件读取通过 `@tauri-apps/plugin-fs` 的 `readTextFile` / `stat`；无自定义 `read_file` command。

### 3.2 前端模块

| 模块 | 位置 | 职责 | 复杂度 | 主要依赖 |
|------|------|------|--------|----------|
| FileTree | `features/file-tree/` | 递归文件树渲染、展开/折叠 | 中 | useFileStore |
| Tabs | `features/tabs/` | 多标签管理、切换、关闭 | 中 | useTabStore |
| MarkdownViewer | `features/markdown-viewer/` | Markdown 渲染（react-markdown + 插件链）、CodeMirror 6 编辑器、自动保存、冲突检测 | 深 | useEditorStore, mermaid, katex, @codemirror/* |
| Outline | `features/outline/` | 标题提取 + 大纲面板 + 点击跳转（rehypeHeadingIds 注入 id） | 中 | headingToId |
| Search | `features/search/` | 文件搜索 + 全局内容搜索 | 中 | useSearchStore |
| Settings | `features/settings/` | 主题切换 + 忽略列表 + 扩展名编辑器 | 浅 | useSettingsStore |
| WelcomePage | `features/welcome/` | 欢迎页：最近文件、恢复会话 | 浅 | useEditorStore |
| Layout | `components/Layout.tsx` | 三栏布局 + 可拖拽面板分隔条 | 中 | useUIStore |
| ThemeProvider | `components/ThemeProvider.tsx` | 主题上下文 + OS 主题监听 | 浅 | useUIStore |
| App | `App.tsx` | 顶层组装 hook + UI 组件 | 中 | 所有 feature hook |
| ipc adapter | `lib/ipc.ts` | 集中式 Tauri API 封装（invoke + 插件） | 浅 | @tauri-apps/api |
| ErrorBoundary | `components/ErrorBoundary.tsx` | React 组件崩溃降级 UI | 中 | logger |

### 3.3 Store 清单

| Store | 位置 | 职责 | 持久化 |
|-------|------|------|--------|
| useUIStore | `src/renderer/stores/useUIStore.ts` | 主题、面板可见性、面板宽度、搜索面板状态 | theme、sidebarWidth、outlineWidth（Rust store） |
| useEditorStore | `features/markdown-viewer/useEditorStore.ts` | 文件内容缓存（惰性加载）、滚动位置 | readingPositions（Rust store） |
| useSettingsStore | `features/settings/useSettingsStore.ts` | 忽略列表、Markdown 扩展名配置 | ignoreList、markdownExtensions（Rust store） |
| useTabStore | `features/tabs/useTabStore.ts` | openFiles、activeFile、dirtyFiles；关闭时清理 Editor 缓存 | openFiles、activeFile（Rust store） |
| useFileStore | `features/file-tree/useFileStore.ts` | 文件树数据、展开状态、加载状态（惰性加载守卫） | — |
| useSearchStore | `features/search/useSearchStore.ts` | 搜索关键词、结果、搜索状态 | — |

> 设计原则：store 各自独立，无交叉依赖。组件通过 hook 订阅，不直接操作 store。

---

## 4. 核心数据流

### 4.1 文件打开流程
```
用户点击文件树 / 菜单 / WelcomePage
  → ipc.scope.grantFsScope([path])     // 动态 fs scope
  → useTabStore.openFile(path)
  → useEditorStore.loadContent(path)
    → ipc.files.readFile(path)        // plugin-fs readTextFile
  → 渲染 MarkdownViewer（rehypeRaw → rehypeSanitize → …）
```

### 4.2 全文搜索流程
```
用户输入搜索关键词
  → useSearchStore.appendResults 增量合并
    → ipc.search.searchContent(workspacePath, query, searchId)
      → invoke('search_content', ...)
        → Rust 遍历 + 每 N 文件 emit（含 newMatches、500 条上限）
          ← search-result 事件
    → ipc.search.onResult 多播接收
```

### 4.3 文件变更通知流程
```
磁盘文件变更
  → notify crate 触发
    → watcher 回调
      → 读取新内容
      → window.emit("file-change", payload)
        ← 前端 useFileWatcher 监听接收
          → useEditorStore 更新内容
          → 标签短暂显示刷新标记
          → 保持滚动位置（useScrollRestore）
```

### 4.4 编辑保存流程（Edit 模式）
```
用户编辑 CodeMirror
  → useEditorPersistence hook 监听内容变更
    → 1.5s 防抖
      → ipc.files.getMtime(path)          // 检查磁盘修改时间
        → 若磁盘 mtime > 上次保存 mtime → 冲突，显示 ConflictBanner
        → 否则 → ipc.files.saveFile(path, content)
          → invoke('save_file', ...)
            → Rust files::save_file 写入磁盘，返回新 mtime
          ← 更新 lastSavedMtime、lastSavedContent，状态 = saved
```

### 4.5 冲突检测流程
```
自动保存 / Ctrl+S 触发保存
  → 先获取磁盘 mtime
    → 磁盘 mtime > 上次保存 mtime？
      → 是：saveStatus = 'conflict'，显示 ConflictBanner
        → 用户选择：
          - 加载磁盘：读取磁盘内容，更新编辑器
          - 保留我的：关闭横幅，状态回到 dirty
          - 稍后处理：关闭横幅，状态保持 conflict
      → 否：正常保存，更新 mtime 和内容缓存
```

---

## 5. 横切关注点

### 5.1 错误处理

核心原则：**纯函数自然抛出，边界层统一捕获**。
- 纯函数（Rust 命令逻辑、前端工具函数等）自然抛出，不写 try/catch
- 边界层（Tauri command、事件监听器、React 副作用 hook）统一捕获
- 格式：`logError('模块名:子操作', err)`
- 全局兜底：`window.onerror` / React ErrorBoundary（最后防线，不依赖其恢复）
- 不引入 `Result<T,E>` 类型或统一 Error 类

### 5.2 IPC 通信

按语义选择三种模式：

- **invoke/command**（请求-响应）：需要返回值的场景。Rust 返回 `Result<T, String>`，`Err` 透传到前端 Promise.reject
- **emit/listen**（事件推送）：单向通知。前端 `listen` 回调内 catch → `logError`
- **官方插件**：通用能力优先用 plugin-fs / plugin-dialog / plugin-shell

**invoke/command**：`list_directory`、`search_content`、`cancel_search`、`watch_file`、`unwatch_file`、`update_settings`、`get_launch_paths`、`grant_fs_scope`、`get_setting`、`set_setting`、`migrate_settings`、`save_file`、`get_mtime`

**emit/listen**：`search-result`、`file-change`、`menu-action`（原生菜单 → 前端 `useMenuEvents`）

**官方插件**：plugin-fs（读文件/stat）、plugin-dialog、plugin-shell

所有 IPC 调用集中封装在 `src/renderer/lib/ipc.ts`，前端不直接调用 `invoke` / `emit`。

### 5.3 日志
- 前端：`src/renderer/logger.ts` → `console.error`
- 后端：Rust `log` crate
- 前端统一通过 `logError` 函数记录，格式一致

### 5.4 状态管理原则
- 每个 feature 维护自己的 store，不跨 feature 引用
- 全局 UI 状态（主题、面板可见性等）放在 `stores/useUIStore.ts`
- 组件通过 selector 订阅，避免不必要的重渲染

### 5.5 安全
- 前端运行在 WebView 沙箱中，无 Node.js 环境
- **fs:scope**：`capabilities` 静态 `allow: []`；打开工作区/文件时 `grant_fs_scope` 动态授权；command 层 `ensure_under_allowed_root` 纵深防御
- 本地图片通过 `asset://localhost/` 引用
- **HTML 消毒**：`rehype-raw` → `rehype-sanitize` 白名单（保留 `u`、`kbd`、`mark` 等排版标签；禁止 `script`、`iframe`、`on*` 属性）
- CSP：`tauri.conf.json` 配置 `asset:`、`object-src 'none'`、`base-uri 'none'` 等
- 外部链接经 `plugin-shell` 打开，不直接在 WebView 跳转

### 5.6 渲染优化
- **Mermaid**：动态 `import('mermaid')` + 单例缓存（`mermaid.ts` / `MermaidBlock.tsx`），首次遇到 mermaid 代码块时加载，Vite 代码分割为独立 chunk

### 5.7 持久化
- 生产环境：`app_data_dir/settings.json`（Rust `StoreState`），`ipc.store` 经 invoke 读写
- 首次启动：`ensureStoreMigrated()` 从 localStorage 批量导入
- E2E mock：仍用 localStorage（`ipc.mock.ts`）

---

## 6. 设计约束

- 不引入 `Result<T,E>` 类型或统一 Error 类
- 不引入新依赖（**例外**：`rehype-sanitize`，见 `AGENTS.md`）
- 纯函数不捕获异常，不修改签名以引入错误处理
- 版本号规范：见 `AGENTS.md`

---

## 7. 术语表

| 术语 | 定义 |
|------|------|
| 工作区 (Workspace) | 用户打开的文件系统目录，文件树根节点 |
| Entry | 文件树节点（文件或目录），由 `FileEntry` 类型描述 |
| Tab | 已打开文件的导航单元，`openFiles[]` + `activeFile` |
| 内容 (Content) | 磁盘文件原始字符串，缓存在 `contents[filePath]` |
| Command | Tauri 后端暴露给前端的 Rust 函数，通过 `invoke` 调用 |
| Event | 后端向前端推送的单向通知，通过 `emit/listen` 通信 |
| IPC Adapter | `lib/ipc.ts` 集中封装的 Tauri API 调用层 |
| 忽略列表 (Ignore List) | 用户配置的目录/文件忽略规则 |
| Panel Resizer | 侧边栏/大纲面板的可拖拽宽度调节器 |
| Capabilities | Tauri 权限配置，定义前端可访问的后端能力 |
| WatcherState | Rust 后端共享状态，管理 notify watcher 与已监控路径 |
| SettingsState | Rust 后端共享状态，管理忽略列表与 Markdown 扩展名 |
| shared/settingsDefaults.ts | 前后端一致的默认设置常量 |
