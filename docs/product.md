# 产品说明

> 当前版本：**1.4.5**

打开文件夹就能流畅读、偶尔改的轻量 Markdown 阅读器与编辑器。

---

## 功能清单

| 类别 | 功能 |
|------|------|
| 渲染 | GFM 全套、KaTeX 数学、Mermaid 图表、highlight.js 代码高亮 |
| 编辑 | CodeMirror 6 编辑器、Markdown 语法高亮、工具栏命令、自动保存、冲突检测、统一编辑会话状态机 |
| 路径补全 | 输入 `[[`、`./`、`![](`、`](` 触发文件路径补全，支持模糊匹配与目录导航 |
| 浏览 | 递归文件树、隐藏文件灰色标注、可配置忽略列表与 Markdown 扩展名 |
| 标签 | 多标签切换/关闭、脏标记、惰性加载 |
| 搜索 | 文件搜索 (Ctrl+P)、全局内容搜索 (Ctrl+Shift+F)、编辑器内查找替换 (Ctrl+F) |
| 大纲 | 标题层级导航、点击跳转、scroll-spy 可视区域高亮、折叠/展开、锚点复制 |
| 主题 | 暗色/亮色/跟随系统 + 6 套内置主题配色 |
| 阅读 | 字体大小调整（12-24px）、行高调整（1.0-2.5）、页宽限制、字体选择 |
| 布局 | 侧边栏与大纲面板可拖拽调节宽度，持久化 |
| 状态 | 启动恢复目录、已打开文件、滚动位置 |
| 监控 | 外部修改自动热更新、编辑时冲突检测 |
| 链接 | 内部 `.md` 应用内打开；外部链接系统浏览器 |
| 设置 | 主题、忽略列表、Markdown 扩展名、快捷键自定义、语言切换 |
| 菜单 | 原生菜单栏 File / View / Search，与快捷键并存 |
| CLI | `-v` / `-h`；启动时打开文件或目录路径 |
| 文件操作 | 新建文件/文件夹、重命名、删除到回收站 |
| 收藏 | 收藏夹管理、拖拽排序 |
| 多工作区 | 添加多个根目录、最近工作区列表 |

---

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl+Shift+O | 打开文件夹 |
| Ctrl+P | 文件搜索 |
| Ctrl+Shift+F | 全局内容搜索 |
| Ctrl+B | 切换侧边栏 |
| Ctrl+Shift+L | 切换大纲面板 |
| Ctrl+W | 关闭当前标签 |
| Ctrl+Tab | 下一个标签 |
| Ctrl+Shift+Tab | 上一个标签 |
| Ctrl+, | 打开设置 |
| Ctrl+Shift+S | 切换视图模式（阅读 / 编辑） |
| Ctrl+Shift+P | 唤起命令面板 |
| Ctrl+S | 保存文件（编辑模式） |
| Ctrl+F | 编辑器内查找替换（编辑模式） |
| Ctrl+D | 选择下一个匹配（编辑模式·多光标） |

快捷键可在设置面板自定义（`ShortcutEditor`）。实现见 `useKeyboardShortcuts`。

---

## 原生菜单

| 菜单 | 项 | 等效快捷键 |
|------|-----|------------|
| File | Open Folder… | Ctrl+Shift+O |
| File | Open File… | — |
| File | Close Tab | Ctrl+W |
| File | Settings… | Ctrl+, |
| View | Toggle Sidebar | Ctrl+B |
| View | Toggle Outline | Ctrl+Shift+L |
| Search | Find File… | Ctrl+P |
| Search | Find in Files… | Ctrl+Shift+F |

---

## 支持平台与安装包

| 平台 | 格式 |
|------|------|
| Windows | NSIS `.exe` |
| macOS | `.dmg` |
| Linux | `.deb` |

Release 由推送 `v*` tag 触发，详见 [development.md](development.md#发布流程)。

---

## Inline HTML

Markdown 经 `rehype-raw` 解析后由 `rehype-sanitize` 白名单过滤，仅保留排版类标签（如 `u`、`kbd`、`mark`）。

---

## 非目标

- **无分屏预览**：Edit 模式为纯代码编辑，不提供实时渲染预览
- **无独立预览窗口**
