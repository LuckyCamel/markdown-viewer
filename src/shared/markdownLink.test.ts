import { describe, it, expect } from 'vitest'
import { isInternalMarkdownHref, parseMarkdownHref } from './markdownLink'

describe('markdownLink', () => {
  it('识别 .md / .markdown 与纯锚点', () => {
    expect(isInternalMarkdownHref('other.md')).toBe(true)
    expect(isInternalMarkdownHref('other.markdown')).toBe(true)
    expect(isInternalMarkdownHref('#section')).toBe(true)
    expect(isInternalMarkdownHref('https://example.com')).toBe(false)
  })

  it('解析文件 + 锚点', () => {
    expect(parseMarkdownHref('doc.markdown#intro')).toEqual({
      filePart: 'doc.markdown',
      anchor: 'intro',
    })
  })

  it('解析纯锚点', () => {
    expect(parseMarkdownHref('#%E7%AE%80%E4%BB%8B')).toEqual({ anchor: '简介' })
  })
})
