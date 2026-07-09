# 项目演进史

> 最后更新：2026-07-09  
> 当前版本：**1.2.2**

活架构见 [architecture.md](../architecture.md)；版本变更明细见 [CHANGELOG.md](../../CHANGELOG.md)。

---

## 里程碑

| 阶段 | 版本 | 要点 |
|------|------|------|
| 0 发布前验证 | 1.1.2 | Open File 工作区、冒烟、文档同步 |
| 1 CI 加固 | 1.1.x | tauri build CI、搜索可取消、E2E 策略 |
| 2 功能补全 | 1.2.0 | 大纲 scroll-spy、Recent Files、CLI、链接增强、错误态 UI |
| 3 架构与安全 | 1.2.1 | scope 收窄、sanitize、Rust store、搜索增量、模块拆分 |
| 3+ 体验 | 1.2.2 | 原生菜单、Windows 无控制台、Release 多平台包 |

阶段 0–3 **均已完成**。阶段 3 规划文档见 [phase3/](phase3/)。

---

## 架构演进

### Electron 时代 (2026-06-20 ~ 2026-07-07)

- App.tsx 拆分；集中式 IPC；错误处理硬化；CLI；文件树过滤；可拖拽面板；CI/CD

### Tauri 迁移 (2026-07-08)

- Electron → Tauri 2；Rust 后端；plugin-fs/dialog/shell；快捷键 Hook；mermaid 保留

### 阶段 3 安全与架构加固 (2026-07-09, v1.2.1)

- Rust 模块化；fs:scope 动态授权；搜索增量协议；rehype-sanitize；Rust `settings.json` 持久化

### v1.2.2 体验修补

- 原生菜单栏（File / View / Search）+ 键盘快捷键并存
- Windows Release 去除附带控制台窗口

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-09 | 从 `CONTEXT.md` 与 `roadmap.md` 合并迁入 |
