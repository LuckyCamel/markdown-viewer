import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MarkdownViewer } from './MarkdownViewer'

describe('MarkdownViewer', () => {
  it('should render markdown content', () => {
    render(<MarkdownViewer content="# Hello\nWorld" />)
    expect(screen.getByRole('heading', { level: 1 })).toBeDefined()
  })

  it('should render GFM table', () => {
    render(<MarkdownViewer content="| A | B |\n|---|--|\n| 1 | 2 |" />)
    expect(screen.getByText(/1/)).toBeDefined()
  })

  it('应为标题注入 id 供大纲跳转', () => {
    render(<MarkdownViewer content="## 简介" />)
    expect(document.getElementById('简介')).not.toBeNull()
  })

  it('应过滤 XSS 向量', () => {
    const { container } = render(
      <MarkdownViewer
        content={'<img src=x onerror="alert(1)">\n<a href="javascript:alert(1)">x</a>'}
      />,
    )
    expect(container.querySelector('[onerror]')).toBeNull()
    const link = container.querySelector('a')
    if (link) {
      expect(link.getAttribute('href') ?? '').not.toMatch(/^javascript:/i)
    }
  })

  it('应保留白名单 inline HTML', () => {
    render(<MarkdownViewer content="<u>underline</u>\n<kbd>Ctrl</kbd>" />)
    expect(document.querySelector('u')?.textContent).toBe('underline')
    expect(document.querySelector('kbd')?.textContent).toBe('Ctrl')
  })
})
