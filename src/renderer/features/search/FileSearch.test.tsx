import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FileSearch } from './FileSearch'

describe('FileSearch', () => {
  it('should render search input', () => {
    render(<FileSearch files={[]} onSelect={() => {}} />)
    expect(screen.getByPlaceholderText(/search/i)).toBeDefined()
  })

  it('should filter files by name', () => {
    const files = [
      { path: '/a/readme.md', name: 'readme.md' },
      { path: '/b/index.md', name: 'index.md' },
    ]
    render(<FileSearch files={files} onSelect={() => {}} />)
    const input = screen.getByPlaceholderText(/search/i)
    fireEvent.change(input, { target: { value: 'readme' } })
    // 文件名被 <mark> 高亮分割，使用函数匹配器检查 textContent
    expect(screen.getByText((_, el) => el?.textContent === 'readme.md')).toBeDefined()
  })
})
