# Markdown Viewer — V1 规格说明书

## 技术栈

| 层 | 选型 |
|---|------|
| 桌面框架 | Electron |
| 构建工具 | electron-vite |
| 打包工具 | electron-builder（Windows/macOS/Linux 三平台） |
| 前端框架 | React + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| 状态管理 | zustand |
| Markdown 渲染 | react-markdown + remark-gfm + remark-math + rehype-katex + rehype-highlight |
| Mermaid 图表 | mermaid（动态 import，首次使用后常驻内存） |
| 代码高亮 | highlight.js（190+ 语言自动识别） |
| IPC 通信 | preload + contextBridge + ipcRenderer.invoke / ipcMain.handle |
| 本地资源 | 自定义 protocol `local-file://` |
| 持久化 | electron-store |

---

## V1 功能清单

### 文件树
- 递归 React 组件自研
- 默认显示所有文件（包括隐藏文件/目录）
- 隐藏文件/目录（`.` 开头）灰色显示，普通文件/目录正常色
- 忽略列表：默认忽略 `.git`、`node_modules`、`__pycache__`、`.DS_Store`，可通过设置编辑
- 一个目录下无支持的扩展名文件 → 不可展开下级（只显示目录名称，灰色）
- 支持的扩展名：`.md`（及 .md 内链的其他文本类型，如 .markdown）

### 多标签管理
- 顶部标签栏，每个打开的文件一个标签
- 点击标签切换激活文件
- 可关闭标签（鼠标中键 / 关闭按钮）
- 标签脏标记：外部修改文件后短暂显示「已刷新」
- zustand 管理 `openFiles` + `activeFileId`
- 文件内容惰性加载（切换到标签时才渲染）

### Markdown 渲染
- GFM 全套：表格、任务列表 `- [ ]`、删除线 `~~`、脚注、自动链接
- 数学公式：KaTeX，支持行内 `$...$` 和块级 `$$...$$`
- Mermaid 图表：` ```mermaid ` 代码块拦截，用 mermaid.run() 渲染
- 代码块：highlight.js 自动语言检测 + 高亮
- 大纲面板：右侧显示当前文件标题层级（H1-H6），点击跳转，当前可视标题高亮

### 搜索
- 文件搜索：Ctrl+P，按文件名搜索并打开
- 全局内容搜索：Ctrl+Shift+F，主进程异步搜索 + 结果流式推送到渲染进程，渐进显示
- 文件名匹配先出，内容匹配后出

### 主题
- 暗色/亮色双主题
- 默认跟随系统 `prefers-color-scheme`
- 手动切换覆盖
- 代码高亮主题同步切换（github / github-dark）

### 历史记录 & 状态恢复
- 最近打开文件列表（欢迎页 / 菜单中显示）
- 最近访问目录列表
- 每个文件的阅读位置（滚动位置）
- 启动时一键恢复完整阅读状态：上次目录 + 所有已打开文件 + 各文件滚动位置

### 文件监控
- `fs.watch` 监控所有已打开文件
- 外部修改后自动热更新渲染内容
- 刷新后保持当前滚动位置

### 链接处理
- 内部 `.md` 链接 → 新标签页打开（在当前应用内）
- 外部链接（https://）→ 系统默认浏览器打开

### 图片处理
- `local-file://` 自定义 protocol
- 渲染时相对路径 → 绝对路径 → `local-file://` 协议加载
- 主进程注册 protocol 处理程序

### 键盘快捷键
| 快捷键 | 功能 |
|--------|------|
| Ctrl+P | 文件搜索 |
| Ctrl+Shift+F | 全局内容搜索 |
| Ctrl+B | 切换文件树显示 |
| Ctrl+T | 切换大纲面板 |
| Ctrl+W | 关闭当前标签 |
| Ctrl+Tab | 下一个标签 |
| Ctrl+Shift+Tab | 上一个标签 |
| Ctrl+, | 打开设置 |

### 配置持久化
- electron-store 存储所有用户设置
- 窗口大小/位置
- 主题偏好
- 忽略列表
- 历史记录（最近文件、最近目录、阅读位置）

### 窗口管理
- 单窗口
- 启动时恢复上次窗口位置/大小

---

## V2 预留

- 分屏预览（左右/上下拆分）
- 文件图标集（精细文件类型图标）
- 快捷键自定义 JSON 配置
- 弹出独立预览窗口（多屏场景）
