# 技术栈与架构评估报告

| 项 | 内容 |
|----|------|
| 评估对象 | Markdown Viewer（跨平台 Tauri 桌面 Markdown 阅读器与编辑器） |
| 初评日期 | 2026-07-16 |
| 修订日期 | 2026-07-16（基于 `0d6fa1a` 方向六·编辑能力及后续 docs 修复 commit 重扫） |
| 代码版本参考 | `package.json` / `Cargo.toml` / 文档 **1.3.1** |
| 评估范围 | 技术栈选型、进程架构、前端/后端分层、编辑子系统、安全、测试与工程化、可维护性与风险 |
| 结论摘要 | **技术栈与整体架构仍合理**；v1.3.1 将产品从纯阅读器升级为「阅读 + 编辑」，CodeMirror 6 已落地且数据流清晰。原「依赖僵尸 / 版本漂移」问题已收敛。当前主要张力转为：**组合根进一步膨胀**、**编辑子系统测试缺口**、**双高亮栈（highlight.js + CodeMirror）的体积成本**、以及 **lib 层对 UI store 的反向依赖**。 |

### 相对初评的主要变更（代码）

| Commit / 主题 | 对架构的影响 |
|---------------|--------------|
| `0d6fa1a` feat: 方向六·编辑/写作能力 | 新增 Edit 视图、CM6 工具链、自动保存、冲突检测、`save_file`/`get_mtime` |
| `dea27b1` / `4225259` / `a7dd9dc` 文档 | product/architecture/roadmap/README 与 1.3.1 对齐；本报告此前半自动修订 |
| `87594b2` / `98c2ec7` 等 fix | 渲染细节与样式，不改变架构形状 |

---

## 1. 产品与代码规模快照

### 1.1 产品定位

以**工作区**方式浏览、渲染并编辑本地 Markdown（及扩展文本/代码）文件。

**能力面（1.3.1）**：GFM / KaTeX / Mermaid、多标签、文件树、全文搜索、大纲、主题、原生菜单、命令面板、HTML/PDF 导出、每日笔记；以及 **Edit 模式**（CodeMirror 6、工具栏、1.5s 防抖自动保存、mtime 冲突检测、查找替换、多光标、列表延续）。

定位：**阅读器 + 轻量 Markdown 编辑器**，不是完整 IDE（无 LSP、无工程级重构、无分栏实时预览等）。

视图三态（`ViewMode`）：`render` → `source` → `edit` 循环（`Ctrl+Shift+S`）。

### 1.2 规模（约，重扫）

| 维度 | 数量级 |
|------|--------|
| 前端 TS/TSX 源文件 | ~145（`src/`） |
| Rust 源文件 | ~26（`src-tauri/src/`） |
| 单元测试文件 | ~50 |
| E2E 规格 | ~14（Playwright） |
| 关键大文件 | `App.tsx` ~436 行 · `FileTree.tsx` ~464 行 · `ipc.ts` ~377 行 · `useWorkspaceInit.ts` ~225 行 · `EditorToolbar.tsx` ~181 行 |
| 编辑子系统新增（约） | `Editor` / `EditorToolbar` / `ConflictBanner` / `useEditorPersistence` / `lib/codemirror/*`（extensions · theme · commands · listContinuation） |

规模仍属**中小型桌面应用**。编辑能力使「前端 UI 编排」与「写盘一致性」复杂度明显上升，但尚未需要领域服务层或 monorepo 拆包。

---

## 2. 技术栈评估

### 2.1 栈总览

| 层级 | 选型 | 版本方向 | 评价 |
|------|------|----------|------|
| 桌面壳 | **Tauri 2** | 2.x | 优秀：体积/内存相对 Electron 更适合本应用 |
| 后端语言 | **Rust** | edition 2021 | 优秀：遍历、搜索、watcher、写盘与 mtime |
| 前端框架 | **React 19** + **TypeScript** | 19 / TS 6 | 合理 |
| 状态 | **zustand 5** | 5.x | 优秀 |
| 构建 | **Vite 6** + pnpm | 6.x | 优秀；`manualChunks` 覆盖 mermaid/katex/hljs，**尚未拆 CodeMirror** |
| 样式 | **Tailwind CSS 3** + CSS 变量主题 | 3.x | 合理 |
| Markdown 渲染 | **react-markdown** + remark/rehype | 10.x | 优秀（Render 模式） |
| Markdown 编辑 | **CodeMirror 6** + `@codemirror/lang-markdown` 等 | 6.x | **合理且已落地**；相对 Monaco 更轻 |
| 源码只读高亮 | **highlight.js**（`SourceViewer`） | 主流 | 合理；与 CM 并存形成双栈 |
| 数学 / 图 | KaTeX · Mermaid | 主流 | 合理；动态 import + chunk |
| 系统能力 | plugin-fs / dialog / shell | 2.x | 优秀；**读**走 plugin-fs，**写**走自研 command（为返回 mtime） |
| 测试 | Vitest · Testing Library · Playwright | 新版 | 良好；**编辑子系统单元测试几乎空白** |
| CI/CD | GitHub Actions | — | 优秀 |

### 2.2 选型合理性

| 决策 | 是否合理 | 说明 |
|------|----------|------|
| Tauri 而非 Electron | **是** | 本地 IO + 轻 UI；迁移路径已完成 |
| React + zustand | **是** | 与 feature store 模型匹配 |
| react-markdown 做 Render | **是** | 插件链 + sanitize，只读渲染正确 |
| CodeMirror 6 做 Edit（非 Monaco） | **是** | 体积、Markdown 语言包、扩展模型均更贴合；roadmap 方向六已完成 |
| Source 仍用 highlight.js | **可接受** | Source 与 Edit 职责分离；代价是双高亮依赖 |
| 写盘用 `save_file` 而非 plugin-fs `writeTextFile` | **是** | 需原子返回新 mtime，并走 `ensure_under_allowed_root` |
| 自研全文搜索 | **可接受** | 中小工作区足够 |
| Tailwind 3 | **可接受** | 无强升 v4 动机 |

### 2.3 技术栈风险与债务

| 项 | 严重度 | 说明 |
|----|--------|------|
| **双高亮栈（hljs + CM6）** | 中 | Source 与 Edit 各一套；安装体积与主题需两套维护。若 Source 仅作「只读源码」，长期可评估 CM 只读实例统一 |
| **CodeMirror 未进 `manualChunks`** | 低–中 | `vite.config.ts` 未单独拆 `codemirror` chunk；首屏/切换 Edit 时打包行为未优化 |
| **`createExtensions` 读取 `useUIStore`** | 中 | `lib/codemirror` 依赖全局 UI store，基础设施层反向耦合界面状态；主题切换后已挂载 Editor 不一定重建扩展 |
| **「不引入新依赖」与已引入 CM** | 低 | AGENTS 仍写硬约束，实际 1.3.1 已合法引入 CM 族；建议在约束中记为**已批准例外**（同 `rehype-sanitize`） |
| **Tailwind 停留 v3** | 低 | 非阻塞 |

**栈层面结论**：阅读 + 轻编辑场景下选型正确；CodeMirror 落地消除了初评「僵尸依赖」问题，新的栈债是**双渲染器并存与分包/分层细节**。

---

## 3. 架构评估

### 3.1 总体风格

经典 **Tauri 双进程模型**（未变）：

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (WebView) — React                                 │
│  features / stores / hooks / components                     │
│  lib/ipc.ts（唯一 IPC 出口）                                │
│  lib/codemirror/* + features/markdown-viewer/Editor*        │
├─────────────────────────────┬───────────────────────────────┤
│  Backend (Rust)             │  plugins: fs · dialog · shell │
│  commands / state / search  │  capabilities + 动态 fs scope │
│  scope / menu / cli         │  save_file · get_mtime        │
└─────────────────────────────┴───────────────────────────────┘
```

### 3.2 后端（Rust）

| 优点 | 说明 |
|------|------|
| Command 边界清晰 | 目录/文件 CRUD、搜索、watcher、scope、store、export、trash、**写盘与 mtime** |
| 状态注入规范 | Watcher / Settings / Search / Launch + store |
| 能力下沉合理 | 遍历、增量搜索、监控、**受控写盘**在 Rust；读文件 plugin-fs |
| 入口简洁 | `main.rs` → CLI → `lib::run()` |

| 改进点 | 说明 |
|--------|------|
| 同步递归 `walk_dir` | 超大目录可能拖慢搜索（既有） |
| 前后端类型双份 | `FileEntry` 等手写同步（既有，规模可接受） |
| `save_file` / `get_mtime` 测试 | 新 command 宜补 Rust 单测（权限边界 + 写入） |

**后端结论**：结构仍健康；写盘能力补齐后与编辑器闭环完整。

### 3.3 前端分层

| 层 | 职责 | 符合度 |
|----|------|--------|
| `features/*` | 业务域（含 markdown-viewer 下 Editor / Toolbar / Persistence / Conflict） | **高** |
| `stores/` | 全局 UI（含三态 `viewMode`） | **高** |
| `hooks/` | 跨 feature 副作用 | **高**，编排职责重 |
| `components/` | 骨架 UI（StatusBar 已承载保存状态/视图模式） | **高** |
| `lib/` | IPC、主题、**codemirror 扩展** | **中–高**（见反向依赖） |
| `shared/` | 纯函数与类型（`ViewMode` 等） | **高** |

#### 3.3.1 优点

1. **IPC 单出口**（`ipc.ts` + `ipc.mock.ts`）仍成立；写盘 API 集中在 `files.saveFile` / `files.getMtime`。
2. **Feature 内聚**：编辑 UI 落在 `markdown-viewer`，CM 纯扩展在 `lib/codemirror`，职责大体清晰。
3. **三态视图模型简单**：`useUIStore.toggleViewMode` 循环 render/source/edit，产品语义清楚。
4. **保存与冲突有独立 hook**（`useEditorPersistence`）：防抖、mtime 比较、status 机（saved/saving/dirty/error/conflict）边界明确。
5. **安全链路保持**：sanitize、CSP、scope、command 层路径校验仍在；写盘同样应受 allowed root 约束。
6. **渲染性能意识保留**：Mermaid 动态 import；编辑内容仍走 editor store 缓存。

#### 3.3.2 架构张力（重扫后）

**A. `App.tsx` 组合根进一步膨胀（~436 行）**

在原有十余 hook / 命令 / 菜单编排之上，又叠加：

- `Editor` / `EditorToolbar` / `ConflictBanner` 挂载
- `useEditorPersistence` 与冲突 UI 状态
- 编辑内容回写 `useEditorStore`

桌面应用允许 fat root，但已越过「易测阈值」。更干净的方向：

- `EditorPane`（工具栏 + 冲突条 + CM + 持久化）
- `useAppHandlers`（菜单/快捷键/命令共用）

**B. Store 交叉协同（原则文档仍偏严）**

`architecture.md` 仍写「store 各自独立、无交叉依赖」。实现中：

| 调用方 | 依赖 |
|--------|------|
| `useTabStore` | `useEditorStore` |
| `useFileStore` | `useTabStore`、`useFavoritesStore` |
| 多 hooks / App | `getState()` 编排 |

编辑路径额外：`App` 在冲突「加载磁盘」时直接 `useEditorStore.setContent`。建议文档改为：**禁止组件树隐式循环 import；允许 action/`getState()` 显式协同**。

**C. 大组件**

- `FileTree.tsx` ~464 行（未变）
- `EditorToolbar.tsx` ~181 行：命令按钮密集，尚可接受
- `useWorkspaceInit` 测试体量大（既有）

**D. 视图三态：双高亮是有意设计，不是半成品**

| 模式 | 实现 | 职责 |
|------|------|------|
| `render` | `MarkdownViewer`（react-markdown 链） | 只读富渲染 |
| `source` | `SourceViewer` + highlight.js | 只读源码高亮（任意文本语言） |
| `edit` | `Editor` + CodeMirror 6 | 可写 Markdown 编辑 |

初评中的「CM 半成品 / 僵尸依赖」**已失效**。当前问题是**产品层双栈成本**，不是接入未完成。

**E. 编辑子系统分层细节**

| 点 | 风险 |
|----|------|
| `createExtensions` → `useUIStore.getState()` | lib 依赖 store；主题变更与已挂载 view 同步弱 |
| `Editor` 仅在 mount 时 `EditorState.create`（`useEffect` 依赖 `[]`） | `readOnly` / 行号 / 主题切换需重建或 reconfigure，当前能力有限 |
| 持久化状态在 hook 本地，不在 store | 多标签切换时状态重置策略需靠 path 变化；与 tab dirty 语义并存，要避免两套「脏」概念混淆 |
| 外部 `file-change` 与编辑冲突 | 架构文档有冲突流；watcher 热更新与 Edit 模式「保留本地修改」的交互需保持产品一致 |

### 3.4 安全架构

| 机制 | 评价 |
|------|------|
| capabilities `fs:scope` 默认 `allow: []` | **优秀** |
| 动态 `grant_fs_scope` | **优秀** |
| command `ensure_under_allowed_root`（含写盘） | **优秀**（写路径必须坚持） |
| HTML sanitize + CSP | **优秀** |
| 外部 URL 经 shell | **优秀** |

编辑能力引入**写盘面**：只要写 command 与 scope 校验不绕过，安全模型仍 solid。需避免未来用 plugin-fs 任意写而旁路校验。

### 3.5 数据流

与 `architecture.md` 一致，核心流：

1. **打开**：scope → tab → editor load → plugin-fs read → 按 `viewMode` 渲染/源码/编辑  
2. **搜索**：invoke + `search-result` 多播  
3. **外部变更**：notify → `file-change` → 内容/脏标记/滚动  
4. **编辑保存（新）**：CM onChange → store 内容 → `useEditorPersistence` 1.5s 防抖 → `get_mtime` → 冲突或 `save_file` → 更新 mtime/status  
5. **冲突 UI**：ConflictBanner → 加载磁盘 / 保留我的 / 稍后  

事件多播设计仍得当。

### 3.6 持久化

- 设置：Rust `settings.json` store；localStorage 迁移  
- E2E：mock localStorage  
- **文件内容**：编辑后写回工作区磁盘（非 app store）  
- 设置 key 字符串仍分散（既有低优先级债）

---

## 4. 工程化与质量保障

### 4.1 测试策略

| 层级 | 现状 | 评价 |
|------|------|------|
| 单元（Vitest） | store / hook / 组件 / shared 覆盖仍广 | **强**（存量） |
| **编辑子系统单测** | **未检出** `useEditorPersistence` / `Editor` / `EditorToolbar` / `codemirror/*` / `ConflictBanner` 测试 | **缺口（新）** |
| E2E（mock IPC） | 既有 UI 回归；**未见编辑保存/冲突 E2E** | 务实但未覆盖新主路径 |
| 真实 Tauri 集成 | 仍缺失 | 写盘 + scope 更需要冒烟 |
| Rust 单元 | walk 等有；`save_file`/`get_mtime` 宜补 | 中等 |
| CI | format · lint · typecheck · test · build · cargo · e2e · tauri build | **强** |

结论：工程底座仍好；**1.3.1 功能增量快于测试增量**，是当前质量风险点。

### 4.2 文档与 Agent 约束

| 文档 | 健康度（重扫） |
|------|----------------|
| `architecture.md` | 已补 4.4/4.5 编辑与冲突流、command 列表；**store「无交叉依赖」表述仍过严** |
| `development.md` | 清晰 |
| `product.md` | 已至 **1.3.1**，含编辑清单与快捷键 |
| `README.md` | 版本与定位已同步 |
| `roadmap.md` | 方向六标为 ✅（v1.3.1） |
| `AGENTS.md` | 有用；建议登记 CodeMirror 为已批准依赖例外 |
| `CHANGELOG.md` | 1.3.1 条目完整 |

相对初评「版本三处不一致」，**文档一致性已明显改善**。

### 4.3 仓库洁净度

本地仍可能存在 `coverage/`、`out/`、`release/` 等历史/构建产物（Electron 时代痕迹）。应靠 gitignore 与习惯清理，避免误导「当前栈」。

---

## 5. 对照常见架构坏味道

| 坏味道 | 本项目状态（1.3.1） |
|--------|---------------------|
| 错误的桌面壳选型 | 无 |
| 前后端职责倒置 | 无（scope + IPC；写盘经 command） |
| 无边界的全局状态 | 基本无 |
| 循环依赖 / 隐式 store 图 | **轻度**（action 级 getState；lib→store 主题读取） |
| 巨石组件 / 组合根 | **中–偏高**（App 因编辑再增重） |
| 过度抽象 | 无 |
| 安全事后补丁 | 无；写盘需持续守住 scope |
| mock 与实现双轨漂移 | **有风险**；`saveFile`/`getMtime` 须同步 mock |
| 依赖僵尸 | **已消除**（CM 已用） |
| 功能无测试 | **编辑路径明显** |

---

## 6. 综合评分

评分说明：5 = 标杆级；4 = 扎实可用；3 = 可接受有债；2 = 明显拖累；1 = 需重构。

| 维度 | 初评 | 重扫 | 评语 |
|------|------|------|------|
| 技术栈匹配度 | 4.5 | **4.6** | 阅读 + 轻编辑与 CM6/Tauri 匹配度更高 |
| 进程与安全架构 | 4.7 | **4.7** | 写盘纳入 command 后模型仍完整 |
| 前端模块化 | 4.0 | **3.8** | feature 仍好，App 组合根更重 |
| 后端模块化 | 4.3 | **4.3** | 增量 command 自然 |
| 状态管理 | 3.8 | **3.8** | 原则与实现仍待文档对齐 |
| 可测试性 | 4.2 | **3.9** | 存量强，编辑增量测试不足 |
| 工程化 / CI | 4.5 | **4.5** | 未变 |
| 文档与代码一致性 | 3.5 | **4.2** | 版本与编辑文档已对齐；store 原则仍滞后 |
| 依赖卫生 | 3.3→4.0（中途修订） | **4.0** | CM 落地；双高亮与 chunk 仍有优化空间 |
| **整体** | 4.1 | **4.2 / 5** | **合理且偏优秀**；重心从「能否编辑」转为「编辑路径的可维护与可测」 |

---

## 7. 结论

### 7.1 总体判断

**技术栈合理，架构合理，方向六落地后产品边界扩展得当。**

- 不建议换壳、换状态库或换到 Monaco。  
- 不建议退回「纯阅读器」架构；Edit 与 Render/Source 的三态拆分是清晰产品模型。  
- 下一阶段优先：**拆组合根、补编辑测试、收敛 CM 与主题/分包细节**，而非再堆功能层。

### 7.2 最值得保持的设计

1. IPC 集中适配器 + mock 双轨  
2. fs scope 默认拒绝 + 动态授权 + command 校验（**含写盘**）  
3. feature 目录 + shared 纯函数  
4. 搜索/监控/写盘在 Rust，渲染与编辑 UI 在 Web  
5. 保存状态机与冲突横幅产品化（而非静默覆盖）  
6. CI 纪律与版本变更门禁  

### 7.3 优先改进建议 — 落地核查（2026-07-16）

> 对照当前工作区代码（含未提交改动）。状态：**已修复** / **部分修复** / **未修复**。

| # | 建议 | 状态 | 核查说明 |
|---|------|------|----------|
| 1 | 编辑主路径补测试 | **部分修复** | 已有 `useEditorPersistence.test.ts`、`markdownCommands.test.ts`、`listContinuation.test.ts`。但 persistence 仅覆盖 reset/dirty/API 形态，**缺防抖保存、mtime 冲突、save 成功/失败**；`listContinuation` 测试内联了本地 `parseListLine`，**未 import 生产模块**；**无 Edit E2E** |
| 2 | 抽出 `EditorPane` | **部分修复** | 已有 `EditorPane.tsx`（Toolbar + Conflict + Editor），`App.tsx` 约 392 行。**`useEditorPersistence` 与冲突 state 仍留在 App**，组合根只瘦身一半 |
| 3 | 修正 architecture store 原则 | **部分修复** | §3.3 补充了「lib 不直接依赖 store、应参数注入」。但 **仍写「store 各自独立，无交叉依赖」**；§5.4 仍写「不跨 feature 引用」，与 `useTabStore`↔`useEditorStore`、`useFileStore`↔tabs/favorites 等实现不符 |
| 4a | Vite `manualChunks` 拆 codemirror | **已修复** | `vite.config.ts` 已含 `codemirror: ['@codemirror/state', …]` |
| 4b | `createExtensions` 注入 isDark，去掉 useUIStore | **已修复** | `extensions.ts` 仅接收 `isDark?` 参数，不再 import store |
| 4c | 主题切换时 Editor 重建/reconfigure | **已修复** | `Editor.tsx` 在 `isDark`/`showLineNumbers`/`readOnly` 变化时 `view.setState` 重建扩展；主题由组件读 store 后注入 |
| 5 | AGENTS 登记 CM 已批准依赖 | **已修复** | `AGENTS.md`：`已批准 rehype-sanitize、CodeMirror 6 相关包` |
| 6 | 统一 Source/Edit 高亮栈 | **未修复**（可选/暂缓） | 仍双栈：`SourceViewer`+highlight.js 与 Edit+CM6 并存。属产品取舍，非缺陷 |
| 7 | 真实 Tauri 写盘冒烟 | **未修复**（可选） | 无真实 Tauri 集成测试；`e2e/` 无 Edit/save 路径。另：`ipc.mock.ts` **仍缺 `saveFile`/`getMtime`**，mock E2E 也无法覆盖写盘 |
| 8 | 大目录搜索性能 | **未修复**（按需） | `walk_dir` 仍为同步递归；无用户卡顿反馈前可不动 |

#### 子项明细（建议 1 / 2 / 3）

**1. 测试**

| 子项 | 状态 | 证据 |
|------|------|------|
| `useEditorPersistence` 基础 | 已有 | reset / dirty / 暴露 API |
| 防抖 1.5s 自动保存 | 未测 | — |
| mtime 冲突 → `conflict` | 未测 | — |
| save 成功/失败 | 未测 | — |
| `markdownCommands` 纯函数 | 部分 | 测了 bold/italic 等；未全覆盖工具栏命令 |
| `listContinuation` 对接生产代码 | 弱 | 测试文件自写 `parseListLine`，与 `listContinuation.ts` 的 inputHandler **未连接** |
| Edit E2E | 未做 | — |

**2. EditorPane**

| 子项 | 状态 |
|------|------|
| Toolbar + Conflict + Editor 下沉 | 已做 |
| persistence / 冲突编排下沉进 feature | 未做（仍在 `App.tsx`） |

**3. 文档 store 原则**

| 子项 | 状态 |
|------|------|
| lib 参数注入（与 CM 改造一致） | 已写 |
| 允许 action/`getState()` 显式协同 | **未改写**（仍强调无交叉依赖） |

**4–5 已闭环摘要**：分包、扩展注入、主题重建、AGENTS 例外登记均已在工作区落地。

**附带发现（非原列表，但相关）**

| 项 | 状态 |
|----|------|
| `ipc.mock.ts` 同步 `saveFile`/`getMtime` | **未修复**（双轨漂移风险仍在） |
| `architecture.md` §6 依赖例外仍只写 rehype-sanitize | **部分滞后**（与 AGENTS 不完全一致） |
| 上述多项改动在 git 中多为 **未提交**（`EditorPane`、测试、vite/AGENTS/CM 改造等） | 落地后需 commit 才算进入主线 |

### 7.4 不建议的方向

| 方向 | 原因 |
|------|------|
| 全面 Redux / DI | 与 zustand 冲突，收益低 |
| monorepo 微包 | 规模不够 |
| 换 Monaco | 体积与场景不匹配；CM 已投入 |
| 立刻上分栏 WYSIWYG / 协同编辑 | 跃迁到另一产品量级 |
| 为抽象而抽象 Domain 层 | 边界捕获 + 纯函数仍够用 |

---

## 8. 附录：关键路径索引

| 路径 | 角色 |
|------|------|
| `src-tauri/src/lib.rs` | 插件、State、command 注册（含 `save_file` / `get_mtime`） |
| `src-tauri/src/commands/files.rs` | 文件存在性、创建/重命名、**保存与 mtime** |
| `src-tauri/capabilities/default.json` | 权限与空 fs scope |
| `src/renderer/lib/ipc.ts` | IPC 适配器 |
| `src/renderer/App.tsx` | 应用组合根（含编辑编排） |
| `src/renderer/features/markdown-viewer/Editor.tsx` | CodeMirror 宿主 |
| `src/renderer/features/markdown-viewer/EditorToolbar.tsx` | Markdown 工具栏命令 |
| `src/renderer/features/markdown-viewer/useEditorPersistence.ts` | 防抖保存与冲突状态机 |
| `src/renderer/features/markdown-viewer/ConflictBanner.tsx` | 冲突 UI |
| `src/renderer/features/markdown-viewer/SourceViewer.tsx` | 只读源码（highlight.js） |
| `src/renderer/lib/codemirror/*` | CM 扩展、主题、命令、列表延续 |
| `src/renderer/stores/useUIStore.ts` | 含三态 `viewMode` |
| `src/renderer/features/*` | 业务 feature |
| `src/shared/*` | 共享纯逻辑与类型 |
| `docs/architecture.md` | 架构说明（含编辑/冲突数据流） |
| `docs/development.md` | 开发与测试策略 |
| `docs/product.md` | 产品能力与快捷键 |

---

## 9. 修订记录

| 日期 | 说明 |
|------|------|
| 2026-07-16 | 初评：纯阅读器视角；指出 CM 僵尸依赖、版本漂移、App 偏重等 |
| 2026-07-16 | 中途 docs 修订：定位改为阅读+编辑、部分删除 CM 未落地表述 |
| 2026-07-16 | **重扫修订**：对照 `0d6fa1a` 及后续 commit，纠正 §3.3.2-D、栈表、规模、评分与改进优先级；补充写盘/冲突/测试缺口与 lib→store 耦合 |
| 2026-07-16 | **建议落地核查**：§7.3 逐项标注已修复/部分/未修复（含工作区未提交改动） |

---

*本报告基于仓库源码、近期 git 历史与 `docs/architecture.md` 等的静态评估，未跑性能基准与全量用户验收。*
