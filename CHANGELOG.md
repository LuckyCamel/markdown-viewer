# Changelog

本文件记录 Markdown Viewer 各版本的变更摘要。

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
