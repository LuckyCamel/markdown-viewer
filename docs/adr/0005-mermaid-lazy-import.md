# ADR-0005: mermaid 动态 import 策略

## 元数据
- **状态**：已采纳
- **日期**：2026-07-07
- **决策者**：AI agent + 用户

## 上下文
mermaid 库体积较大（~1.5 MB gzipped），并非所有 Markdown 文件都包含 mermaid 图表。如果作为静态 import 打包，会显著增加初始加载体积和内存占用。需要决定 mermaid 的加载策略。

## 选项

- **选项 A：静态 import** — 构建时打包进主 bundle
  - 优：首次渲染无延迟
  - 劣：~1.5 MB 始终加载，即使文档不含 mermaid 代码块；影响首屏时间

- **选项 B：动态 import + 单例缓存（采纳）** — 首次遇到 mermaid 代码块时 import，后续复用实例
  - 优：不含 mermaid 的文档零额外开销；加载一次后常驻内存，后续渲染无延迟
  - 劣：首次遇到 mermaid 代码块有短暂加载延迟；需管理单例生命周期

- **选项 C：iframe 隔离** — 在独立 iframe 中渲染 mermaid
  - 优：样式完全隔离，避免 CSS 冲突
  - 劣：通信复杂；多图表场景下 iframe 管理开销大；首屏同样需等待加载

## 决策
选择选项 B：动态 import + 单例缓存。

- `src/renderer/features/markdown-viewer/mermaid.ts` 导出 `getMermaid()` 函数
- 模块级 `mermaidInstance` 变量持有单例，首次调用时 `await import('mermaid')` 并 `initialize({ startOnLoad: false })`
- `MermaidBlock` 组件在 `useEffect` 中调用 `getMermaid()`，通过 `cancelled` 标志防止卸载后更新 DOM
- Vite 自动将 `import('mermaid')` 代码分割为独立 chunk

## 后果
- **正面**：非 mermaid 文档首屏体积减少 ~1.5 MB；单例保证内存中只有一份 mermaid 实例；代码分割天然支持
- **负面**：首次 mermaid 渲染有网络延迟（生产环境为本地文件读取，影响极小）；单例需确保 initialize 只执行一次
- **现状**：`mermaid.ts` + `MermaidBlock.tsx` 实现稳定，mermaid 11.x 兼容良好
