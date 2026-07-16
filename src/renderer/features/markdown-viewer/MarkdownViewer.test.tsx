import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MarkdownViewer } from './MarkdownViewer'

describe('MarkdownViewer', () => {
  it('should render markdown content', () => {
    render(<MarkdownViewer content="# Hello\nWorld" />)
    expect(screen.getByRole('heading', { level: 1 })).toBeDefined()
  })

  it('should render GFM table', () => {
    const content = '| A | B |\n|---|--|\n| 1 | 2 |'
    const { container } = render(<MarkdownViewer content={content} />)
    const table = container.querySelector('table')
    expect(table).not.toBeNull()
    expect(table?.querySelector('td')?.textContent).toBe('1')
  })

  it('should render inline code without backticks', () => {
    const { container } = render(<MarkdownViewer content="`hello world`" />)
    const codeElement = container.querySelector('code')
    expect(codeElement).not.toBeNull()
    expect(codeElement?.textContent).toBe('hello world')
    expect(codeElement?.textContent).not.toContain('`')
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

  it('表格中的行内代码应正确渲染，不显示反引号', () => {
    const content = '| 测试列 |\n|--------|\n| `hello world` |'
    const { container } = render(<MarkdownViewer content={content} />)
    const codeElement = container.querySelector('td code')
    expect(codeElement).not.toBeNull()
    expect(codeElement?.textContent).toBe('hello world')
    expect(codeElement?.textContent).not.toContain('`')
  })

  it('实际文件内容：表格中的行内代码应正确渲染', () => {
    const content =
      '# CLAUDE.md\n\n## 目录定位\n\n| 目录 | 定位 |\n|------|------|\n| `base/` | 设备活跃度统计项目 |\n| `datafact/` | 数据工厂 |\n'
    const { container } = render(<MarkdownViewer content={content} />)
    console.log('Actual HTML:', container.innerHTML)
    const table = container.querySelector('table')
    expect(table).not.toBeNull()
    const codeElements = container.querySelectorAll('td code')
    expect(codeElements.length).toBeGreaterThan(0)
    expect(codeElements[0]?.textContent).toBe('base/')
    expect(codeElements[0]?.textContent).not.toContain('`')
  })
})
