export interface ExtractedHeading {
  level: number
  text: string
  id: string
}

const FENCE_LINE = /^(`{3,}|~{3,})(.*)$/
const ATX_HEADING = /^(#{1,6})\s+(.+)$/

/**
 * 从 Markdown 源码提取 ATX 标题，跳过围栏代码块内的伪标题行
 */
export function extractHeadings(
  markdown: string,
  toId: (text: string) => string,
): ExtractedHeading[] {
  const headings: ExtractedHeading[] = []
  const lines = markdown.split('\n')

  let inFence = false
  let fenceMarker = ''
  let fenceLength = 0

  for (const line of lines) {
    const fenceMatch = line.match(FENCE_LINE)
    if (fenceMatch) {
      const marker = fenceMatch[1][0]
      const length = fenceMatch[1].length
      if (!inFence) {
        inFence = true
        fenceMarker = marker
        fenceLength = length
      } else if (marker === fenceMarker && length >= fenceLength) {
        inFence = false
      }
      continue
    }

    if (inFence) continue

    const match = line.match(ATX_HEADING)
    if (!match) continue

    const level = match[1].length
    const text = match[2].replace(/[`*_~[\]]/g, '')
    headings.push({ level, text, id: toId(text) })
  }

  return headings
}
