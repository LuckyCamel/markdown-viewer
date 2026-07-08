/**
 * 从标题文本生成 DOM id，Outline 与 Markdown 渲染共用同一算法。
 * 保留 Unicode 字母/数字（含中文），避免 CJK 标题生成空 id。
 */
export function headingToId(text: string): string {
  return text
    .replace(/[`*_~[\]]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]+/gu, '')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}
