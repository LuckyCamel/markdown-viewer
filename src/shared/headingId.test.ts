import { describe, it, expect } from 'vitest'
import { headingToId } from './headingId'

describe('headingToId', () => {
  it('英文标题生成 slug', () => {
    expect(headingToId('Section 1')).toBe('section-1')
  })

  it('中文标题保留字符', () => {
    expect(headingToId('简介')).toBe('简介')
  })

  it('中英混合标题', () => {
    expect(headingToId('第一章 Introduction')).toBe('第一章-introduction')
  })

  it('去除 Markdown 行内标记', () => {
    expect(headingToId('**Bold** Title')).toBe('bold-title')
  })
})
