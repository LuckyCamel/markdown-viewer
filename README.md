# Markdown-Viewer

> 当前版本：**1.4.8**

打开文件夹读文档、顺带看源码的轻量 Markdown 阅读器与代码伴读器。

## 功能特性

GFM 渲染、KaTeX、Mermaid、多标签、文件树（按需懒加载子目录）、全文搜索、大纲导航、主题切换、状态恢复、原生菜单、阅读设置（字体大小/行高/页宽）、6 套内置主题、命令面板（Ctrl+Shift+P，能力过滤）、HTML/PDF 导出、每日笔记、多工作区、Markdown 编辑器（Edit 模式）、编辑时预览面板（TabBar 按钮一键切换）、保存并返回阅读、自动保存、冲突检测、查找替换、多光标编辑、**代码伴读**（25+ 语言语法高亮、行号显示、搜索行定位与高亮）、大文档分片渲染（> 1000 行首屏 200 行 + 滚动追加）、大文件守护（超阈值提示 / 二进制拒绝）等。
**完整功能清单、快捷键与平台支持**见 [docs/product.md](docs/product.md)。

## 技术栈

Tauri 2 · Rust · React 19 · TypeScript · zustand · Tailwind CSS · Vite

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式（启动 Tauri dev）
pnpm tauri dev

# 类型检查
pnpm typecheck

# 单元测试
pnpm test

# 构建
pnpm build

# 打包（生成安装包）
pnpm tauri build
```

更多命令、测试策略与发布流程见 [AGENTS.md](AGENTS.md)。

## 项目结构

```
src-tauri/            # Tauri 后端（Rust）
  src/main.rs         # 进程入口（CLI、windows_subsystem）
  src/lib.rs          # 应用入口：插件、State、command 注册
  src/menu.rs         # 原生菜单
  src/commands/       # invoke command
  src/state/          # 共享 State（WatcherState、LaunchState、StoreState）
  src/search/         # 搜索遍历、匹配、SearchSession 编排与取消
  src/filesystem/     # 文件 CRUD 与 FileEntry 统一入口
  src/workspace/      # 工作区授权根 Module（plugin-fs scope + allowed_roots）
  src/filters.rs      # 文件过滤（ignore_list / markdown_extensions，从 StoreState 实时读取）
  Cargo.toml
  tauri.conf.json
  capabilities/
src/
  renderer/           # 渲染进程：React UI
    features/         # 功能模块（file-tree, tabs, markdown-viewer, outline, search, settings, welcome）
    hooks/            # 文件监控、键盘快捷键、原生菜单、滚动恢复
    stores/           # 全局 UI 状态（useThemeStore、useLayoutStore、useNavigationStore、useWorkspaceStore）
    lib/              # 集中式 IPC 适配器（封装 Tauri invoke/API）
    components/       # 通用组件（ErrorBoundary, ThemeProvider, Layout）
  shared/             # 共享类型定义
```

## 文档

| 读者            | 文档                                                                             | 说明               |
| --------------- | -------------------------------------------------------------------------------- | ------------------ |
| 用户 / 新贡献者 | [product.md](docs/product.md)                                                    | 功能、快捷键、平台 |
| 日常开发者      | [AGENTS.md](AGENTS.md) + [architecture.md](docs/architecture.md)                 | 开发与架构         |
| 发布负责人      | [release-checklist.md](docs/release-checklist.md) + [CHANGELOG.md](CHANGELOG.md) | 冒烟与版本记录     |
| AI Agent        | [AGENTS.md](AGENTS.md)                                                           | 代码约束           |

## 许可

私有项目
