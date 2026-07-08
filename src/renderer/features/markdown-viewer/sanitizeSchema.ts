import { defaultSchema } from 'rehype-sanitize'

/**
 * Markdown 渲染白名单 schema：在默认安全 schema 上允许常用排版标签
 */
export const markdownSanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'u', 'kbd', 'mark', 'sub', 'sup'],
}
