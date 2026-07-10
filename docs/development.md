# 开发指南

---

## 本地开发命令

```bash
pnpm install          # 安装依赖
pnpm tauri dev        # 开发模式
pnpm typecheck        # TypeScript 类型检查（tsc --noEmit --skipLibCheck）
pnpm test             # Vitest 单元测试
pnpm build            # 前端构建
pnpm tauri build      # 打包安装包
```

Rust 检查（在 `src-tauri/` 目录）：

```bash
cargo check
cargo test
```

与 [`AGENTS.md`](../AGENTS.md) 约束一致：不擅自变更版本号、不引入新依赖（`rehype-sanitize` 为已批准例外）。

---

## 测试金字塔

| 层级 | 工具 | 覆盖范围 |
|------|------|----------|
| 单元测试 | Vitest | store、hook、组件逻辑 |
| E2E（mock IPC） | Playwright | UI 交互、渲染、路由 |
| 集成测试 | 无 | Tauri command、插件权限、文件系统 |
| 打包验证 | CI `tauri build --no-bundle` + Release workflow | 三平台编译与安装包 |

### E2E 策略

E2E 基于 **Playwright + Vite dev server**，通过 `page.route` 将 `ipc.ts` 替换为 `ipc.mock.ts`，**不经过真实 Tauri IPC**。

mock IPC E2E 作为 PR 快速回归层：

- 运行快，无 GUI driver 依赖
- 覆盖文件树、标签、搜索面板、主题、Markdown 渲染等
- 与 `cargo check`、vitest、`tauri build` 互补

**发布前**：人工过 [release-checklist.md](release-checklist.md)；真实 Tauri 环境验证 scope、Rust store、原生菜单等。

### mock IPC 维护规则

1. `ipc.ts` 新增接口时，**同步** `ipc.mock.ts`（含 `grantFsScope`、`store` invoke 等）
2. E2E `window.__E2E__` 变更时，同步 `e2e/utils.ts`
3. Rust-only 行为不放 mock E2E，用 vitest 覆盖

### 相关文件

- `e2e/` — Playwright 用例
- `src/renderer/lib/ipc.mock.ts`
- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`

---

## 发布流程

1. 更新版本号（**须用户明确许可**，见 `AGENTS.md`）
2. 更新 [`CHANGELOG.md`](../CHANGELOG.md) `[Unreleased]` 条目
3. commit 并 push 到 `main`
4. **打 tag `v*`**（如 `v1.2.3`）并 push — 触发 [`.github/workflows/release.yml`](../.github/workflows/release.yml)
5. 按 [release-checklist.md](release-checklist.md) 手工冒烟
6. 确认 GitHub Release 含各平台安装包（Windows exe、macOS dmg、Linux deb/AppImage）

> **注意**：仅 push main **不会**触发 Release；必须 push `v*` tag。

---

## 错误处理

边界层统一捕获，使用 `logError('模块名:子操作', err)` 格式记录。详见 [architecture.md](architecture.md) §5.1。
