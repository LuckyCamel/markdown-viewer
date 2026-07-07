# Markdown Viewer

跨平台 Tauri 桌面应用，以工作区方式浏览和渲染 Markdown 文件。

## 功能特性

- **GFM 全套渲染**：表格、任务列表、删除线、脚注、自动链接
- **数学公式**：KaTeX 行内 `$...$` 和块级 `$$...$$`
- **Mermaid 图表**：动态加载，首次使用后常驻内存
- **代码高亮**：highlight.js 按需注册 15 种常见语言
- **多标签管理**：标签切换、关闭、脏标记、惰性加载
- **文件树**：递归目录浏览、隐藏文件灰色标注、可配置忽略列表 + Markdown 扩展名过滤
- **搜索**：文件搜索 (Ctrl+P) + 全局内容搜索 (Ctrl+Shift+F)
- **大纲面板**：标题层级导航 + 可视区域高亮
- **主题**：暗色/亮色/跟随系统，system 模式下监听 OS 主题变化
- **可拖拽面板**：侧边栏与大纲面板宽度可拖拽调节，持久化存储
- **状态恢复**：启动时恢复上次目录、已打开文件、滚动位置
- **文件监控**：外部修改自动热更新，保持滚动位置
- **链接处理**：内部 `.md` 链接应用内打开，外部链接系统浏览器
- **设置面板**：主题切换、忽略列表编辑、Markdown 扩展名配置
- **键盘快捷键**：替代原生菜单，Ctrl+B 侧边栏、Ctrl+P 搜索、Ctrl+, 设置等

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

## 项目结构

```
src-tauri/            # Tauri 后端（Rust）
  src/main.rs         # 后端入口：文件操作、搜索、文件监听
  Cargo.toml          # Rust 依赖
  tauri.conf.json     # Tauri 配置（窗口、打包等）
  capabilities/       # 权限配置
src/
  renderer/           # 渲染进程：React UI
    features/         # 功能模块（file-tree, tabs, markdown-viewer, outline, search, settings, welcome）
    hooks/            # 自定义 hook（文件监控、键盘快捷键、滚动恢复、工作区初始化）
    stores/           # 全局 UI 状态（useUIStore）
    lib/              # 集中式 IPC 适配器（封装 Tauri invoke/API）
    components/       # 通用组件（ErrorBoundary, ThemeProvider, Layout）
  shared/             # 共享类型定义
```

## 文档

- [架构总览](docs/architecture.md)
- [V1 规格说明书](docs/spec-v1.md)
- [架构决策记录 (ADR)](docs/adr/)

## 许可

私有项目
