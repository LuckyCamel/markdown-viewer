# 发布前冒烟清单

> 最后更新：2026-07-09

发布前建议在**真实 Tauri 打包环境**过一遍（mock E2E 无法覆盖 scope、store、原生菜单等）。

---

## 手工冒烟

| 场景 | 操作 | 预期 |
|------|------|------|
| 打开目录 | Welcome / 菜单 Open Folder | 文件树加载 |
| 打开单文件 | Welcome / 菜单 Open File | 进入阅读，父目录为 workspace |
| 全文搜索 | Ctrl+Shift+F | 增量进度，可跳转，超 500 条有提示 |
| 文件搜索 | Ctrl+P | 列出 Markdown |
| 外部修改 | 编辑器改磁盘文件 | 热更新 |
| 滚动恢复 | 切换标签 | 位置恢复 |
| 大纲跳转 | 点击 Outline | 滚动到标题 |
| 本地图片 | 相对路径图片 | 正常显示 |
| 外部链接 | http 链接 | 系统浏览器 |
| 设置同步 | 修改忽略列表 | 文件树刷新 |
| 原生菜单 | File / View / Search | 与快捷键等效 |
| Windows 启动 | 双击 exe | 无附带控制台窗口（v1.2.2+） |

---

## Release 资产检查

- [ ] GitHub Release 页面含 Windows `.exe`
- [ ] GitHub Release 页面含 macOS `.dmg`
- [ ] GitHub Release 页面含 Linux `.deb` 与 AppImage
- [ ] [`CHANGELOG.md`](../CHANGELOG.md) 已归档对应版本条目

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-09 | 从 `roadmap.md` 拆分 |
