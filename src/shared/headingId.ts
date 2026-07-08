/**
 * 从标题文本生成 DOM id，Outline 与 Markdown 渲染共用同一算法
 */
export function headingToId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_~[\]]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
}
