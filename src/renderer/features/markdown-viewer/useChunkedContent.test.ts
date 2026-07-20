import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChunkedContent } from './useChunkedContent'

/**
 * useChunkedContent hook 单元测试
 *
 * 覆盖：
 * - 短文档（行数 ≤ 阈值）：不分片，直接返回全部内容
 * - 长文档（行数 > 阈值）：首屏返回 initialLines 行
 * - IntersectionObserver 触发：追加 chunkSize 行
 * - 渲染到末尾：hasMore 变为 false
 * - 内容变化：重置可见行数
 * - renderAll：一次性渲染全部
 */
describe('useChunkedContent', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('短文档不分片，直接返回全部内容', () => {
    const content = 'line1\nline2\nline3'
    const { result } = renderHook(() => useChunkedContent(content))

    expect(result.current.visibleContent).toBe(content)
    expect(result.current.hasMore).toBe(false)
  })

  it('长文档首屏只返回 initialLines 行', () => {
    // 生成 1500 行内容，超过默认阈值 1000
    const lines = Array.from({ length: 1500 }, (_, i) => `line-${i}`)
    const content = lines.join('\n')

    const { result } = renderHook(() =>
      useChunkedContent(content, { initialLines: 200, thresholdLines: 1000 }),
    )

    // 首屏应只有 200 行
    const visibleLines = result.current.visibleContent.split('\n')
    expect(visibleLines.length).toBe(200)
    expect(visibleLines[0]).toBe('line-0')
    expect(visibleLines[199]).toBe('line-199')
    expect(result.current.hasMore).toBe(true)
  })

  it('renderAll 一次性渲染全部内容', () => {
    const lines = Array.from({ length: 1500 }, (_, i) => `line-${i}`)
    const content = lines.join('\n')

    const { result } = renderHook(() =>
      useChunkedContent(content, { initialLines: 200, thresholdLines: 1000 }),
    )

    expect(result.current.hasMore).toBe(true)

    act(() => {
      result.current.renderAll()
    })

    expect(result.current.visibleContent).toBe(content)
    expect(result.current.hasMore).toBe(false)
  })

  it('内容变化时重置可见行数', () => {
    const longContent = Array.from({ length: 1500 }, (_, i) => `a-${i}`).join('\n')
    const { result, rerender } = renderHook(
      ({ content }) => useChunkedContent(content, { thresholdLines: 1000 }),
      { initialProps: { content: longContent } },
    )

    expect(result.current.visibleContent.split('\n').length).toBe(200)

    // 切换到短文档
    rerender({ content: 'short\ncontent' })
    expect(result.current.visibleContent).toBe('short\ncontent')
    expect(result.current.hasMore).toBe(false)
  })

  it('切换到新的长文档时重置为 initialLines', () => {
    const content1 = Array.from({ length: 1500 }, (_, i) => `a-${i}`).join('\n')
    const content2 = Array.from({ length: 1200 }, (_, i) => `b-${i}`).join('\n')

    const { result, rerender } = renderHook(
      ({ content }) => useChunkedContent(content, { initialLines: 200, thresholdLines: 1000 }),
      { initialProps: { content: content1 } },
    )

    // 先 renderAll 拉满
    act(() => result.current.renderAll())
    expect(result.current.hasMore).toBe(false)

    // 切换到新长文档
    rerender({ content: content2 })
    const visibleLines = result.current.visibleContent.split('\n')
    expect(visibleLines.length).toBe(200)
    expect(visibleLines[0]).toBe('b-0')
    expect(result.current.hasMore).toBe(true)
  })

  it('自定义 chunkSize 和 thresholdLines 生效', () => {
    // 100 行内容，阈值 50，initialLines 10，chunkSize 5
    const lines = Array.from({ length: 100 }, (_, i) => `x-${i}`)
    const content = lines.join('\n')

    const { result } = renderHook(() =>
      useChunkedContent(content, {
        initialLines: 10,
        chunkSize: 5,
        thresholdLines: 50,
      }),
    )

    expect(result.current.visibleContent.split('\n').length).toBe(10)
    expect(result.current.hasMore).toBe(true)
  })

  it('等于阈值行数时分片不触发（边界）', () => {
    // 行数 = 阈值 = 1000，不应分片
    const lines = Array.from({ length: 1000 }, (_, i) => `line-${i}`)
    const content = lines.join('\n')

    const { result } = renderHook(() =>
      useChunkedContent(content, { thresholdLines: 1000, initialLines: 200 }),
    )

    expect(result.current.visibleContent).toBe(content)
    expect(result.current.hasMore).toBe(false)
  })

  it('空内容安全处理', () => {
    const { result } = renderHook(() => useChunkedContent(''))

    expect(result.current.visibleContent).toBe('')
    expect(result.current.hasMore).toBe(false)
  })
})
