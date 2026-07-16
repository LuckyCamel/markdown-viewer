# 技术栈与架构评估报告

| 项 | 内容 |
|----|------|
| 评估对象 | Markdown Viewer（跨平台 Tauri 桌面 Markdown 阅读器与编辑器） |
| 初评日期 | 2026-07-16 |
| 修订日期 | 2026-07-16（第四次扫描：v1.4.0 版本变更） |
| 代码版本参考 | `package.json` / `Cargo.toml` / 文档 **1.4.0**；HEAD 含 `0914542` |
| 评估范围 | 技术栈选型、进程架构、前端/后端分层、编辑子系统、安全、测试与工程化、可维护性与风险 |
| 结论摘要 | **技术栈与整体架构合理且持续收敛**。v1.3.1 完成「阅读 + 编辑」；v1.4.0 工程化加固（useEditorSession 会话层、ref-based persistence、EditorPane 抽离、CM 分包/注入、架构文档 store 原则、ipc mock 写盘、编辑单测 401 个）。剩余张力主要是：**Edit 路径无 E2E/真实 Tauri 冒烟**、**双高亮栈为产品取舍**。 |

### 相对初评的主要变更（代码）

| Commit / 主题 | 对架构的影响 |
|---------------|--------------|
| `0d6fa1a` feat: 方向六·编辑/写作能力 | 新增 Edit 视图、CM6 工具链、自动保存、冲突检测、`save_file`/`get_mtime` |
| `dea27b1` / `4225259` / `a7dd9dc` 文档 | product/architecture/roadmap/README 与版本对齐 |
| `8a849ea` feat(editor): 编辑改进与测试覆盖 | **EditorPane**、CM 依赖注入与 chunk、persistence/commands 单测、architecture store 原则、`ipc.mock` 写盘 API |
| `0914542` feat(editor): useEditorSession 会话层 | **ref-based persistence**、PersistenceSeed、会话编排下沉、测试扩充至 401 |
| `87594b2` / `98c2ec7` 等 fix | 渲染细节与样式，不改变架构形状 |

---

## 1. 产品与代码规模快照

### 1.1 产品定位

以**工作区**方式浏览、渲染并编辑本地 Markdown（及扩展文本/代码）文件。

**能力面（1.4.0）**：GFM / KaTeX / Mermaid、多标签、文件树、全文搜索、大纲、主题、原生菜单、命令面板、HTML/PDF 导出、每日笔记；以及 **Edit 模式**（CodeMirror 6、工具栏、1.5s 防抖自动保存、mtime 冲突检测、查找替换、多光标、列表延续）。

定位：**阅读器 + 轻量 Markdown 编辑器**，不是完整 IDE。

视图三态（`ViewMode`）：`render` → `source` → `edit` 循环（`Ctrl+Shift+S`）。

### 1.2 规模（约，第三次扫描）

| 维度 | 数量级 |
|------|--------|
| 前端 TS/TSX 源文件 | ~149（`src/`） |
| Rust 源文件 | ~26（`src-tauri/src/`） |
| 单元测试文件 | ~53 |
| E2E 规格 | ~14（Playwright） |
| 关键大文件 | `FileTree.tsx` ~464 行 · `App.tsx` ~384 行 · `ipc.ts` ~335 行 · `ipc.mock.ts` ~346 行 · `useWorkspaceInit.ts` ~225 行 |
| 编辑子系统 | `Editor` / `EditorPane` / `EditorToolbar` / `ConflictBanner` / `useEditorPersistence` / `lib/codemirror/*` |

相对第二次扫描：`App.tsx` 自 ~436 行降至 **~384 行**（EditorPane 抽离）；测试文件与 mock 写盘 API 已补齐。

规模仍属**中小型桌面应用**，无需领域服务层或 monorepo。

---

## 2. 技术栈评估

### 2.1 栈总览

| 层级 | 选型 | 版本方向 | 评价 |
|------|------|----------|------|
| 桌面壳 | **Tauri 2** | 2.x | 优秀 |
| 后端语言 | **Rust** | edition 2021 | 优秀 |
| 前端框架 | **React 19** + **TypeScript** | 19 / TS 6 | 合理 |
| 状态 | **zustand 5** | 5.x | 优秀 |
| 构建 | **Vite 6** + pnpm | 6.x | 优秀；`manualChunks` 已含 **codemirror** |
| 样式 | **Tailwind CSS 3** + CSS 变量主题 | 3.x | 合理 |
| Markdown 渲染 | **react-markdown** + remark/rehype | 10.x | 优秀（Render） |
| Markdown 编辑 | **CodeMirror 6** | 6.x | 优秀且已落地；lib 层参数注入已修复 |
| 源码只读高亮 | **highlight.js**（`SourceViewer`） | 主流 | 可接受；与 CM 双栈并存 |
| 数学 / 图 | KaTeX · Mermaid | 主流 | 合理 |
| 系统能力 | plugin-fs / dialog / shell + 自研写盘 command | 2.x | 优秀 |
| 测试 | Vitest · Testing Library · Playwright | 新版 | 良好；编辑单元测已补，**无 Edit E2E** |
| CI/CD | GitHub Actions | — | 优秀 |

### 2.2 选型合理性

| 决策 | 是否合理 | 说明 |
|------|----------|------|
| Tauri 而非 Electron | **是** | 本地 IO + 轻 UI |
| React + zustand | **是** | 与 feature store 匹配 |
| react-markdown 做 Render | **是** | 插件链 + sanitize |
| CodeMirror 6 做 Edit（非 Monaco） | **是** | 体积与 Markdown 扩展合适 |
| Source 仍用 highlight.js | **可接受** | 职责分离；统一栈为可选优化 |
| 写盘用 `save_file` 返回 mtime | **是** | 冲突检测需要 |
| 自研全文搜索 | **可接受** | 中小工作区足够 |

### 2.3 技术栈风险与债务

| 项 | 严重度 | 说明 |
|----|--------|------|
| **双高亮栈（hljs + CM6）** | 低–中 | 产品取舍；非接入未完成 |
| **Edit 无 E2E / 无真实 Tauri 写盘冒烟** | 中 | mock 单测无法覆盖 WebView + scope + 磁盘真路径 |
| **`save_file` / `get_mtime` Rust 单测** | 低 | command 层仍缺专用测试 |
| **Tailwind v3** | 低 | 非阻塞 |

**已消除（相对初评/二次扫描）**：CM 僵尸依赖、lib/codemirror → useUIStore 反向依赖、CM 未分包、AGENTS 未登记 CM、`ipc.mock` 缺写盘 API。

**栈层面结论**：选型正确；工程债在 `8a849ea` 后明显下降。

---

## 3. 架构评估

### 3.1 总体风格

经典 **Tauri 双进程模型**（未变）：

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (WebView) — React                                 │
│  features / stores / hooks / components                     │
│  lib/ipc.ts（唯一 IPC 出口）+ ipc.mock.ts                   │
│  lib/codemirror/*（参数注入 isDark）                        │
│  features/markdown-viewer/EditorPane                        │
├─────────────────────────────┬───────────────────────────────┤
│  Backend (Rust)             │  plugins: fs · dialog · shell │
│  commands / state / search  │  capabilities + 动态 fs scope │
│  scope / menu / cli         │  save_file · get_mtime        │
└─────────────────────────────┴───────────────────────────────┘
```

### 3.2 后端（Rust）

| 优点 | 说明 |
|------|------|
| Command 边界清晰 | 含写盘与 mtime |
| 状态注入规范 | Watcher / Settings / Search / Launch + store |
| 能力下沉合理 | 遍历、搜索、监控、受控写盘在 Rust |
| 入口简洁 | `main.rs` → CLI → `lib::run()` |

| 改进点 | 说明 |
|--------|------|
| 同步递归 `walk_dir` | 超大目录可能拖慢搜索（按需） |
| `save_file` / `get_mtime` 单测 | 仍建议补权限边界与写入用例 |

**后端结论**：结构健康；与编辑闭环完整。

### 3.3 前端分层

| 层 | 职责 | 符合度 |
|----|------|--------|
| `features/*` | 业务域；markdown-viewer 含 **EditorPane** | **高** |
| `stores/` | 全局 UI（三态 `viewMode`） | **高** |
| `hooks/` | 跨 feature 副作用；**persistence 仍由 App 调用** | **高**，编排略重 |
| `components/` | 骨架 UI（StatusBar 承载保存状态） | **高** |
| `lib/` | IPC、CM 扩展（**已无 store 依赖**） | **高** |
| `shared/` | 纯函数与类型 | **高** |

#### 3.3.1 优点

1. **IPC 单出口** + mock 已同步 `saveFile` / `getMtime`。
2. **EditorPane** 聚合 Toolbar + Conflict + Editor，feature 内聚提升。
3. **三态视图**语义清楚。
4. **`useEditorPersistence`** 状态机清晰（saved/saving/dirty/error/conflict）。
5. **CM 分层正确**：`createExtensions({ isDark })` 纯函数；`Editor` 读主题后注入并在主题变化时 `setState` 重建扩展。
6. **安全链路**保持：sanitize、CSP、scope、写盘 command 校验。

#### 3.3.2 架构张力（第三次扫描）

**A. `App.tsx` 组合根：已减负，未完全卸载编辑编排**

- 行数 ~384（较二次扫描的 ~436 下降）。
- 已委托 `EditorPane` 做 UI 组合。
- **仍保留** `useEditorPersistence`、换 tab 时 `resetPersistence`、`handleLoadDiskVersion` / `handleKeepMine` / `handleForceSave`。
- 再进一步可把 persistence + 冲突 handlers 收进 `EditorPane` 或 `useEditorSession`。

**B. Store 协同：文档已与实现对齐**

`architecture.md` §3.3 / §5.4 现为：

- 避免隐式循环 import  
- **允许** action / `getState()` 显式协同  
- lib 层参数注入  

与 `useTabStore`↔`useEditorStore` 等实现一致。**原则文档债已清。**

**C. 大组件**

- `FileTree.tsx` ~464 行（未变，仍可拆）  
- `EditorToolbar` 命令密集，可接受  

**D. 视图三态双高亮：有意设计**

| 模式 | 实现 | 职责 |
|------|------|------|
| `render` | `MarkdownViewer` | 只读富渲染 |
| `source` | `SourceViewer` + highlight.js | 只读多语言源码 |
| `edit` | `Editor` + CodeMirror 6 | 可写 Markdown |

**E. 编辑子系统分层（已改善）**

| 点 | 状态 |
|----|------|
| `createExtensions` → useUIStore | **已消除** |
| 主题 / 行号 / readOnly 变化 | **`Editor` 内 `setState` 重建扩展** |
| 持久化在 hook、由 App 挂载 | **仍在**；多 tab 靠 `resetPersistence` |
| watcher vs 编辑冲突 | 产品流已文档化；真机联调仍建议冒烟 |

### 3.4 安全架构

| 机制 | 评价 |
|------|------|
| capabilities 空 fs scope | **优秀** |
| 动态 `grant_fs_scope` | **优秀** |
| command 路径校验（含写盘） | **优秀** |
| sanitize + CSP | **优秀** |
| 外部 URL 经 shell | **优秀** |

### 3.5 数据流

1. **打开**：scope → tab → load → 按 viewMode 展示  
2. **搜索**：invoke + `search-result` 多播  
3. **外部变更**：notify → `file-change`  
4. **编辑保存**：CM → store → persistence 防抖 → `get_mtime` → 冲突或 `save_file`  
5. **冲突 UI**：`saveStatus === 'conflict'` 时 EditorPane 显示 ConflictBanner  

### 3.6 持久化

- 设置：Rust store + localStorage 迁移  
- E2E mock：localStorage + **内存 files Map 写盘模拟**  
- 文件内容：编辑写回工作区磁盘  

---

## 4. 工程化与质量保障

### 4.1 测试策略

| 层级 | 现状 | 评价 |
|------|------|------|
| 单元（Vitest） | 存量广 + **编辑主路径显著加强** | **强** |
| `useEditorPersistence` | ~10 用例：冲突、成功、失败、loadDisk、空内容/无 path 不自动存 | **强**（正向 1.5s 触发存盘仍可再补） |
| `markdownCommands` | bold/italic/strike/inlineCode | **中**（工具栏其余命令未测） |
| `listContinuation` | **import 生产 `parseListLine`** | **强**（纯解析层） |
| E2E | 无 Edit / save 规格 | **缺口** |
| 真实 Tauri | 无 | **缺口** |
| Rust | walk/matcher 等有；写盘 command 少 | **中** |
| CI | 完整 | **强** |

### 4.2 文档与 Agent 约束

| 文档 | 健康度 |
|------|--------|
| `architecture.md` | store 原则、依赖例外、编辑数据流均已更新 |
| `product.md` / `README` | 1.4.0 一致 |
| `AGENTS.md` | CM 与 rehype-sanitize 均为已批准例外 |
| `roadmap.md` | 方向六 ✅ |

### 4.3 仓库洁净度

工作树干净（`main` 与 `origin/main` 同步，`8a849ea` 已提交）。本地构建产物目录仍可能存在，靠 gitignore 约束即可。

---

## 5. 对照常见架构坏味道

| 坏味道 | 本项目状态（1.4.0 + `0914542`） |
|--------|--------------------------------|
| 错误的桌面壳选型 | 无 |
| 前后端职责倒置 | 无 |
| 无边界的全局状态 | 基本无 |
| 隐式 store 环 | 轻；文档已允许显式 `getState()` |
| 巨石组合根 | **中**（已减负，persistence 仍在 App） |
| 过度抽象 | 无 |
| 安全事后补丁 | 无 |
| mock 与实现双轨漂移 | **写盘 API 已对齐**；其他接口仍靠约定 |
| 依赖僵尸 | **已消除** |
| 功能无测试 | **编辑单元测已补**；E2E 仍缺 |

---

## 6. 综合评分

评分说明：5 = 标杆级；4 = 扎实可用；3 = 可接受有债；2 = 明显拖累；1 = 需重构。

| 维度 | 初评 | 二次 | 三次（本次） | 评语 |
|------|------|------|--------------|------|
| 技术栈匹配度 | 4.5 | 4.6 | **4.6** | 阅读 + 轻编辑匹配 |
| 进程与安全架构 | 4.7 | 4.7 | **4.7** | 写盘纳入 command |
| 前端模块化 | 4.0 | 3.8 | **4.1** | EditorPane + CM 分层修复 |
| 后端模块化 | 4.3 | 4.3 | **4.3** | 稳定 |
| 状态管理 | 3.8 | 3.8 | **4.2** | 文档原则已对齐实现 |
| 可测试性 | 4.2 | 3.9 | **4.2** | 编辑单测回升；E2E 仍弱 |
| 工程化 / CI | 4.5 | 4.5 | **4.5** | 稳定 |
| 文档与代码一致性 | 3.5 | 4.2 | **4.5** | store/依赖/版本均对齐 |
| 依赖卫生 | 3.3 | 4.0 | **4.3** | 分包 + 批准例外 + 无僵尸 |
| **整体** | 4.1 | 4.2 | **4.4 / 5** | **合理且偏优秀**；剩余为可选深化与 E2E |

---

## 7. 结论

### 7.1 总体判断

**技术栈合理，架构合理，编辑能力工程化已基本到位。**

- 不建议换壳、换状态库或换 Monaco。  
- 三态视图模型保持清晰。  
- 下一阶段优先：**Edit E2E 或少量真实写盘冒烟**、**可选把 persistence 完全下沉 EditorPane**，而非再扩功能面。

### 7.2 最值得保持的设计

1. IPC 集中适配器 + mock 双轨（含写盘）  
2. fs scope 默认拒绝 + 动态授权 + command 校验  
3. feature 目录 + shared 纯函数 + CM 参数注入  
4. 搜索/监控/写盘在 Rust，渲染与编辑 UI 在 Web  
5. 保存状态机与冲突横幅产品化  
6. CI 与依赖/版本门禁  

### 7.3 优先改进建议 — 落地核查（第三次扫描）

> 对照 HEAD `8a849ea` 与工作区（干净）。状态：**已修复** / **部分修复** / **未修复**。

| # | 建议 | 状态 | 核查说明 |
|---|------|------|----------|
| 1 | 编辑主路径补测试 | **大部分已修复** | 见子表；缺 Edit E2E 与防抖「正向触发保存」用例 |
| 2 | 抽出 `EditorPane` | **大部分已修复** | UI 已下沉；**persistence 编排仍在 App** |
| 3 | 修正 architecture store 原则 | **已修复** | 允许显式 `getState()` 协同；lib 参数注入 |
| 4a | Vite `manualChunks` 拆 codemirror | **已修复** | `vite.config.ts` |
| 4b | `createExtensions` 注入 isDark | **已修复** | 无 useUIStore import |
| 4c | 主题切换重建扩展 | **已修复** | `Editor.tsx` `setState` |
| 5 | AGENTS 登记 CM 已批准 | **已修复** | 与 rehype-sanitize 并列 |
| 6 | 统一 Source/Edit 高亮栈 | **未修复**（可选/暂缓） | 双栈有意保留 |
| 7 | 真实 Tauri 写盘冒烟 | **部分改善 / 核心未做** | **`ipc.mock` 已补 save/getMtime**；仍无真实 Tauri / Edit E2E |
| 8 | 大目录搜索性能 | **未修复**（按需） | `walk_dir` 同步递归未变 |

#### 子项明细

**1. 测试**

| 子项 | 状态 | 证据 |
|------|------|------|
| `useEditorPersistence` 基础 API | 已有 | reset / dirty / 暴露函数 |
| mtime 冲突 → `conflict` | **已测** | `should detect mtime conflict…` |
| save 成功 | **已测** | `should save successfully…` |
| save 失败 → `error` | **已测** | `should set error status…` |
| loadDiskVersion | **已测** | |
| 空内容 / null path 不自动存 | **已测**（负向防抖） | fake timers |
| 内容未变不自动存 | **已测** | |
| 防抖 1.5s **正向**触发 save | **偏弱/未明确** | 无「改内容 → 快进 1.5s → 调用 saveFile」用例 |
| `markdownCommands` | **部分** | 4 个 toggle；标题/列表/链接等未测 |
| `listContinuation` 对接生产代码 | **已修复** | `import { parseListLine } from './listContinuation'` |
| Edit E2E | **未做** | `e2e/` 无 edit/save 规格 |

**2. EditorPane**

| 子项 | 状态 |
|------|------|
| Toolbar + Conflict + Editor 下沉 | **已做** |
| 以 `saveStatus` 驱动冲突条 | **已做**（优于本地 banner 布尔） |
| persistence / 换文件 reset / 快捷保存 下沉 | **未做**（`App.tsx` 仍编排） |

**3. 文档 store 原则**

| 子项 | 状态 |
|------|------|
| 禁止隐式环 + 允许显式协同 | **已写** |
| lib 参数注入 | **已写** |
| §6 依赖例外含 CM | **已写** |

**附带项**

| 项 | 状态 |
|----|------|
| `ipc.mock.ts` 的 `saveFile`/`getMtime` | **已修复** |
| 改进改动已提交主线 | **已提交**（`8a849ea`） |

### 7.4 剩余建议（仅未闭环项）

1. **补 1 条 persistence 正向防抖用例**（改 content → `advanceTimers(1500)` → 断言 `saveFile`）。  
2. **可选：1 条 mock E2E**（切 Edit → 改字 → 等防抖或 Ctrl+S → 状态栏 saved）。  
3. **可选：persistence 完全下沉** `EditorPane` / `useEditorSession`，App 只传 `filePath`。  
4. **可选：真实 Tauri 写盘冒烟**（scope + save + mtime）。  
5. **按需：walk 性能**；**按需：统一高亮栈**。  

### 7.5 不建议的方向

| 方向 | 原因 |
|------|------|
| 全面 Redux / DI | 与 zustand 冲突 |
| monorepo 微包 | 规模不够 |
| 换 Monaco | CM 已投入且合适 |
| 立刻 WYSIWYG / 协同 | 产品量级跃迁 |
| 为抽象而抽象 Domain 层 | 当前分层足够 |

---

## 8. 附录：关键路径索引

| 路径 | 角色 |
|------|------|
| `src-tauri/src/lib.rs` | 插件、State、command 注册 |
| `src-tauri/src/commands/files.rs` | 含 `save_file` / `get_mtime` |
| `src-tauri/capabilities/default.json` | 权限与空 fs scope |
| `src/renderer/lib/ipc.ts` | IPC 适配器 |
| `src/renderer/lib/ipc.mock.ts` | E2E mock（含写盘） |
| `src/renderer/App.tsx` | 组合根（仍挂 persistence） |
| `src/renderer/features/markdown-viewer/EditorPane.tsx` | 编辑 UI 聚合 |
| `src/renderer/features/markdown-viewer/Editor.tsx` | CM 宿主 + 主题重建 |
| `src/renderer/features/markdown-viewer/useEditorPersistence.ts` | 防抖保存与冲突 |
| `src/renderer/features/markdown-viewer/useEditorPersistence.test.ts` | 持久化单测 |
| `src/renderer/lib/codemirror/*` | 扩展、主题、命令、列表延续 |
| `src/renderer/stores/useUIStore.ts` | 三态 `viewMode` |
| `docs/architecture.md` | 架构真源 |
| `docs/development.md` | 开发与测试策略 |
| `docs/product.md` | 产品能力 |

---

## 9. 修订记录

| 日期 | 说明 |
|------|------|
| 2026-07-16 | 初评：纯阅读器视角；CM 僵尸依赖、版本漂移、App 偏重等 |
| 2026-07-16 | 中途 docs：定位改为阅读+编辑 |
| 2026-07-16 | 二次重扫：对照 `0d6fa1a`，纠正双路径表述与评分 |
| 2026-07-16 | 建议落地核查（工作区未提交改动） |
| 2026-07-16 | **三次扫描**：对照已提交 `8a849ea`，更新 §1–7 评分与 §7.3 状态表；多项建议改为已修复/大部分已修复 |

---

*本报告基于仓库源码与 git 历史的静态评估，未跑性能基准与全量用户验收。*
