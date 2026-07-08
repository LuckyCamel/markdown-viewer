# Changelog

本文件记录 Markdown Viewer 各版本的变更摘要。

## [Unreleased]

### 修复

- **Open File 工作区**：无 workspace 时以文件父目录初始化 workspace，直接进入阅读界面
- **大纲点击跳转**：中文标题 id 生成、`markdownHeadings` 注入、滚动容器内定位（已验收）
- **Tauri 迁移补全**（`28b25ef`）：注册 fs/dialog/shell 插件与 capabilities；IPC 监听器、ContentSearch、滚动恢复等

### 新增

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
