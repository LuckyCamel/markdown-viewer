import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useReadingStats } from './useReadingStats'

describe('useReadingStats', () => {
  it('content 变化时重新计算', () => {
    const { result, rerender } = renderHook(({ content }) => useReadingStats(content), {
      initialProps: { content: 'hello' },
    })
    expect(result.current?.words).toBe(1)

    rerender({ content: 'hello world' })
    expect(result.current?.words).toBe(2)
  })

  it('content 不变时返回缓存值（同一引用）', () => {
    const { result, rerender } = renderHook(({ content }) => useReadingStats(content), {
      initialProps: { content: 'hello world' },
    })
    const first = result.current

    // 传入相同 content 引用，重新渲染应返回同一引用
    rerender({ content: 'hello world' })
    expect(result.current).toBe(first)
  })

  it('content 为空字符串时返回 null', () => {
    const { result } = renderHook(() => useReadingStats(''))
    expect(result.current).toBeNull()
  })

  it('content 为 undefined 时返回 null', () => {
    const { result } = renderHook(() => useReadingStats(undefined))
    expect(result.current).toBeNull()
  })
})
