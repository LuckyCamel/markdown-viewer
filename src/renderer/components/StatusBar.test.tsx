import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBar } from './StatusBar'
import type { ReadingStats } from '../../shared/readingStats'

describe('StatusBar', () => {
  it('有统计时显示「N 字 · M 分钟阅读」', () => {
    const stats: ReadingStats = {
      chars: 11,
      charsNoSpaces: 10,
      words: 2,
      readTimeMin: 1,
    }
    render(<StatusBar stats={stats} />)
    expect(screen.getByText('2 字')).toBeDefined()
    expect(screen.getByText('1 分钟阅读')).toBeDefined()
    expect(screen.getByText('·')).toBeDefined()
  })

  it('无统计（null）时不显示', () => {
    const { container } = render(<StatusBar stats={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('统计为 0 字时显示「0 字 · 1 分钟阅读」', () => {
    const stats: ReadingStats = {
      chars: 0,
      charsNoSpaces: 0,
      words: 0,
      readTimeMin: 1,
    }
    render(<StatusBar stats={stats} />)
    expect(screen.getByText('0 字')).toBeDefined()
    expect(screen.getByText('1 分钟阅读')).toBeDefined()
  })
})
