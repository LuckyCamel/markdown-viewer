# 阶段 3 — 设计方案（归档摘要）

> **已归档**（2026-07-09 实施完成，发布 v1.2.1）  
> 关联：[requirements.md](requirements.md) · [tasks.md](tasks.md)

实现细节以 [architecture.md](../../architecture.md)、[ADR-0007](../../adr/0007-html-sanitization.md) 与代码为准。  
完整规划期原文已移除；关键决策如下。

---

## 已采纳决策

| ID | 决策 |
|----|------|
| D1 HTML | **B+C**：rehype-sanitize 白名单 + CSP 收紧（`object-src 'none'`、`base-uri 'none'`） |
| D2 持久化 | **C**：自建 Rust JSON store（`app_data/settings.json`），首次从 localStorage 迁移 |
| D3 搜索上限 | **500** 条；增量 `SearchProgress.newMatches` 协议 |
| D4 版本 | 阶段 3 → **1.2.1** patch |

## 实施顺序

```
3.4 Rust 拆分 → 3.2 fs:scope → 3.5 搜索增量 → 3.1 HTML 安全 → 3.3 持久化
```

| 切片 | 任务 | 状态 |
|------|------|------|
| S1 | 3.4 Rust 模块拆分（commands/state/search/scope） | ✅ |
| S2 | 3.2 fs:scope 动态授权 + 路径校验 | ✅ |
| S3 | 3.5 搜索增量协议 | ✅ |
| S4 | 3.1 rehype-sanitize + schema | ✅ |
| S5 | 3.3 Rust JSON store | ✅ |

## 各任务要点

### 3.1 HTML 安全

- 插件顺序：`rehypeRaw` → `rehypeSanitize(schema)` → `rehypeHeadingIds` → …
- 允许排版类 `u, em, strong, kbd, sub, sup, mark`；禁止 `script, iframe, on*` 等

### 3.2 fs:scope

- 静态 `capabilities` allow 收窄为 `[]`；打开目录/文件时 invoke `grant_fs_scope`
- command 层 `ensure_under_allowed_root` 纵深防御

### 3.3 持久化

- 未采用 `plugin-store`（G4）；Rust 自建 `get_setting` / `set_setting`

### 3.4 Rust 拆分

- `lib.rs` 保留插件注册与 handler 聚合；业务逻辑迁入子模块

### 3.5 搜索

- 前端 `appendResults` 增量合并；超 500 条提示截断

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-09 | 压缩为摘要版（原 295 行规划正文已移除） |
| 2026-07-09 | 实施完成 |
