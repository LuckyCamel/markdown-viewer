## Constraints

- **工作语言：中文**。所有技术产出（规约、注释、提交信息、报告）默认使用中文。代码标识符、类型名、文件名保持英文。
- `docs/` 目录纳入 Git 追踪；文档导航见根目录 [README.md#文档](README.md#文档)
- **发布洁净**：参与 GitHub 发布的文档（README、CHANGELOG、AGENTS、docs/）每次 commit 不得含未完成规划、任务墙（`- [ ]`）或待办信息
- 不引入新依赖（**例外**：已批准 `rehype-sanitize`、CodeMirror 6 相关包）
- **版本号规范**：未经用户明确许可不得变更版本号。左侧第一位（major）：软件定位发生变化时变更；中间位（minor）：主要功能新增或架构大幅调整时变更；右侧位（patch）：功能细节变更、debug、依赖版本变更时变更
- 不引入 `Result<T,E>` 类型或统一 Error 类

### 文档目录职责划分

| 目录            | 职责                                                                               | 是否纳入 Git |
| --------------- | ---------------------------------------------------------------------------------- | ------------ |
| `docs/`         | 发布面文档：面向用户/贡献者的产品说明、开发指南、架构文档、发布清单                | ✅ 纳入      |
| `.dev-process/` | 开发过程文档：迭代指南、功能设计、技术方案、执行计划、阶段性报告、路线图、架构评审 | ❌ 不纳入    |

- `docs/` 仅允许放置面向外部读者的发布面文档，**不允许**放置开发过程性文档（路线图、设计方案、架构评审、执行计划等）
- 开发过程性文档必须归档到 `.dev-process/` 目录下统一管理

### 发布面文档引用规则

- 发布面文档（`README.md`、`CHANGELOG.md`、`AGENTS.md`、`docs/` 目录下所有文件）**不允许**包含指向 `.dev-process/` 目录的链接
- `.dev-process/` 目录不纳入 Git 管理，发布版本中不存在该目录，引用会导致断开的链接

### 文档一致性原则

- 文档与实际代码**必须保持完全一致**
- 若实际执行中发现设计 / 技术方案存在错误 / 失误 / 遗漏，**必须回更正**对应文档
- 不允许"代码已改但文档未同步"的状态进入发布

### 错误处理规则

- 边界层统一捕获，使用 `logError('模块名:子操作', err)` 格式记录
- 详见 [docs/architecture.md](docs/architecture.md)

## 开发命令

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

## 测试规范

### TDD 开发方式

- 按 **TDD 方式**执行开发：先写测试用例，再写实现代码
- 测试用例应覆盖正常路径、边界条件、异常场景

### 测试验证五项

每次提交前必须通过以下五项验证：

| 验证项    | 命令                                    | 说明                                 |
| --------- | --------------------------------------- | ------------------------------------ |
| 单元测试  | `pnpm vitest run`                       | 渲染进程测试                         |
| 类型检查  | `pnpm tsc --noEmit --skipLibCheck`      | TypeScript 类型检查                  |
| Lint 检查 | `pnpm lint`                             | ESLint 代码规范检查                  |
| Rust 检查 | `cargo check`（在 `src-tauri/` 目录下） | Rust 编译检查                        |
| E2E 测试  | `pnpm test:e2e`                         | Playwright 端到端测试（UI 交互验证） |

> 单元测试、类型检查、Lint、Rust 检查是每次提交的必选项。
> E2E 测试在以下情况**必须运行**：
>
> - 涉及 UI 交互、状态管理、组件集成的变更
> - 阶段/批次功能完成后的验收验证
> - 发布前的最终验证

### 测试金字塔

| 层级            | 工具                                            | 覆盖范围                          |
| --------------- | ----------------------------------------------- | --------------------------------- |
| 单元测试        | Vitest                                          | store、hook、组件逻辑             |
| E2E（mock IPC） | Playwright                                      | UI 交互、渲染、路由               |
| 集成测试        | 无                                              | Tauri command、插件权限、文件系统 |
| 打包验证        | CI `tauri build --no-bundle` + Release workflow | 三平台编译与安装包                |

### E2E 策略

E2E 基于 **Playwright + Vite dev server**，通过 `page.route` 将 `ipc.ts` 替换为 `ipc.mock.ts`，**不经过真实 Tauri IPC**。

mock IPC E2E 作为 PR 快速回归层：

- 运行快，无 GUI driver 依赖
- 覆盖文件树、标签、搜索面板、主题、Markdown 渲染等
- 与 `cargo check`、vitest、`tauri build` 互补

**发布前**：人工过 [docs/release-checklist.md](docs/release-checklist.md)；真实 Tauri 环境验证 scope、Rust store、原生菜单等。

### mock IPC 维护规则

1. `ipc.ts` 新增接口时，**同步** `ipc.mock.ts`（含 `grantFsScope`、`store` invoke 等）
2. E2E `window.__E2E__` 变更时，同步 `e2e/utils.ts`
3. Rust-only 行为不放 mock E2E，用 vitest 覆盖

### 测试相关文件

- `e2e/` — Playwright 用例
- `src/renderer/lib/ipc.mock.ts`
- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`

## 工作流查询（gh CLI）

使用 GitHub CLI（`gh`）查询远端工作流状态与日志：

```bash
# 查看最近工作流运行列表
gh run list

# 查看特定工作流运行详情
gh run view <run-id>

# 查看工作流日志
gh run view <run-id> --log

# 查看指定步骤的日志
gh run view <run-id> --log --job <job-id>

# 重新运行失败的工作流
gh run rerun <run-id>

# 取消正在运行的工作流
gh run cancel <run-id>
```

> **注意**：`run-id` 可从 `gh run list` 输出中获取，格式为数字（如 `76`）。

## 发布流程

### 发布步骤

1. 更新版本号（**须用户明确许可**，见上方「版本号规范」）
2. 更新 [CHANGELOG.md](CHANGELOG.md) `[Unreleased]` 条目
3. commit 并 push 到 `main`
4. **打 tag `v*`**（如 `v1.2.3`）并 push — 触发 [.github/workflows/release.yml](.github/workflows/release.yml)
5. 按 [docs/release-checklist.md](docs/release-checklist.md) 手工冒烟
6. 确认 GitHub Release 含各平台安装包（Windows exe、macOS dmg、Linux deb）

> **注意**：仅 push main **不会**触发 Release；必须 push `v*` tag。

### Push 前强制校验（4 项）

push 到远端前，**必须**逐项执行以下校验：

1. **任务清单校验**：逐项 check 执行计划中载明的任务是否全部完成
2. **设计实现校验**：逐项 check 是否严格实现了功能设计和技术方案的要求
3. **文档回更校验**：若实际执行与文档存在偏差，必须先更正对应文档，再 push 代码
4. **发布洁净校验**：参与 GitHub 发布的文档（README、CHANGELOG、AGENTS、docs/）不得含未完成规划、任务墙（`- [ ]`）或待办信息

### 工作流触发与状态回收

- **tag 触发联动**：推送 tag（`vX.Y.Z`）时必须同时触发 CI 工作流和 Release 工作流；若仅有 CI 而无 Release，需检查 workflow 配置是否正确
- **状态回收义务**：推送后必须确认 CI 和 Release 两个工作流的最终状态（`completed` + `conclusion`）
  - 延迟回收机制：推送后等待 60s 首次查询；若状态为 `in_progress`，每隔 60s 轮询一次，最多轮询 10 次（总等待 ≤ 10 分钟）
  - 若工作流报错（`conclusion = failure`），必须读取日志定位错误，继续修改代码并重新推送，直至两个工作流均为 `success`
- 工作流状态查询见上方「工作流查询（gh CLI）」章节

### 发布 commit message 规范

发布 commit 的 message 必须包含从上一版本 tag 到当前版本之间的全部变更摘要：

```
release: vX.Y.Z

自 vX.Y.Z-1 以来的更新：
- xxx 模块新增 xxx 功能
- 修复 xxx 问题
- xxx 性能优化
```

## Key Files

- `src/renderer/logger.ts` — 统一日志入口
- `src-tauri/src/main.rs` — 进程入口（CLI 解析、`windows_subsystem`）
- `src-tauri/src/lib.rs` — Tauri 应用入口：插件、State、command 注册
- `src-tauri/src/menu.rs` — 原生菜单与 `menu-action` 事件
- `src-tauri/src/commands/` — invoke command 实现
- `src-tauri/tauri.conf.json` — Tauri 配置（窗口、CSP、打包）
- `src-tauri/Cargo.toml` — Rust 依赖管理
- `src/renderer/main.tsx` — 渲染进程入口
- `src/renderer/components/ErrorBoundary.tsx` — React 错误边界
- `src/renderer/components/ThemeProvider.tsx` — 主题与阅读设置注入
- `src/renderer/components/StatusBar.tsx` — 状态栏（阅读 / 编辑 / 源码伴读、保存状态）
- `src/renderer/lib/ipc.ts` — 前端 IPC 适配器（封装 Tauri API）
- `src/renderer/lib/surface.ts` — DocumentSurface Module（文件渲染策略与能力判断）
- `src/renderer/lib/fileSizeGuard.ts` — FileSizeGuard 模块（大文件守护纯函数：阈值判断 + 二进制拒绝）
- `src/renderer/features/markdown-viewer/useChunkedContent.ts` — 大文档分片渲染 hook（首屏 N 行 + IntersectionObserver 追加）
- `src/renderer/lib/themes.ts` — 主题定义与解析（6 套内置主题）
- `src/renderer/lib/fonts.ts` — 系统字体选择列表
- `src/renderer/styles/themes.css` — 主题 CSS 变量
- `src/shared/fileTypes.ts` — FileKindModule（统一文件类型判断：markdown/code/text/binary）
- `src/renderer/stores/useThemeStore.ts` — 主题状态（theme、themeId、codeTheme）
- `src/renderer/stores/useLayoutStore.ts` — 布局状态（侧边栏/大纲可见性与宽度、搜索面板）
- `src/renderer/stores/useNavigationStore.ts` — 导航意图状态（跨文件跳转、搜索高亮）
- `src/renderer/features/settings/useSettingsStore.ts` — 阅读设置状态
- `src/renderer/hooks/useKeyboardShortcuts.ts` — 键盘快捷键
- `src/renderer/hooks/useMenuEvents.ts` — 原生菜单事件分发
- `src/renderer/components/CommandPalette.tsx` — 命令面板 UI（Ctrl+Shift+P 唤起）
- `src/renderer/features/commands/commands.ts` — 命令注册中心（单例）
- `src/renderer/features/commands/fuzzyMatch.ts` — 模糊匹配函数
- `src/renderer/features/commands/useRegisterCommands.ts` — 启动时注册命令
- `src/renderer/stores/useCommandStore.ts` — 命令面板显示状态
- `src/renderer/lib/exporter.ts` — HTML / PDF 导出工具
- `src/renderer/lib/dailyNote.ts` — 每日笔记创建/打开
- `src/renderer/features/markdown-viewer/useEditorDocument.ts` — 统一编辑会话（状态机：saved/dirty/saving/error/conflict、seed/reset、保存、冲突处理）
- `src/renderer/features/markdown-viewer/SourceViewer.tsx` — 文本/代码源码查看（语法高亮、行号显示、搜索行定位高亮）
- `src/shared/scrollContainer.ts` — 滚动容器工具（正文滚动、SourceViewer 行定位、搜索跳转）
- `src/renderer/lib/codemirror/pathCompletion.ts` — 相对路径补全（纯函数 + CodeMirror 扩展）
- `src/renderer/lib/codemirror/table.ts` — 表格编辑核心（解析/插入/删除/导航 + keymap）
- `src/renderer/components/TableInsertDialog.tsx` — 表格插入弹窗（行/列配置）
- `src/renderer/stores/useTableDialogStore.ts` — 表格弹窗状态（工具栏与命令面板共享）
- `src-tauri/src/commands/export.rs` — `save_text_file` Rust command
