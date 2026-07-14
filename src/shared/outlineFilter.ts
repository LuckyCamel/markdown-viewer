import type { ExtractedHeading } from './extractHeadings'

/**
 * 根据折叠状态过滤标题列表
 *
 * 遍历标题，遇到已折叠标题时记录其 level，后续 level 更大的标题视为
 * 其子级而跳过；遇到 level 不大于该阈值的标题时恢复显示。
 *
 * @param headings - 完整标题列表（按文档顺序）
 * @param collapsedIds - 已折叠的 headingId 集合
 * @returns 可见标题列表
 */
export function filterVisibleHeadings(
  headings: ExtractedHeading[],
  collapsedIds: Set<string>,
): ExtractedHeading[] {
  const visible: ExtractedHeading[] = []
  let skipUntilLevel: number | null = null

  for (const heading of headings) {
    if (skipUntilLevel !== null && heading.level > skipUntilLevel) {
      continue
    }
    skipUntilLevel = null
    visible.push(heading)
    if (collapsedIds.has(heading.id)) {
      skipUntilLevel = heading.level
    }
  }

  return visible
}
