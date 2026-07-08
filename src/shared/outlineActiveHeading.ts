export interface HeadingScrollOffset {
  id: string
  /** 标题相对滚动容器内容顶部的 offsetTop */
  top: number
}

/** 视口顶部参考线偏移（px），标题滚过此线即视为当前节 */
export const OUTLINE_SCROLL_OFFSET = 64

/**
 * 根据滚动位置选取当前应高亮的大纲标题 id。
 * 取尚未滚过参考线的最后一个标题，滚动过程中高亮单调前进、不回跳。
 */
export function pickActiveHeadingByScroll(
  headings: readonly HeadingScrollOffset[],
  scrollTop: number,
  offsetTop = OUTLINE_SCROLL_OFFSET,
): string | null {
  if (headings.length === 0) return null

  const threshold = scrollTop + offsetTop
  let activeId = headings[0].id

  for (const heading of headings) {
    if (heading.top <= threshold) {
      activeId = heading.id
    } else {
      break
    }
  }

  return activeId
}

/**
 * 测量标题在滚动容器内的 top 偏移
 */
export function measureHeadingOffsets(
  container: HTMLElement,
  headingIds: readonly string[],
): HeadingScrollOffset[] {
  const containerRect = container.getBoundingClientRect()
  const scrollTop = container.scrollTop
  const offsets: HeadingScrollOffset[] = []

  for (const id of headingIds) {
    const el = document.getElementById(id)
    if (!el) continue
    const top = el.getBoundingClientRect().top - containerRect.top + scrollTop
    offsets.push({ id, top })
  }

  return offsets
}
