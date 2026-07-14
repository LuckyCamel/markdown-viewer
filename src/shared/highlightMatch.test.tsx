import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { highlightMatchSegments } from './highlightMatch'

/**
 * 测试用包装组件：将 highlightMatchSegments 的返回节点数组渲染到 DOM 中
 * 以便使用 @testing-library/react 验证 <mark> 高亮输出
 */
function HighlightRenderer({ text, query }: { text: string; query: string }) {
  return <div data-testid="root">{highlightMatchSegments(text, query)}</div>
}

describe('highlightMatchSegments', () => {
  it('空 query 返回原始文本（无 mark 元素）', () => {
    const { container } = render(<HighlightRenderer text="readme.md" query="" />)
    expect(container.querySelectorAll('mark')).toHaveLength(0)
    expect(screen.getByText('readme.md')).toBeDefined()
  })

  it('query 不在文本中时返回原始文本（无 mark 元素）', () => {
    const { container } = render(<HighlightRenderer text="readme.md" query="xyz" />)
    expect(container.querySelectorAll('mark')).toHaveLength(0)
    expect(screen.getByText('readme.md')).toBeDefined()
  })

  it('单匹配：正确分割为前缀、<mark>匹配</mark>、后缀', () => {
    const { container } = render(<HighlightRenderer text="readme.md" query="me" />)
    const marks = container.querySelectorAll('mark')
    expect(marks).toHaveLength(1)
    expect(marks[0].textContent).toBe('me')
    // 前缀 + 高亮 + 后缀 拼接后应还原原始文本
    expect(container.textContent).toBe('readme.md')
  })

  it('多匹配：所有匹配片段都被高亮', () => {
    const { container } = render(<HighlightRenderer text="abcabcabc" query="a" />)
    const marks = container.querySelectorAll('mark')
    expect(marks).toHaveLength(3)
    marks.forEach((m) => expect(m.textContent).toBe('a'))
    expect(container.textContent).toBe('abcabcabc')
  })

  it('大小写不敏感匹配（原始大小写保留在 mark 中）', () => {
    const { container } = render(<HighlightRenderer text="README.md" query="read" />)
    const marks = container.querySelectorAll('mark')
    expect(marks).toHaveLength(1)
    // mark 中保留原始文本的大小写
    expect(marks[0].textContent).toBe('READ')
    expect(container.textContent).toBe('README.md')
  })

  it('空 query 返回原始文本', () => {
    const { container } = render(<HighlightRenderer text="index.ts" query="" />)
    expect(container.querySelectorAll('mark')).toHaveLength(0)
    expect(screen.getByText('index.ts')).toBeDefined()
  })
})
