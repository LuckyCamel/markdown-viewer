# 技术栈与架构评估报告

| 项 | 内容 |
|----|------|
| 评估对象 | Markdown Viewer（跨平台 Tauri 桌面 Markdown 阅读器与编辑器） |
| 评估日期 | 2026-07-16 |
| 代码版本参考 | `package.json` / `Cargo.toml` **1.3.1** |
| 评估范围 | 技术栈选型、进程架构、前端/后端分层、安全、测试与工程化、可维护性与风险 |
| 结论摘要 | **技术栈与整体架构合理，与产品定位匹配度高**；主路径清晰、安全模型扎实、工程化成熟。主要问题集中在「组合根膨胀」「store 实际存在交叉引用」「文档与代码漂移」「依赖与历史产物未完全收敛」。 |

---

## 1. 产品与代码规模快照

### 1.1 产品定位

以**工作区**方式浏览、渲染和编辑本地 Markdown（及扩展的文本/代码）文件：GFM 渲染、KaTeX、Mermaid、多标签、文件树、全文搜索、大纲、主题、原生菜单、命令面板、导出、每日笔记、编辑器（Edit 模式）、自动保存、冲突检测、查找替换、多光标编辑等。定位是**阅读器与编辑器**，不是完整 IDE。

### 1.2 规模（约）

| 维度 | 数量级 |
|------|--------|
| 前端 TS/TSX 源文件 | ~140（`src/`） |
| Rust 源文件 | ~26（`src-tauri/src/`） |
| 单元测试文件 | ~50 |
| E2E 规格 | ~14（Playwright） |
| CodeGraph 索引 | ~193 文件 / ~1300 节点 |
| 关键大文件 | `App.tsx` ~370 行 · `ipc.ts` ~367 行 · `FileTree.tsx` ~464 行 · `useWorkspaceInit.ts` ~225 行 |

规模处于**中小型桌面应用**区间：功能面已完整，但尚未到需要领域服务层或微前端的复杂度。

---

## 2. 技术栈评估

### 2.1 栈总览

| 层级 | 选型 | 版本方向 | 评价 |
|------|------|----------|------|
| 桌面壳 | **Tauri 2** | 2.x | 优秀：相对 Electron 体积小、内存低，契合本地文件阅读器与编辑器 |
| 后端语言 | **Rust** | edition 2021 | 优秀：适合文件遍历、搜索、watcher、权限边界 |
| 前端框架 | **React 19** + **TypeScript** | 19 / TS 6 | 合理：生态成熟，与组件化 UI 匹配 |
| 状态 | **zustand 5** | 5.x | 优秀：轻量、无 Provider 地狱，适合多 feature store |
| 构建 | **Vite 6** + pnpm | 6.x | 优秀：HMR 快；`manualChunks` 对 mermaid/katex 有意识 |
| 样式 | **Tailwind CSS 3** + CSS 变量主题 | 3.x | 合理：主题用变量注入，与 Tailwind 工具类共存 |
| Markdown | **react-markdown** + remark/rehype 插件链 | 10.x | 优秀：可组合、可消毒，符合「只读渲染」 |
| 高亮 / 图 | highlight.js · KaTeX · Mermaid | 主流 | 合理：按需 chunk；Mermaid 动态 import |
| 系统能力 | plugin-fs / dialog / shell | 2.x | 优秀：优先官方插件，减少自研 command 面 |
| 测试 | Vitest · Testing Library · Playwright | 新版 | 良好：金字塔清晰，但缺真实 Tauri 集成层 |
| CI/CD | GitHub Actions（lint/typecheck/test/build/cargo/e2e/release） | — | 优秀：覆盖面完整 |

### 2.2 选型合理性（相对替代方案）

| 决策 | 是否合理 | 说明 |
|------|----------|------|
| Tauri 而非 Electron | **是** | 本应用以本地 IO 与轻 UI 为主，不需要 Node 主进程；CHANGELOG 显示已完成 Electron→Tauri 迁移，方向正确 |
| React 而非 Svelte/Solid | **是** | 生态、测试工具、招聘/协作成本更优；桌面 WebView 场景无显著性能瓶颈 |
| zustand 而非 Redux/Jotai | **是** | 多 feature 独立 store + 少量全局 UI 状态，zustand 复杂度最低 |
| react-markdown 而非 MDX/自定义 parser | **是** | 只读渲染 + 插件链即可；MDX 会引入执行面与复杂度 |
| 自研 Rust 全文搜索 而非 ripgrep 子进程 | **可接受** | 当前 `walk` + `regex` 足够中小仓库；超大 monorepo 时再评估专用引擎 |
| Tailwind 3 而非 4 / 纯 CSS | **可接受** | v3 稳定；主题已用 CSS 变量，无强迁移动机 |

### 2.3 技术栈风险与债务

| 项 | 严重度 | 说明 |
|----|--------|------|
| **「不引入新依赖」约束偏紧** | 低–中 | 有利于控制膨胀，但会鼓励「半成品依赖残留」或复制实现；建议改为「新依赖须评审 + 清单记录」 |
| **Tailwind 停留在 v3** | 低 | 非阻塞 |

**栈层面结论**：核心选型与产品匹配度高，**无明显错误选型**；CodeMirror 6 已完整接入，实现编辑模式。

---

## 3. 架构评估

### 3.1 总体风格

采用经典的 **Tauri 双进程模型**：

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (WebView) — React                                 │
│  features / stores / hooks / components                     │
│  lib/ipc.ts（唯一 IPC 出口）                                │
├─────────────────────────────┬───────────────────────────────┤
│  Backend (Rust)             │  plugins: fs · dialog · shell │
│  commands / state / search  │  capabilities + 动态 fs scope │
│  scope / menu / cli         │                               │
└─────────────────────────────┴───────────────────────────────┘
```

这与「本地文件阅读器与编辑器」场景高度契合：**系统敏感能力在 Rust/插件侧，UI 与渲染在 Web 侧**。分层文档（`docs/architecture.md`）与实现大体一致。

### 3.2 后端（Rust）

| 优点 | 说明 |
|------|------|
| Command 边界清晰 | `list_directory`、搜索、watcher、scope、store、export、trash 等按模块拆分 |
| 状态注入规范 | `WatcherState` / `SettingsState` / `SearchState` / `LaunchState` + store manage |
| 能力下沉合理 | 目录遍历、增量搜索事件、文件监控放在 Rust；读文件走 plugin-fs |
| 可测试单元 | `search/walk` 等带 `#[cfg(test)]` |
| 入口简洁 | `main.rs` → CLI → `lib::run()`，职责单一 |

| 改进点 | 说明 |
|--------|------|
| 同步递归 `walk_dir` | 超大目录可能阻塞搜索线程；中长期可考虑 `walkdir` crate 或异步/分批 + 取消更细粒度 |
| command 返回 `Result<T, String>` | 简单够用；错误码/结构化错误尚未需要，符合「不引入 Result 前端类型」约束 |
| 与前端类型双份维护 | `FileEntry` 等在 Rust 序列化 + `shared/types.ts` 手写，缺少 schema 生成；当前规模可接受 |

**后端结论**：**结构健康、职责正确**，是架构中较扎实的一部分。

### 3.3 前端分层

声明式分层：

| 层 | 职责 | 实际符合度 |
|----|------|------------|
| `features/*` | 业务域（file-tree、tabs、markdown-viewer、outline、search、settings、welcome、commands） | **高** |
| `stores/` | 全局 UI（主题、布局、命令面板） | **高** |
| `hooks/` | 跨 feature 副作用（工作区初始化、watcher、快捷键、菜单、滚动、跳转） | **高**，但部分 hook 成为编排层 |
| `components/` | 骨架与通用 UI | **高** |
| `lib/` | IPC、导出、主题、快捷键等基础设施 | **高** |
| `shared/` | 纯函数与共享类型 | **高**（可测性好） |

#### 3.3.1 优点

1. **IPC 单出口**（`lib/ipc.ts` + `ipc.mock.ts`）  
   前端不散落 `invoke`，E2E 可用 route 替换 mock，工程策略成熟。

2. **Feature 目录自包含**  
   组件 + store + 测试同目录，导航成本低。

3. **shared 纯逻辑**  
   大纲、链接解析、文件名校验、阅读统计等与 React 解耦，适合 vitest。

4. **渲染管线安全意识强**  
   `rehype-raw` → `rehype-sanitize` 白名单；外部链走 shell；本地图 `asset://`；CSP 在 `tauri.conf.json` 收紧。

5. **性能意识**  
   Mermaid 动态 import + chunk；编辑内容惰性加载；搜索增量 emit + 上限。

#### 3.3.2 架构张力（需关注）

**A. `App.tsx` 成为「上帝组合根」**

约 370 行：同时挂载十余个 hook、注册命令/菜单/快捷键、组装侧栏/搜索/导出/每日笔记。这是桌面应用常见模式，但已接近「再增长就难测、难改」的阈值。

更干净的方向（不必一次做完）：

- 抽出 `AppShell` / `useAppControllers`（命令·菜单·快捷键共用 handlers）
- 侧栏搜索区独立组件，减少 JSX 嵌套

**B. Store「无交叉依赖」原则与实现不一致**

`architecture.md` 写明 store 各自独立。实际存在：

| 调用方 | 依赖 |
|--------|------|
| `useTabStore` | `useEditorStore`（关标签清缓存） |
| `useFileStore` | `useTabStore`、`useFavoritesStore`（重命名/删除联动） |
| 多个 hooks | 直接 `getState()` 编排多 store |

这在产品上合理（文件删除必须关标签），但文档原则过严。更贴切的表述应是：

- **禁止 React 组件树里 feature store 循环 import 形成隐式图**
- **允许在 action 边界用 `getState()` 做显式协同**，或引入轻量「应用服务」层统一编排

**C. 大组件与编排 hook**

- `FileTree.tsx` ~464 行：树渲染 + 右键 + 重命名 + 拖拽等，后续可拆 `FileTreeNode` / context menu / D&D
- `useWorkspaceInit` 同时管初始化、最近项校验、开文件夹/文件：边界尚可，但测试文件已很大，说明编排复杂

**D. 源码查看双路径未收敛**

- 产品路径：`SourceViewer` + highlight.js  
- 半成品：`lib/codemirror/*` + 依赖树  
  架构上「查看器」与「未来编辑器」边界未决，增加认知负担。

### 3.4 安全架构

| 机制 | 评价 |
|------|------|
| capabilities `fs:scope` 默认 `allow: []` | **优秀**：最小权限 |
| 打开工作区时 `grant_fs_scope` 动态授权 | **优秀** |
| command 层 `ensure_under_allowed_root` | **优秀**：纵深防御 |
| HTML sanitize + CSP | **优秀** |
| 外部 URL 不经 WebView 直跳 | **优秀** |

对本地 Markdown 阅读器与编辑器而言，安全模型** indus­try-solid**，是本项目架构亮点。

### 3.5 数据流

核心流（打开文件 / 搜索 / 热更新）在 `architecture.md` 中描述清晰，与实现一致：

- 打开：scope → tab → editor load → plugin-fs read → Markdown 渲染  
- 搜索：invoke + `search-result` 多播 → store 增量合并  
- 变更：notify → emit `file-change` → editor 更新 + 脏标记 + 滚动保持  

事件多播（search / file-change listener Set）避免重复 `listen`，设计得当。

### 3.6 持久化

- 生产：Rust `settings.json` store（经 invoke）  
- 迁移：localStorage → Rust store 一次性导入  
- E2E：mock 仍用 localStorage  

迁移路径完整，符合从 Electron/localStorage 演进的历史。注意：设置 key 分散在多处 `ipc.store.set`，缺少统一 key 常量模块（部分有 defaults），长期易拼写漂移。

---

## 4. 工程化与质量保障

### 4.1 测试策略

| 层级 | 现状 | 评价 |
|------|------|------|
| 单元（Vitest） | store / hook / 组件 / shared 覆盖广 | **强** |
| E2E（Playwright + mock IPC） | UI 与渲染回归快 | **务实且有效** |
| 真实 Tauri 集成 | **缺失**（文档已明示） | **缺口**：scope、原生菜单、真实 fs、store 路径依赖发布清单 |
| Rust 单元 | 搜索 walk 等有测试 | **中等**，command 层覆盖有限 |
| CI | format · lint · typecheck · test · build · cargo check · e2e · tauri build | **强** |

结论：对当前团队与节奏合理；若要提高发布信心，优先补**少量**真实 Tauri 冒烟（可桌面 CI 或本地脚本），不必上全量 GUI 自动化。

### 4.2 文档与 Agent 约束

| 文档 | 作用 | 健康度 |
|------|------|--------|
| `architecture.md` | 架构真源 | 主体准确，模块表已更新（含 CodeMirror 编辑器、自动保存、冲突检测等） |
| `development.md` | 开发与测试策略 | 清晰 |
| `product.md` | 产品能力 | 已更新，与 package.json 版本一致 |
| `AGENTS.md` | AI/人工约束 | 有利于一致性 |
| `roadmap.md` | 设想 | 标注为参考，合理 |

### 4.3 仓库洁净度

工作区可见历史/构建产物痕迹（如 `coverage/` 含旧 Electron main 覆盖率、`out/`、`release/` 旧 electron-builder 产物）。若未全部 gitignore 或未清理发布包目录，会：

- 干扰新人「当前栈是 Tauri」的判断  
- 增大克隆与误提交风险  

建议保证 **gitignore 覆盖完整**，并定期清理本地产物目录（评估时未必已提交）。

---

## 5. 对照常见架构坏味道

| 坏味道 | 本项目状态 |
|--------|------------|
| 错误的桌面壳选型 | 无（Tauri 合适） |
| 前后端职责倒置（UI 直连任意路径） | 无（scope + IPC） |
| 无边界的全局状态 | 基本无；zustand 分片清楚 |
| 循环依赖 / 隐式 store 图 | **轻度存在**（action 级 getState） |
| 巨石组件 | **中度**（App、FileTree） |
| 过度抽象（Repository/UseCase 满天飞） | 无，克制良好 |
| 安全事后补丁 | 无，设计内建 |
| 测试与实现双轨（mock 漂移） | **有风险**，靠约定同步 ipc.mock |
| 依赖僵尸 | **无**（CodeMirror 已完整接入编辑模式） |

---

## 6. 综合评分

评分说明：5 = 标杆级；4 = 扎实可用；3 = 可接受有债；2 = 明显拖累；1 = 需重构。

| 维度 | 分 | 评语 |
|------|----|------|
| 技术栈匹配度 | **4.5** | 与本地阅读器与编辑器场景高度匹配 |
| 进程与安全架构 | **4.7** | Tauri + scope + sanitize 是亮点 |
| 前端模块化 | **4.0** | feature 划分好，组合根偏重 |
| 后端模块化 | **4.3** | 清晰克制 |
| 状态管理 | **3.8** | zustand 选型好，原则与实现需对齐 |
| 可测试性 | **4.2** | 单元与 mock E2E 强；真集成弱 |
| 工程化 / CI | **4.5** | 完整 |
| 文档与代码一致性 | **3.5** | 有漂移与版本不一致 |
| 依赖卫生 | **4.0** | CodeMirror 已落地；约束合理 |
| **整体** | **4.1 / 5** | **合理且偏优秀**；维护重点是收敛与减负，而非换栈 |

---

## 7. 结论

### 7.1 总体判断

**技术栈合理，架构合理。**  
当前方案是「轻量桌面壳 + 强类型 Web UI + 系统能力下沉 Rust」的教科书式组合，与 Markdown Viewer 产品边界一致。不建议为「更时髦」而更换 React/zustand/Vite，更不建议退回 Electron，除非出现强 Node 生态绑定需求。

### 7.2 最值得保持的设计

1. IPC 集中适配器 + mock 双轨  
2. fs scope 默认拒绝 + 动态授权 + command 校验  
3. feature 目录 + shared 纯函数  
4. 搜索/监控放 Rust、渲染放 Web 的职责切分  
5. CI 与「不擅自加依赖 / 不乱动版本号」的纪律  

### 7.3 优先改进建议（按收益排序）

1. **减轻 `App.tsx` 编排负担**  
   抽出 handlers 与侧栏搜索容器，降低回归成本。

2. **可选：设置 key 常量化**  
   减少 `ipc.store` 字符串散落。

3. **可选：1–3 个真实 Tauri 冒烟用例**  
   覆盖 open folder + grant scope + read + search，补 mock E2E 盲区。

4. **大目录搜索性能**  
   仅在用户反馈卡顿时再投入 walk/异步优化。

### 7.4 不建议的方向

| 方向 | 原因 |
|------|------|
| 全面引入 Redux / 复杂 DI | 收益低，与现有 zustand 冲突 |
| 前端上 monorepo 微包拆分 | 规模不够，增加发布摩擦 |
| 立刻上 Monaco 全家桶 | 体积与「阅读器与编辑器」定位冲突；已选择 CodeMirror 6 |
| 为抽象而抽象 Domain 层 | 当前边界层捕获 + 纯函数已足够 |

---

## 8. 附录：关键路径索引

| 路径 | 角色 |
|------|------|
| `src-tauri/src/lib.rs` | 插件、State、command 注册 |
| `src-tauri/capabilities/default.json` | 权限与空 fs scope |
| `src/renderer/lib/ipc.ts` | IPC 适配器 |
| `src/renderer/App.tsx` | 应用组合根 |
| `src/renderer/features/*` | 业务 feature |
| `src/shared/*` | 共享纯逻辑与类型 |
| `docs/architecture.md` | 架构说明（评估时部分滞后） |
| `docs/development.md` | 开发与测试策略 |

---

*本报告基于仓库源码结构、`docs/architecture.md` 及依赖清单的静态评估，未跑性能基准与全量用户验收。*
