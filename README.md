# Markdown Viewer

> 当前版本：**1.2.3**

跨平台 Tauri 桌面应用，以工作区方式浏览和渲染 Markdown 文件。

## 功能特性

GFM 渲染、KaTeX、Mermaid、多标签、文件树、全文搜索、大纲导航、主题切换、状态恢复、原生菜单等。  
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

更多命令、测试策略与发布流程见 [docs/development.md](docs/development.md)。

## 项目结构

```
src-tauri/            # Tauri 后端（Rust）
  src/main.rs         # 进程入口（CLI、windows_subsystem）
  src/lib.rs          # 应用入口：插件、State、command 注册
  src/menu.rs         # 原生菜单
  src/commands/       # invoke command
  src/state/          # 共享 State
  src/search/         # 搜索遍历与匹配
  src/scope/          # fs:scope 动态授权
  Cargo.toml
  tauri.conf.json
  capabilities/
src/
  renderer/           # 渲染进程：React UI
    features/         # 功能模块（file-tree, tabs, markdown-viewer, outline, search, settings, welcome）
    hooks/            # 文件监控、键盘快捷键、原生菜单、滚动恢复、工作区初始化
    stores/           # 全局 UI 状态（useUIStore）
    lib/              # 集中式 IPC 适配器（封装 Tauri invoke/API）
    components/       # 通用组件（ErrorBoundary, ThemeProvider, Layout）
  shared/             # 共享类型定义
```

## 文档

| 读者 | 文档 | 说明 |
|------|------|------|
| 用户 / 新贡献者 | [product.md](docs/product.md) | 功能、快捷键、平台 |
| 日常开发者 | [development.md](docs/development.md) + [architecture.md](docs/architecture.md) | 开发与架构 |
| 发布负责人 | [release-checklist.md](docs/release-checklist.md) + [CHANGELOG.md](CHANGELOG.md) | 冒烟与版本记录 |
| AI Agent | [AGENTS.md](AGENTS.md) | 代码约束 |

## 许可

私有项目
