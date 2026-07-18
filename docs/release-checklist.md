# 发布前冒烟清单

发布前建议在**真实 Tauri 打包环境**过一遍（mock E2E 无法覆盖 scope、Rust store、原生菜单等）。

---

## 手工冒烟

| 场景 | 操作 | 预期 |
|------|------|------|
| 打开目录 | Welcome / 菜单 Open Folder | 文件树加载 |
| 打开单文件 | Welcome / 菜单 Open File | 进入阅读，父目录为 workspace |
| 视图模式切换 | Ctrl+Shift+S / Tab 栏 read/edit 按钮 | 阅读与编辑二态切换，按标签记忆 |
| 全文搜索 | Ctrl+Shift+F | 增量进度，可跳转，超 500 条有提示 |
| 文件搜索 | Ctrl+P | 列出 Markdown |
| 外部修改（saved） | 编辑器改磁盘文件 | 热更新，内容静默重载 |
| 外部修改（dirty） | 编辑时外部改盘 | 显示冲突横幅，可选加载磁盘/保留我的 |
| 路径补全 | 编辑模式下输入 `[[` / `./` / `![](` / `](` | 弹出文件路径补全列表，可模糊匹配 |
| 路径补全选择 | 点击补全候选项 | 插入对应格式（`[label](./path)` 等） |
| 滚动恢复 | 切换标签 | 位置恢复 |
| 大纲跳转 | 点击 Outline | 滚动到标题 |
| 本地图片 | 相对路径图片 | 正常显示 |
| 外部链接 | http 链接 | 系统浏览器 |
| 设置同步 | 修改忽略列表 | 文件树刷新 |
| 原生菜单 | File / View / Search | 与快捷键等效 |
| Windows 启动 | 双击 exe | 无附带控制台窗口 |

---

## Release 资产检查

| 检查项 | 预期 |
|--------|------|
| Windows 安装包 | GitHub Release 含 `.exe` |
| macOS 安装包 | GitHub Release 含 `.dmg` |
| Linux 安装包 | GitHub Release 含 `.deb` |
| 版本记录 | [`CHANGELOG.md`](../CHANGELOG.md) 已归档对应版本条目 |
