# ADR-0007: Markdown inline HTML 消毒

## 元数据
- **状态**：已采纳
- **日期**：2026-07-09
- **决策者**：用户（G1–G3 批准推荐方案 B+C）

## 上下文

`rehype-raw` 允许 Markdown 内嵌 HTML 渲染。仅靠 CSP（`script-src 'self'`）无法阻断 `onerror`、`javascript:` 等向量。

## 决策

采用 **rehype-sanitize 白名单 + CSP 补充**：

1. 插件链：`rehypeRaw` → `rehypeSanitize(schema)` → `rehypeHeadingIds` → …
2. 自定义 schema（`sanitizeSchema.ts`）：在默认 schema 上允许 `u`、`kbd`、`mark`、`sub`、`sup` 等排版标签
3. CSP 增加 `object-src 'none'`、`base-uri 'none'`

## 后果

- **正面**：保留常用 inline HTML（如 `<u>`、`<kbd>`）；XSS 向量被过滤
- **负面**：非白名单 HTML 标签不渲染；需维护 schema
- **依赖**：`rehype-sanitize`（已在 `AGENTS.md` 登记例外）
