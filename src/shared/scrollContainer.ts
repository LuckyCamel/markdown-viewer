/** Markdown 正文滚动容器选择器，与 App.tsx data-scroll-container 对应 */
export const SCROLL_CONTAINER_SELECTOR = '[data-scroll-container]'

const BLOCK_SELECTOR = 'p, li, td, th, h1, h2, h3, h4, h5, h6, pre, blockquote, code'

/**
 * 在正文滚动容器内平滑滚动到指定元素
 */
export function scrollToElementInContainer(element: HTMLElement): boolean {
  const container = document.querySelector(SCROLL_CONTAINER_SELECTOR)
  if (!(container instanceof HTMLElement)) return false

  const containerRect = container.getBoundingClientRect()
  const elementRect = element.getBoundingClientRect()
  const top = elementRect.top - containerRect.top + container.scrollTop
  container.scrollTo({ top, behavior: 'smooth' })
  return true
}

/**
 * 按源码行号比例估算滚动位置（兜底方案）
 */
export function scrollToApproxLine(line: number, content: string): boolean {
  const container = document.querySelector(SCROLL_CONTAINER_SELECTOR)
  if (!(container instanceof HTMLElement)) return false

  const totalLines = content.split('\n').length
  if (totalLines <= 1 || line < 1) return false

  const ratio = (line - 1) / (totalLines - 1)
  const top = ratio * (container.scrollHeight - container.clientHeight)
  container.scrollTo({ top, behavior: 'smooth' })
  return true
}

/**
 * 在正文中查找匹配片段并滚动到首个命中块级元素
 */
export function scrollToTextInContainer(snippet: string): boolean {
  const container = document.querySelector(SCROLL_CONTAINER_SELECTOR)
  if (!(container instanceof HTMLElement)) return false

  const needle = snippet.trim()
  if (!needle) return false

  for (const el of container.querySelectorAll(BLOCK_SELECTOR)) {
    if (el.textContent?.includes(needle)) {
      return scrollToElementInContainer(el as HTMLElement)
    }
  }
  return false
}

/**
 * 滚动到正文中的锚点 id（兼容 encode 与 heading slug）
 */
export function scrollToAnchor(anchor: string): boolean {
  const decoded = decodeURIComponent(anchor)
  const el = document.getElementById(decoded) ?? document.getElementById(anchor)
  if (!el) return false
  return scrollToElementInContainer(el)
}

/**
 * 在 SourceViewer 中按行号精确定位并高亮
 *
 * 查找 .source-viewer 容器内的 [data-line=N] 元素，滚动到该行并短暂高亮。
 * 如果找不到 SourceViewer，返回 false。
 */
export function scrollToSourceLine(line: number): boolean {
  const sourceViewer = document.querySelector('.source-viewer')
  if (!(sourceViewer instanceof HTMLElement)) return false

  const lineEl = sourceViewer.querySelector(`[data-line="${line}"]`)
  if (!(lineEl instanceof HTMLElement)) return false

  const containerRect = sourceViewer.getBoundingClientRect()
  const lineRect = lineEl.getBoundingClientRect()
  const top = lineRect.top - containerRect.top + sourceViewer.scrollTop - 20
  sourceViewer.scrollTo({ top, behavior: 'smooth' })

  lineEl.classList.add('bg-yellow-200', 'dark:bg-yellow-900')
  setTimeout(() => {
    lineEl.classList.remove('bg-yellow-200', 'dark:bg-yellow-900')
  }, 2000)

  return true
}

/**
 * 内容搜索跳转：优先 SourceViewer 精确行定位，其次匹配行片段，失败则按行号估算
 */
export function scrollToContentMatch(
  line: number,
  lineContent: string,
  fileContent: string,
): boolean {
  if (scrollToSourceLine(line)) return true
  if (scrollToTextInContainer(lineContent)) return true
  return scrollToApproxLine(line, fileContent)
}
