# ADR-0004: 本地图片加载协议

## 元数据
- **状态**：已采纳（Tauri：`asset://`）
- **日期**：2026-07-07（Electron）；2026-07-08（Tauri 评估）；2026-07-09（落地）
- **决策者**：AI agent + 用户

## 上下文

Markdown 含相对路径图片。浏览器禁止从 `http://` 页面直接加载 `file://` 资源。

## 历史（Electron）

曾采用自定义 `local-file://` + `protocol.handle`（Electron 代码已随迁移删除）。

## Tauri 决策

选择 **选项 D：`asset://localhost/`**（等价于 Tauri `convertFileSrc` 思路）。

- `MarkdownViewer.tsx` 将相对路径编码为 `asset://localhost/{encodedPath}`
- `tauri.conf.json` CSP 允许 `asset:`、`https://asset.localhost`
- 配合 **动态 fs:scope**（`grant_fs_scope`）授权图片所在目录

## 后果

- **正面**：框架原生方案；无需自研 URI scheme 处理器
- **负面**：路径含特殊字符需 `encodeURIComponent` 处理
- **不再使用**：`local-file://`、`csp: null`
