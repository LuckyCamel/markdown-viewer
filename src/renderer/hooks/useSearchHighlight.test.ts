import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSearchHighlight } from './useSearchHighlight'

describe('useSearchHighlight', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  it('query 为 null 时返回 matchCount=0 且不生成 mark', () => {
    container.innerHTML = '<p>hello foo world</p>'
    const { result } = renderHook(() => useSearchHighlight(container, null))
    expect(result.current.matchCount).toBe(0)
    expect(container.querySelectorAll('mark')).toHaveLength(0)
  })

  it('container 为 null 时返回 matchCount=0 且不报错', () => {
    const { result } = renderHook(() => useSearchHighlight(null, 'foo'))
    expect(result.current.matchCount).toBe(0)
  })

  it('有匹配时返回正确的 matchCount', () => {
    container.innerHTML = '<p>foo bar foo baz foo</p>'
    const { result } = renderHook(() => useSearchHighlight(container, 'foo'))
    expect(result.current.matchCount).toBe(3)
    expect(container.querySelectorAll('mark')).toHaveLength(3)
  })

  it('初始 currentIndex 指向第一个匹配（0）', () => {
    container.innerHTML = '<p>foo bar foo</p>'
    const { result } = renderHook(() => useSearchHighlight(container, 'foo'))
    expect(result.current.currentIndex).toBe(0)
  })

  it('next 循环切换 currentIndex', () => {
    container.innerHTML = '<p>foo bar foo baz foo</p>'
    const { result } = renderHook(() => useSearchHighlight(container, 'foo'))
    expect(result.current.currentIndex).toBe(0)
    act(() => result.current.next())
    expect(result.current.currentIndex).toBe(1)
    act(() => result.current.next())
    expect(result.current.currentIndex).toBe(2)
    // 循环回到 0
    act(() => result.current.next())
    expect(result.current.currentIndex).toBe(0)
  })

  it('prev 循环切换 currentIndex', () => {
    container.innerHTML = '<p>foo bar foo baz foo</p>'
    const { result } = renderHook(() => useSearchHighlight(container, 'foo'))
    expect(result.current.currentIndex).toBe(0)
    // 从 0 反向到末尾 2
    act(() => result.current.prev())
    expect(result.current.currentIndex).toBe(2)
    act(() => result.current.prev())
    expect(result.current.currentIndex).toBe(1)
  })

  it('clear 清除所有高亮并重置计数', () => {
    container.innerHTML = '<p>foo bar foo</p>'
    const { result } = renderHook(() => useSearchHighlight(container, 'foo'))
    expect(result.current.matchCount).toBe(2)
    act(() => result.current.clear())
    expect(result.current.matchCount).toBe(0)
    expect(container.querySelectorAll('mark')).toHaveLength(0)
  })

  it('query 变化时重新计算高亮', () => {
    container.innerHTML = '<p>foo bar baz</p>'
    const { result, rerender } = renderHook(({ q }) => useSearchHighlight(container, q), {
      initialProps: { q: 'foo' },
    })
    expect(result.current.matchCount).toBe(1)
    rerender({ q: 'bar' })
    expect(result.current.matchCount).toBe(1)
    expect(container.querySelectorAll('mark')).toHaveLength(1)
  })

  it('query 变为 null 时清除所有高亮', () => {
    container.innerHTML = '<p>foo bar foo</p>'
    const { result, rerender } = renderHook(({ q }) => useSearchHighlight(container, q), {
      initialProps: { q: 'foo' },
    })
    expect(result.current.matchCount).toBe(2)
    rerender({ q: null })
    expect(result.current.matchCount).toBe(0)
    expect(container.querySelectorAll('mark')).toHaveLength(0)
  })

  it('无匹配时 currentIndex 为 -1', () => {
    container.innerHTML = '<p>hello world</p>'
    const { result } = renderHook(() => useSearchHighlight(container, 'foo'))
    expect(result.current.matchCount).toBe(0)
    expect(result.current.currentIndex).toBe(-1)
  })

  it('当前匹配的 mark 元素带有当前高亮样式', () => {
    container.innerHTML = '<p>foo foo</p>'
    const { result } = renderHook(() => useSearchHighlight(container, 'foo'))
    const marks = container.querySelectorAll('mark')
    expect(marks).toHaveLength(2)
    // 初始当前匹配为第一个，应带有当前高亮 data 属性
    expect(marks[0].getAttribute('data-current')).toBe('true')
    expect(marks[1].getAttribute('data-current')).toBe('false')
    act(() => result.current.next())
    // 切换后第二个变为当前
    const updated = container.querySelectorAll('mark')
    expect(updated[0].getAttribute('data-current')).toBe('false')
    expect(updated[1].getAttribute('data-current')).toBe('true')
  })

  it('最多高亮 500 个匹配（性能保护）', () => {
    // 构造 600 个匹配
    const text = Array.from({ length: 600 }, () => 'foo').join(' ')
    container.innerHTML = `<p>${text}</p>`
    const { result } = renderHook(() => useSearchHighlight(container, 'foo'))
    expect(result.current.matchCount).toBe(500)
  })

  it('区分大小写匹配', () => {
    container.innerHTML = '<p>Foo foo FOO</p>'
    const { result } = renderHook(() => useSearchHighlight(container, 'foo'))
    // 仅匹配小写 foo
    expect(result.current.matchCount).toBe(1)
  })
})
