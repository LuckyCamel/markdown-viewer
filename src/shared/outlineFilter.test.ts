import { describe, it, expect } from 'vitest'
import { filterVisibleHeadings } from './outlineFilter'
import type { ExtractedHeading } from './extractHeadings'

/**
 * 大纲折叠过滤纯函数测试
 * 覆盖：无折叠、根标题折叠、嵌套折叠、全部折叠、空数组
 */
const headings: ExtractedHeading[] = [
  { level: 1, text: 'A', id: 'a' },
  { level: 2, text: 'A.1', id: 'a-1' },
  { level: 3, text: 'A.1.1', id: 'a-1-1' },
  { level: 2, text: 'A.2', id: 'a-2' },
  { level: 1, text: 'B', id: 'b' },
]

describe('filterVisibleHeadings', () => {
  it('无折叠时返回全部标题', () => {
    const visible = filterVisibleHeadings(headings, new Set())
    expect(visible.map((h) => h.id)).toEqual(['a', 'a-1', 'a-1-1', 'a-2', 'b'])
  })

  it('折叠根标题（level 1）隐藏其所有下级标题', () => {
    const visible = filterVisibleHeadings(headings, new Set(['a']))
    expect(visible.map((h) => h.id)).toEqual(['a', 'b'])
  })

  it('嵌套折叠：折叠 level 2 标题只隐藏 level 3+，不影响 level 2 同级', () => {
    const visible = filterVisibleHeadings(headings, new Set(['a-1']))
    expect(visible.map((h) => h.id)).toEqual(['a', 'a-1', 'a-2', 'b'])
  })

  it('全部折叠：只显示 level 1 标题', () => {
    const visible = filterVisibleHeadings(headings, new Set(['a', 'b']))
    expect(visible.map((h) => h.id)).toEqual(['a', 'b'])
  })

  it('空数组返回空数组', () => {
    const visible = filterVisibleHeadings([], new Set())
    expect(visible).toEqual([])
  })
})
