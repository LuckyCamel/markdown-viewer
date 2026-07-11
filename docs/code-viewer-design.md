# 代码文件高亮支持：可行性分析与实施方案

## 背景与目标

当前应用定位为「Markdown 阅读器」，仅支持 `.md` / `.markdown` 文件的浏览与渲染。随着使用场景扩展，用户需要在同一应用内浏览常见代码文件并获得语法高亮。

**目标**：将应用从「Markdown 专属阅读器」扩展为「带 Markdown 渲染的通用代码/文本查看器」，支持 20+ 种主流编程语言的语法高亮浏览。

---

## 可行性分析

### 技术可行性：高

**现有基础：**

- **highlight.js 已引入**：`src/renderer/lib/highlight.ts` 已注册 13 种常见语言（JS/TS/Python/Bash/JSON/Markdown/XML/CSS/YAML/SQL/Go/Rust/Java）
- **源码查看器已存在**：`SourceViewer.tsx` 组件已具备高亮显示能力，只需扩展为动态语言检测
- **文件读取机制完善**：`useEditorStore.ts` 已支持任意文本文件读取
- **代码主题系统已建立**：`codeThemes.ts` 已实现 6 套代码主题 + CSS 变量切换

**潜在挑战：**

- 当前文件树和搜索逻辑硬编码了 `isMarkdown` 过滤
- 大纲功能仅适用于 Markdown 文件
- 内容搜索的 `is_text_file` 列表需要扩展

### 包大小影响：极小

- highlight.js 已在依赖中，增加语言注册不会显著增加体积（按需引入）
- 不引入新依赖，符合项目约束
- 预估前端 bundle 增量 < 50KB

### 工作量评估：中等

预估开发工作量约 2-3 天，涉及前后端约 10+ 个文件的修改。

---

## 总体设计思路

1. **文件类型分层**：区分「可渲染文件」（Markdown）和「纯代码文件」（其他文本文件）
2. **视图模式差异化**：
   - Markdown 文件：支持「渲染模式」和「源码模式」切换
   - 代码文件：只有「源码模式」（高亮显示）
3. **渐进式扩展**：先支持常见 20+ 种语言，后续可配置扩展

### 文件类型判断流程

```
文件路径
  │
  ├─ 扩展名在 Markdown 扩展名列表中？
  │    └─ 是 → Markdown 文件（支持渲染 + 源码两种视图）
  │
  └─ 扩展名在代码扩展名映射中？
       └─ 是 → 代码文件（仅源码高亮视图）
```

---

## 详细实施方案

### Phase 1：核心功能（当前迭代）

#### 1. 统一文件类型判断（共享层）

**新增文件**：`src/shared/fileTypes.ts`

- 定义 `CODE_EXTENSIONS`：扩展名 → highlight.js 语言名映射
- 提供工具函数：`isMarkdownFile()`、`isCodeFile()`、`isTextFile()`、`getHighlightLanguage()`、`getExtension()`
- Markdown 扩展名列表从 `settingsDefaults.ts` 迁移或复用

**修改文件**：`src/shared/types.ts`

- `FileEntry` 新增 `isTextFile: boolean` 字段
- 保留 `isMarkdown` 字段以兼容（后续版本可移除）

**修改文件**：`src/shared/settingsDefaults.ts`

- `isVisibleFileEntry` 改为：目录 + 所有文本文件（不再仅 Markdown）
- 保留 `DEFAULT_MARKDOWN_EXTENSIONS` 供复用

#### 2. 扩展 highlight.js 语言注册

**修改文件**：`src/renderer/lib/highlight.ts`

新增注册 10+ 种常见语言：

| 语言 | 扩展名 | highlight.js 模块 |
|------|--------|-------------------|
| C | .c, .h | c |
| C++ | .cpp, .cc, .cxx, .hpp | cpp |
| C# | .cs | csharp |
| PHP | .php | php |
| Ruby | .rb | ruby |
| Swift | .swift | swift |
| Kotlin | .kt, .kts | kotlin |
| Dart | .dart | dart |
| Vue | .vue | xml（复用） |
| Dockerfile | Dockerfile | dockerfile |
| Makefile | Makefile | makefile |
| TOML | .toml | toml |
| Ini | .ini, .cfg | ini |

**注意**：使用 `import lang from 'highlight.js/lib/languages/xxx'` 按需引入，避免全量引入。

#### 3. SourceViewer 增强：动态语言高亮

**修改文件**：`src/renderer/features/markdown-viewer/SourceViewer.tsx`

- 根据 `filePath` 动态计算 `languageClass`
- 从自定义 `highlight.ts`（而非 `'highlight.js'`）导入 hljs
- 未知语言降级为 `language-plaintext`

#### 4. App.tsx 渲染逻辑调整

**修改文件**：`src/renderer/App.tsx`

核心逻辑变更：

```
activeFile
  ├─ 是 Markdown 文件?
  │    ├─ viewMode === 'render' → MarkdownViewer + Outline
  │    └─ viewMode === 'source' → SourceViewer + Outline
  └─ 是代码/文本文件?
       └─ 始终 → SourceViewer（无 Outline）
```

变更点：

- 大纲面板（Outline）仅在 Markdown 文件时显示
- 视图模式切换（viewMode）仅对 Markdown 文件有效
- 代码文件始终显示 SourceViewer

#### 5. 文件树与搜索扩展

**修改文件**：`src/renderer/features/file-tree/FileTree.tsx`

- 过滤条件从「目录 + Markdown」改为「目录 + 所有文本文件」
- 复用 `isVisibleFileEntry`（已在 settingsDefaults.ts 中修改）

**修改文件**：`src/renderer/features/search/FileSearch.tsx`

- `allFiles` 收集逻辑扩展为所有文本文件，而非仅 Markdown
- 过滤条件从 `entry.isMarkdown` 改为 `entry.isTextFile`

**修改文件**：`src/renderer/App.tsx`

- 同上述 `allFiles` 计算逻辑调整

#### 6. 后端 Rust 层适配

**修改文件**：`src-tauri/src/state/settings.rs`

- 扩展 `is_text_file()` 方法的扩展名列表（与前端 `CODE_EXTENSIONS` 对齐）
- 用于内容搜索的文件类型过滤

**修改文件**：`src-tauri/src/commands/directory.rs`

- `list_directory` 返回的 JSON 新增 `isTextFile` 字段
- 保留 `isMarkdown` 字段以兼容

---

### Phase 2：体验优化（后续迭代）

1. **文件图标完善**：`FileIcon.tsx` 覆盖更多代码文件类型的 SVG 图标
2. **行号显示**：SourceViewer 增加行号侧边栏
3. **代码内容跳转**：支持从搜索结果跳转到指定行号
4. **可配置扩展名**：设置面板增加「支持的文件类型」配置项
5. **大文件限制**：设置文件大小上限（如 5MB），超出时提示
6. **二进制文件检测**：基于内容检测，避免打开二进制文件

---

## 涉及文件清单

### Phase 1 文件清单

| 层级 | 文件 | 改动类型 |
|------|------|----------|
| **共享层** | `src/shared/fileTypes.ts` | 新增 |
| | `src/shared/types.ts` | 修改：FileEntry 新增 isTextFile |
| | `src/shared/settingsDefaults.ts` | 修改：可见文件判断扩展 |
| **前端渲染** | `src/renderer/lib/highlight.ts` | 修改：增加语言注册 |
| | `src/renderer/features/markdown-viewer/SourceViewer.tsx` | 修改：动态语言检测 |
| | `src/renderer/App.tsx` | 修改：渲染分发逻辑 + allFiles + Outline |
| | `src/renderer/features/file-tree/FileTree.tsx` | 修改：文件过滤（依赖 settingsDefaults） |
| | `src/renderer/features/search/FileSearch.tsx` | 修改：搜索范围（依赖 allFiles 传入） |
| **后端 Rust** | `src-tauri/src/state/settings.rs` | 修改：is_text_file 扩展 |
| | `src-tauri/src/commands/directory.rs` | 修改：返回 isTextFile 字段 |

---

## 风险与注意事项

### 1. 二进制文件防护

**风险**：用户可能尝试打开二进制文件（如图片、可执行文件），导致界面卡顿或乱码。

**缓解措施**：
- 基于扩展名白名单，仅支持已知文本/代码扩展名
- 后续 Phase 2 可增加内容检测（检查前 N 字节 NULL 字符比例）

### 2. 大文件性能

**风险**：打开大代码文件（如 > 10MB）可能导致 UI 卡顿。

**缓解措施**：
- Phase 2 实现文件大小上限提示
- highlight.js 对大文件有一定性能开销，建议限制在 5MB 以内

### 3. 向后兼容

- `isMarkdown` 字段保留至下一个 minor 版本，避免破坏现有逻辑
- 已有的 `markdownExtensions` 配置保留并继续生效

### 4. CSP 安全

- 代码文件高亮不涉及 HTML 注入（纯文本 + CSS 类名）
- 安全风险低，无需调整 CSP 策略

---

## 验证标准

Phase 1 完成后需满足：

1. **文件树**：工作区中所有代码文件可见，可点击打开
2. **文件打开**：点击代码文件后，右侧显示带语法高亮的源码
3. **Markdown 兼容**：原有 Markdown 渲染和源码切换功能不受影响
4. **大纲**：仅 Markdown 文件显示大纲，代码文件不显示
5. **搜索**：文件搜索和内容搜索覆盖所有文本文件
6. **主题**：代码主题切换对所有代码文件生效
7. **测试**：现有单元测试通过，E2E 测试通过
8. **类型检查**：`tsc --noEmit --skipLibCheck` 无错误
9. **Rust 检查**：`cargo check` 无错误
