import { describe, it, expect } from 'vitest'
import { pickActiveHeadingByScroll } from './outlineActiveHeading'

describe('pickActiveHeadingByScroll', () => {
  const headings = [
    { id: 'title', top: 0 },
    { id: 'section-1', top: 400 },
    { id: 'section-2', top: 900 },
  ]

  it('无标题时返回 null', () => {
    expect(pickActiveHeadingByScroll([], 0)).toBeNull()
  })

  it('顶部时高亮第一个标题', () => {
    expect(pickActiveHeadingByScroll(headings, 0)).toBe('title')
  })

  it('滚过 section-1 后高亮 section-1，不回跳 title', () => {
    expect(pickActiveHeadingByScroll(headings, 350, 64)).toBe('title')
    expect(pickActiveHeadingByScroll(headings, 400, 64)).toBe('section-1')
    expect(pickActiveHeadingByScroll(headings, 600, 64)).toBe('section-1')
  })

  it('滚过 section-2 后高亮 section-2', () => {
    expect(pickActiveHeadingByScroll(headings, 900, 64)).toBe('section-2')
    expect(pickActiveHeadingByScroll(headings, 2000, 64)).toBe('section-2')
  })
})
