# Changelog

本文件记录 Markdown-Viewer 各版本的变更摘要。

## [1.4.7] - 2026-07-21

### 新增

- **大文档分片渲染**：行数 > 1000 的 Markdown 文档首屏只渲染前 200 行，IntersectionObserver 监听哨兵元素进入视口时追加 200 行；锚点跳转场景一次性渲染全部
  - `useChunkedContent` hook：纯函数式分片策略，可配置阈值 / 首屏行数 / 追加行数
  - `MarkdownViewer` 集成：渲染区底部附加哨兵 div，可见时触发追加
- **大文件守护 FileSizeGuard**：打开文件前检查大小与类型，防止误打开超大文件卡 UI
  - 纯函数 `checkFileSize(path, size, kind, thresholds?)`：按 Markdown 5MB / 文本 2MB 阈值决策
  - 二进制文件直接 `alert` 拒绝读取为文本
  - 超阈值文件 `confirm` 询问，用户取消则不打开
  - 集成于 `useTabStore.openFile` 入口；未 list 过的目录跳过检查不阻塞
- **文件树懒加载 UI 边界补齐**：展开子目录过程中显示 loading 占位符；展开后无可见子条目显示「空目录」提示
- **性能基线度量脚本**：`e2e/perf/markdown-render.perf.ts` 与 `e2e/perf/file-tree.perf.ts`，`pnpm test:perf` 触发，度量结果作为分片决策依据

### 变更

- **开发规范统一收敛至 AGENTS.md**：将 `docs/development.md` 内容迁入 `AGENTS.md`，消除双轨维护
  - AGENTS.md 新增章节：开发命令、测试规范（测试金字塔/E2E 策略/mock IPC 维护规则）、工作流查询（gh CLI）、发布流程
  - 删除 `docs/development.md`
  - 更新 `README.md`、`docs/product.md` 中对 development.md 的引用
- **E2E 工具函数 `createTestWorkspace`**：递归扫描子目录构建完整 `directoryTree` map，支持子目录懒加载场景；新增 `sizeOverride` 选项用于 FileSizeGuard 测试

### 测试

- 单元测试：新增 `useChunkedContent.test.ts`（8 用例）、`fileSizeGuard.test.ts`（12 用例）、`useTabStoreFileSize.test.ts`（8 集成用例）
- E2E 测试：新增 `file-size-guard.spec.ts`（4 用例）、`markdown-large-doc.spec.ts`（3 用例）、`file-tree-loading.spec.ts`（2 用例）
- 全部 84 个 E2E 测试通过，508 个单元测试通过

## [1.4.6] - 2026-07-20

### 新增

- **FileKindModule**：统一文件类型判断，将文件分类为 `markdown` / `code` / `text` / `binary` 四种类型
  - `getFileKind(path)`：根据扩展名返回文件类型
  - `allowsEdit(path)`：判断文件是否允许编辑
  - `allowsPreview(path)`：判断文件是否允许预览
  - `isVisibleFileEntry(entry)`：统一判断文件是否在文件树中显示
- **DocumentSurface Module**：根据文件类型和视图模式确定渲染策略和能力
  - `getDocumentSurface(path, viewMode, loadState)`：返回 surface 类型和 capabilities
  - 消除 App.tsx 中零散的 `isMarkdownFile` 分支判断
- **编辑时预览面板**：编辑模式下右侧实时预览 Markdown 渲染结果
  - `useTabStore` 新增 `previewEnabled` 字段和 `togglePreview` / `setPreviewEnabled` 方法
  - `EditorPane` 支持 `previewEnabled` prop，启用时水平分栏显示编辑器和预览
  - 新增「切换编辑预览面板」命令，可在命令面板中搜索执行
- **SourceViewer 行号显示**：文本/代码文件查看时左侧显示行号
  - 行号区域独立，灰色背景，右对齐，不可选中
  - 语法高亮保持不变

### 变更

- **TabBar 视图诚实化**：根据 `capabilities.allowsEditMode` 决定是否显示编辑按钮
- **状态栏区分模式**：非 Markdown 文件显示「源码伴读」而非「阅读」/「编辑」
- **删除重复判断逻辑**：移除 `settingsDefaults.ts` 中重复的 `isVisibleFileEntry`

### 测试

- 单元测试：新增 `fileTypes.test.ts`（FileKindModule）、`surface.test.ts`（DocumentSurface Module）
- E2E 测试：新增 `surface-honesty.spec.ts`（非 MD 文件视图诚实化）、`editor-preview.spec.ts`（编辑预览面板）、`source-viewer.spec.ts`（行号显示）
- 全部 75 个 E2E 测试通过，476 个单元测试通过

## [1.4.5] - 2026-07-19

### 新增

- **表格编辑器**：在编辑视图提供轻量 Markdown 表格编辑能力
  - 工具栏「Table」按钮唤起插入弹窗，可配置数据行数（1–10）与列数（2–10）
  - `Tab` / `Shift+Tab` 在单元格间导航，到达末尾时自动新增一行
  - `Enter` 在当前数据行下方插入新行
  - `Backspace` 删除当前空数据行；仅剩一行数据时删除整个表格
  - 实现：`src/renderer/lib/codemirror/table.ts`（解析/插入/删除/导航）+ `Prec.high` 优先级 keymap

### 变更

- **前端状态管理拆分**：将 `useUIStore` 杂物袋按概念拆分为 3 个领域专属 store
  - `useThemeStore`：主题状态（theme / themeId / codeTheme）
  - `useLayoutStore`：布局状态（侧边栏/大纲可见性与宽度、搜索面板）
  - `useNavigationStore`：导航意图状态（pendingContentJump / pendingAnchorJump / searchHighlight）
  - 12+ 消费文件同步迁移，删除原 `useUIStore` 及其测试
- **`useCommandStore` 定位澄清**：添加头部注释，明确其作为命令面板公共接口的角色
- **Lint 警告专项清理**：20 个 warnings 全部归零
  - 移除未使用的导入与变量
  - 替换 3 处 `any` 类型为具体类型
  - 修复/注释 4 处 React Hook 依赖项警告

### 测试

- 单元测试 478 个全部通过（含 `table.test.ts` 新增解析/插入/删除/导航用例）
- E2E 测试 66 个全部通过（含 `table-editor.spec.ts` 4 个用例）

## [1.4.4] - 2026-07-18

### 变更

- **后端 SearchSession Module 抽出**：将搜索编排从 command 层下沉为独立 Module
  - `SearchSession` 负责 walk → filter → match → emit 全流程，支持注入 emit 回调便于单元测试
  - `CancelledStore` 替代 `SearchState`，用 `AtomicBool` + `Mutex` 管理取消状态
  - `commands/search` 退化为薄 Adapter（取 State、构造 Session、转发事件）
- **后端 Filesystem Module 抽出**：统一 `FileEntry` 类型与 CRUD 入口
  - `Filesystem` 提供 list/create/rename/save/mtime/trash 与文件名校验
  - `commands/directory`、`commands/files`、`commands/trash` 仅做注入与错误映射，消除重复校验
- **文件树缓存失效完善**：`invalidateCache` 支持递归失效父目录，返回受影响路径集合同步清除 `entries` 状态
- **欢迎页定位**：补充一句话价值主张「打开文件夹就能流畅读、偶尔改」
- **产品名统一为 Markdown-Viewer**：欢迎页、窗口标题、CLI 帮助、文档与测试断言与 `productName` 对齐（含连字符）

### 测试

- 单元测试从 446 个增至 451 个
  - 扩充 `useFileStore.test.ts`：覆盖递归缓存失效与受影响路径清理
- E2E 测试从 58 个增至 64 个
  - 新增 `welcome-page.spec.ts`：价值主张与应用名称展示

## [1.4.3] - 2026-07-18

### 变更

- **后端 Workspace Module 抽出**：将 `scope/` 与 `SettingsState.allowed_roots` 双轨合并为统一的 `workspace/` Module
  - `WorkspaceState` 持有 `allowed_roots: Mutex<Vec<PathBuf>>`，统一管理 plugin-fs scope 授权与自定义门禁
  - `grant` 内部同时调用 `app.fs_scope().allow_directory/allow_file` 与 `add_root`
  - `assert_allowed(path)` 实现安全语义：空 roots 时放行（兼容首次启动），有 roots 时检查路径是否在任一授权根下
  - 删除 `src-tauri/src/scope/` 与 `src-tauri/src/commands/scope.rs`
- **后端 FileFilters Module 新增**：从 `StoreState` 实时读取 `ignoreList` / `markdownExtensions`，不缓存
  - `FileFilters::from_store(store)` 在每次 command 调用时构造一次，保证设置改动立即生效
  - 删除 `src-tauri/src/state/settings.rs` 与 `src-tauri/src/commands/settings.rs`
  - `StoreState` 新增 `get<T: DeserializeOwned>()` typed getter
- **前端 useWorkspaceStore 新增**：替代 `useWorkspaceInit` hook，统一管理 workspace 授权根与启动状态
  - 集中 `init()` / `openFolder()` / `addFolderToWorkspace()` / `openFile()` / `validateRecentEntries()`
  - 移除 App.tsx 中零散的 sidebarWidth/outlineWidth/themeId 启动 effect
  - 删除 `src/renderer/hooks/useWorkspaceInit.ts`
- **前端 useSettingsStore 收拢**：移除 `ignoreList` / `markdownExtensions` 字段，仅保留阅读设置
  - SettingsPanel 改为本地 state + 直接 `ipc.store.set` / `ipc.store.get` 读写后端 KV
- **IPC 适配器改造**：`ipc.scope.grantFsScope` → `ipc.workspace.grant`；删除 `ipc.files.updateSettings`

### 测试

- 单元测试从 444 个增至 446 个
  - 新增 `useWorkspaceStore.test.ts`（12 用例）：覆盖 init / openFolder / openFile / addFolderToWorkspace / validateRecentEntries
  - 新增 Rust `workspace::` 模块 5 个单元测试：grant/assert_allowed/dedup 等
  - 新增 Rust `filters::` 模块单元测试：from_store 默认值与自定义值两条路径
- E2E 测试从 55 个增至 58 个
  - 新增 `workspace-init.spec.ts`（3 用例）：启动恢复、无 workspace 打开文件、多工作区添加

## [1.4.2] - 2026-07-18

### 新增

- **相对路径补全**：在编辑器中输入 `[[`、`./`、`![](`、`](` 触发文件路径补全
  - 基于 `@codemirror/autocomplete` 实现，无需新增依赖
  - 支持模糊匹配、目录导航（`./dir/`）、图片文件识别
  - `[[` 触发 wiki 链接补全，插入 `[filename](./path)` 格式
  - `![](` 触发图片补全，仅显示图片文件
  - 通过 `updateListener` + `startCompletion` 解决特殊字符触发问题
  - 通过 `apply` 函数替换触发词，`from` 设为光标位置

### 变更

- **编辑会话模块合并**：合并 `useEditorSession` 和 `useEditorPersistence` 为统一的 `useEditorDocument`
  - 统一状态机（saved/dirty/saving/error/conflict）
  - 统一冲突处理 Seam：保存时 mtime 冲突和外部变更冲突走同一条路径
  - `keepMine` 通过 `ignoreMtimeConflict` 参数跳过 mtime 冲突检测
- **useFileWatcher 改造**：移除直接修改 store 的逻辑，新增 `onExternalChange` 回调
  - 由 `useEditorDocument` 统一处理外部变更，确保进入冲突状态并显示提示横幅
  - 修复外部变更静默覆盖 bug：dirty 状态下外部变更不再被静默覆盖
- **EditorPane 重构**：用 props 替换内部 store 调用，接收 `saveStatus`、`onLoadDisk`、`onKeepMine`、`onChange`

### 测试

- 单元测试从 399 个增至 444 个
  - 新增 `pathCompletion.test.ts`（45 用例）：覆盖触发词检测、查询提取、路径解析、候选项构建、模糊匹配、插入文本构建
  - 新增 `useEditorDocument.test.ts`（14 用例）：覆盖状态机所有转移、mtime 冲突、外部变更处理
- E2E 测试从 51 个增至 55 个
  - 新增 `path-completion.spec.ts`（4 用例）：验证 `[[`、`./`、`![](` 触发补全及选择插入
  - 新增 `editor-conflict.spec.ts`（3 用例）：验证外部变更冲突检测与处理

## [1.4.0] - 2026-07-16

### 新增

- **useEditorSession 会话层**：将编辑会话编排（持久化 + 换文件 reset/seed + 冲突处理）从 App.tsx 下沉至独立 hook
- **PersistenceSeed 机制**：文件打开时以磁盘内容初始化已保存状态，避免误标 dirty 并触发自动保存
- **EditorPane 冲突条本地 dismissed 状态**：冲突横幅可手动关闭，移除 onLater prop

### 变更

- **useEditorPersistence 重构为 ref-based 架构**：使用 ref 同步状态，避免闭包陈旧值导致保存逻辑错误
- **EditorPane 组件抽离**：编辑相关 UI 逻辑（工具栏、冲突横幅、编辑器）从 App.tsx 下沉
- **createExtensions 依赖注入**：通过 isDark 参数注入主题状态，移除对 useUIStore 的直接依赖
- **ipc.mock.ts 新增 saveFile/getMtime mock**：E2E mock 可覆盖写盘路径
- **Vite manualChunks 拆分 CodeMirror**：优化前端打包分包
- **architecture.md 状态管理原则更新**：允许 store 通过 action 或 getState() 显式协同，lib 层参数注入
- **AGENTS.md 依赖例外更新**：CodeMirror 6 相关包登记为已批准依赖

### 测试

- 单元测试从 353 个增至 401 个
- 新增 useEditorPersistence 测试（12 用例）：覆盖 seed 初始化、防抖保存、mtime 冲突、保存成功/失败、loadDiskVersion
- 新增 useEditorSession 测试（5 用例）：覆盖 seed/dirty/auto-save/path 切换/loadDisk/keepMine
- 新增 markdownCommands 测试扩充：新增标题/列表/任务列表/引用/链接/图片/分割线/表格/代码块共 12 个用例
- 修复 listContinuation 测试：对接生产模块 parseListLine

## [1.3.1] - 2026-07-16

### 新增

- **编辑模式（Edit）**：基于 CodeMirror 6 的 Markdown 编辑器，新增第三种视图模式
  - Markdown 语法高亮、行号显示、活动行高亮
  - 编辑器工具栏：加粗、斜体、删除线、行内代码、标题（H1-H6）、无序列表、有序列表、任务列表、引用、代码块、链接、图片、水平线
  - 键盘快捷键：Ctrl+S 保存、Ctrl+F 查找替换、Ctrl+D 多选下一个匹配
  - 列表自动延续：无序列表、有序列表、任务列表回车自动延续
  - 括号自动匹配：`()[]{}""''` 自动补全
- **自动保存**：编辑模式下 1.5 秒防抖自动保存，Ctrl+S 立即保存
- **冲突检测**：检测到文件被外部修改时显示冲突警告横幅，支持加载磁盘版本/保留当前修改
- **状态栏增强**：显示保存状态（已保存/保存中/未保存/冲突/错误）和当前视图模式

### 变更

- 视图模式从二态（Render/Source）扩展为三态（Render/Source/Edit），Ctrl+Shift+S 循环切换
- Rust 后端新增 `save_file`、`get_mtime` 命令，支持文件保存和修改时间查询
- IPC 适配器新增 `files.saveFile`、`files.getMtime` 方法

### 技术

- 新增依赖：`@codemirror/view`、`@codemirror/state`、`@codemirror/commands`、`@codemirror/lang-markdown`、`@codemirror/search`、`@codemirror/autocomplete`、`@codemirror/language`、`lezer-markdown`

## [1.3.0] - 2026-07-15

### 新增

- **命令面板**（Ctrl+Shift+P）：模态弹窗 + 模糊匹配命令注册中心，支持注册、注销、动态加载命令
  - 13 条内置命令：切换侧边栏/大纲/视图、文件/内容/最近文件搜索、关闭标签、设置、打开命令面板、打开今日笔记、导出 PDF/HTML、打开文件夹
  - 键盘操作：↑↓ 选择、Enter 执行、Escape 关闭；点击遮罩关闭
- **导出功能**：
  - **HTML 导出**：通过 `react-dom/server` 静态渲染当前 Markdown 为独立 HTML 文档，含基础主题样式
  - **PDF 导出**：调用 `window.print()` 触发浏览器原生打印，由用户选择"另存为 PDF"
  - Rust 新增 `save_text_file` command 用于保存文本到任意路径
- **每日笔记**：`File > Today's Note` 与命令面板入口，自动在 `notes/YYYY-MM-DD.md` 创建并打开当日笔记

### 变更

- 原生 File 菜单新增 `Today's Note`、`Export as PDF...`、`Export as HTML...` 子项
- `useMenuEvents` 新增 `onExportPdf`、`onExportHtml`、`onOpenTodaysNote` 处理器
- i18n 新增 `commandPalette.placeholder`、`commandPalette.noResults`、`commandPalette.openDialog` 翻译键

### 测试

- 单元测试 353 个（48 个测试文件）：新增 fuzzyMatch 7 个、commands 4 个、CommandPalette 9 个、exporter 2 个、dailyNote 4 个
- E2E 测试 45 个：新增 command-palette.spec.ts 含 3 个场景（唤起、关闭、过滤）

## [1.2.13] - 2026-07-15

### 新增

- **阅读设置**：字体大小调整（12-24px）、行高调整（1.0-2.5）、页宽限制（600-1200px 或无限制）
- **内置主题扩展**：6 套主题（3 浅色 + 3 深色），包括浅色护眼、浅色清爽、深色纯黑（OLED）、深色护眼等
- **系统字体选择**：正文字体和代码字体下拉选择，提供常用跨平台字体列表
- **CSS 变量系统**：通过 `--font-size`、`--line-height`、`--content-max-width`、`--font-family`、`--code-font-family` 实现实时预览

### 变更

- 设置面板新增阅读设置和主题风格选择区域
- ThemeProvider 扩展支持主题 ID 解析和 CSS 变量注入

## [1.2.12] - 2026-07-15

### 修复

- E2E 测试国际化兼容：测试环境固定 `locale` 为 `en-US`，替换中文选择器为英文
- Outline 组件接入 i18n：替换硬编码中文文本（全部折叠/展开/复制锚点等）

## [1.2.11] - 2026-07-15

### 新增

- **测试覆盖率提升**：Rust 单元测试从 2 个增至 15 个，前端测试从 315 个增至 315+ 个
- **性能优化**：文件树缓存（5 分钟 TTL）、highlight.js 懒加载
- **国际化**：中英文翻译支持，设置面板语言切换

## [1.2.10] - 2026-07-15

### 新增

- 文件树操作闭环：新建文件/文件夹、重命名、删除（移至回收站）、刷新
- 文件排序：支持按名称、修改时间、大小排序，目录始终排在前面
- 收藏夹功能：添加/移除收藏、收藏夹列表、右键菜单操作
- 多工作区：支持添加多个工作区根目录、根目录右键移除、原生菜单集成
- ContentSearch 扩展到多根目录搜索
- WelcomePage 增加最近工作区列表及「添加到工作区」操作

### 变更

- FileTree 组件支持多根目录渲染，每个根目录独立显示
- FileEntry 类型扩展 modified、size 元数据字段
- useFileStore 扩展 rootPaths、addRoot、removeRoot、isRoot 等多工作区 API

## [1.2.7] - 2026-07-12

### 新增

- **设置面板关闭按钮**：右上角新增 X 按钮关闭设置面板，此前仅支持 ESC 键关闭
- **应用图标更新**：采用分栏预览风格图标，左侧深色源码区 + 右侧浅色渲染区

## [1.2.3] - 2026-07-10

### 文档

- **文档体系纳入版本库**：`docs/` 纳入 Git；新增 `product.md`、`development.md`、`release-checklist.md`；根 README 为文档入口
- **文档当前态重设计**：删除 `archive/`、`adr/`、`backlog`、`CONTEXT.md`；仅保留 4 份活文档；发布参与文档禁止含未完成规划/任务待办

## [1.2.2] - 2026-07-09

### 新增

- **原生菜单栏**：File / View / Search 子菜单，点击通过 `menu-action` 事件驱动前端操作

### 修复

- **Windows Release 控制台**：`windows_subsystem = "windows"`，打包后启动不再附带 Terminal 窗口
- **Release CI**：Linux deb/AppImage 扁平化上传，修复 GitHub Release 仅含 exe/dmg 的问题

### 文档

- 同步 `architecture.md`、ADR、路线图；阶段 3 规划文档归档

## [1.2.1] - 2026-07-09

### 新增

- **fs:scope 动态授权**：打开文件夹/文件时 invoke `grant_fs_scope`；`capabilities` 静态 allow 收窄为 `[]`
- **Rust 模块拆分**：`state/`、`commands/`、`search/`、`scope/` 替代 monolithic `lib.rs`
- **搜索增量协议**：`SearchProgress.newMatches` + 500 条上限；前端 `appendResults` 增量合并
- **HTML 白名单消毒**：`rehype-sanitize` + 自定义 schema（保留 `u/kbd/mark` 等排版标签）
- **Rust JSON 持久化**：`app_data/settings.json`；首次启动从 localStorage 迁移

### 变更

- CSP 补充 `object-src 'none'`、`base-uri 'none'`
- `ipc.store` 改调 Rust `get_setting` / `set_setting`（E2E mock 仍用 localStorage）

### 安全

- Rust command 层 `ensure_under_allowed_root` 纵深防御
- Markdown inline HTML 经 sanitize 白名单过滤（XSS 向量移除）

## [1.2.0] - 2026-07-09

### 修复

- **Open File 工作区**：无 workspace 时以文件父目录初始化 workspace，直接进入阅读界面
- **大纲点击跳转**：中文标题 id 生成、`markdownHeadings` 注入、滚动容器内定位（已验收）
- **Tauri 迁移补全**（`28b25ef`）：注册 fs/dialog/shell 插件与 capabilities；IPC 监听器、ContentSearch、滚动恢复等

### 新增

- **CLI 参数**：`-v` / `-h` 与启动时打开文件/目录路径
- **无扩展名 Markdown 文件**：设置中空行启用 README/LICENSE 等文件识别
- **内部链接增强**：支持 `.markdown` 扩展名与 `#anchor` 锚点跳转
- **加载错误态 UI**：文件读取失败时展示错误信息与重试按钮
- **大纲可视区域高亮**：滚动正文时 Outline 自动高亮当前节（scroll-spy）
- **大纲标题提取**：跳过围栏代码块内的伪 `# 标题` 行
- **欢迎页 Recent Files**：展示最近打开的文件列表，点击即可打开
- **搜索可取消**：`cancel_search` command + 前端 `searchId` 会话
- **搜索结果行号跳转**：点击匹配项打开文件并滚动到对应行
- **CI `tauri build --no-bundle`**：PR 验证 Tauri 编译与插件链接

### 变更

- CI 增加 `cargo check`
- 文档：路线图、E2E 策略（`docs/e2e-strategy.md`）、架构同步

## [1.1.1] - 2026-07-08

### 新增

- 设置项（忽略列表、扩展名）同步至 Rust 后端生效
- 文件类型图标（FileIcon）
- 快捷键自定义（ShortcutEditor）

### 修复

- CSP 安全策略配置
- E2E mermaid 测试 SVG 选择器精确化

## [1.0.3] - 2026-07-08

### 变更

- **框架迁移**：从 Electron 全面迁移至 Tauri 2
  - 后端从 Node.js 重写为 Rust（5 个核心 command）
  - 构建工具从 electron-vite 切换为 Vite + Tauri CLI
  - 打包工具从 electron-builder 切换为 Tauri bundler
  - IPC 从 ipcRenderer/ipcMain 切换为 Tauri invoke/emit
  - 持久化从 electron-store 切换为 localStorage
  - 对话框、文件系统、shell 改用 Tauri 官方插件
  - 快捷键从 Electron 菜单加速器改为纯前端 Hook

### 修复

- 移除 ci.yml 中与 packageManager 冲突的 pnpm version 9 声明

## [1.0.2] - 2026-07-07

### 新增

- CLI 参数解析器（`-v` 版本号 / `-h` 帮助）
- 文件树类型过滤：`markdownExtensions` 可配置 + `file-filter` 缓存层 + 设置面板编辑器
- 可拖拽面板分隔条：sidebarWidth / outlineWidth 持久化

### 修复

- 修复 E2E 预存测试失败（断言目标更新、删除过期用例）
- 面板分隔条点击区域和拖拽反馈改进

## [1.0.1] - 2026-06-29

### 修复

- 统一产品名称为 Markdown-Viewer，消除空格防止 Linux 安装路径问题
- 为 Linux/macOS 添加 artifactName 防止文件名含空格
- 为 electron-builder 构建步骤注入 GH_TOKEN 以解决 GitHub API 限流
- 添加 packageManager 字段以修复 pnpm/action-setup 版本检测
- 添加 Linux deb 打包配置和应用图标

## [1.0.0] - 2026-06-22

### 新增

- 完整 Markdown 渲染：GFM、KaTeX、Mermaid、highlight.js
- 多标签管理：切换、关闭、脏标记、惰性加载
- 文件树：递归浏览、隐藏文件标注、可配置忽略列表
- 双搜索：文件搜索 (Ctrl+P) + 全局内容搜索 (Ctrl+Shift+F)
- 大纲面板：标题层级导航 + 可视区域高亮
- 暗色/亮色主题，默认跟随系统
- 状态恢复：启动时恢复目录、已打开文件、滚动位置
- 文件监控：外部修改自动热更新
- 链接处理：内部 `.md` 链接应用内打开，外部链接系统浏览器
- `local-file://` 自定义协议加载本地图片
- 错误处理两层模型：纯函数自然抛出，边界层统一捕获
- 集中式 IPC 适配器 (`lib/ipc.ts`)
- React ErrorBoundary 组件
- 131 单元测试 + 29 E2E 测试
- CI/CD：GitHub Actions 构建（Windows + Linux）
