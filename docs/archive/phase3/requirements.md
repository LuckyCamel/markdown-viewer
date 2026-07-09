# 阶段 3 — 需求说明

> **已归档**（2026-07-09 实施完成，发布 v1.2.1）  
> 版本基线：1.2.0 → 实现版本 1.2.1  
> 关联：[design.md](design.md) · [tasks.md](tasks.md)

---

## 1. 背景与目标

阶段 0–2 已完成。阶段 3 聚焦安全加固、后端可维护性、搜索可扩展性。

### 1.1 非目标

- 不引入 WebDriver E2E
- 不做 UI 大改
- 不擅自变更产品 major 定位

---

## 2. 任务需求（均已实现）

| 编号 | 需求 | 实现 |
|------|------|------|
| 3.1 | rehype-raw XSS | rehype-sanitize + CSP（ADR-0007） |
| 3.2 | fs:scope 收窄 | 动态 `grant_fs_scope` + 路径校验 |
| 3.3 | 持久化升级 | Rust `settings.json` + localStorage 迁移 |
| 3.4 | Rust 模块拆分 | commands/state/search/scope |
| 3.5 | 搜索性能 | 增量 `newMatches`、500 条上限 |

---

## 3. 审批门禁（历史记录）

| 门禁 | 状态 |
|------|------|
| G1 需求 | ✅ 已通过 |
| G2 设计 | ✅ 已通过 |
| G3 任务 | ✅ 已通过 |
| G4 plugin-store | 未采用（方案 C 自建 store） |
| G5 HTML 策略 | 方案 B sanitize |

---

## 4. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-09 | 归档：实施完成 |
| 2026-07-09 | 初版 |
