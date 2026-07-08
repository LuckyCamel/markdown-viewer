const MARKDOWN_EXT = /\.(md|markdown)$/i

export interface ParsedMarkdownHref {
  /** 相对路径；纯锚点链接时为 undefined */
  filePart?: string
  /** URL 片段（已 decode） */
  anchor?: string
}

/**
 * 判断是否为应用内处理的 Markdown 链接（非 http/mailto）
 */
export function isInternalMarkdownHref(href: string): boolean {
  if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('asset:'))
    return false
  if (href.startsWith('#')) return true
  const pathPart = href.split('#')[0]
  return MARKDOWN_EXT.test(pathPart)
}

/**
 * 解析 Markdown 相对链接与 #anchor
 */
export function parseMarkdownHref(href: string): ParsedMarkdownHref {
  if (href.startsWith('#')) {
    return { anchor: decodeURIComponent(href.slice(1)) }
  }

  const hashIdx = href.indexOf('#')
  if (hashIdx === -1) {
    return { filePart: href }
  }

  return {
    filePart: href.slice(0, hashIdx) || undefined,
    anchor: decodeURIComponent(href.slice(hashIdx + 1)),
  }
}
