import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOutlineActiveHeading } from './useOutlineActiveHeading'
import { SCROLL_CONTAINER_SELECTOR } from '../../shared/scrollContainer'

function setupDOM() {
  document.body.innerHTML = `
    <div data-scroll-container style="height:200px;overflow:auto">
      <h2 id="intro" style="height:300px;margin:0">Intro</h2>
      <h2 id="section-1" style="height:300px;margin:0">Section 1</h2>
    </div>
  `
}

function fireScroll(top: number) {
  const container = document.querySelector(SCROLL_CONTAINER_SELECTOR) as HTMLElement
  Object.defineProperty(container, 'scrollTop', { value: top, writable: true, configurable: true })
  container.dispatchEvent(new Event('scroll'))
}

describe('useOutlineActiveHeading', () => {
  beforeEach(() => {
    setupDOM()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('无标题时 activeId 为 null', () => {
    const { result } = renderHook(() => useOutlineActiveHeading([]))
    expect(result.current.activeId).toBeNull()
  })

  it('滚动后高亮当前节，不回跳文档标题', async () => {
    const intro = document.getElementById('intro')!
    const section1 = document.getElementById('section-1')!
    vi.spyOn(intro, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 300,
      left: 0,
      right: 0,
      width: 0,
      height: 300,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
    vi.spyOn(section1, 'getBoundingClientRect').mockReturnValue({
      top: 300,
      bottom: 600,
      left: 0,
      right: 0,
      width: 0,
      height: 300,
      x: 0,
      y: 300,
      toJSON: () => ({}),
    })

    const { result } = renderHook(() => useOutlineActiveHeading(['intro', 'section-1']))

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r))
      await new Promise((r) => requestAnimationFrame(r))
    })

    expect(result.current.activeId).toBe('intro')

    await act(async () => {
      vi.spyOn(intro, 'getBoundingClientRect').mockReturnValue({
        top: -400,
        bottom: -100,
        left: 0,
        right: 0,
        width: 0,
        height: 300,
        x: 0,
        y: -400,
        toJSON: () => ({}),
      })
      vi.spyOn(section1, 'getBoundingClientRect').mockReturnValue({
        top: -100,
        bottom: 200,
        left: 0,
        right: 0,
        width: 0,
        height: 300,
        x: 0,
        y: -100,
        toJSON: () => ({}),
      })
      fireScroll(400)
      await new Promise((r) => requestAnimationFrame(r))
    })

    expect(result.current.activeId).toBe('section-1')

    await act(async () => {
      fireScroll(500)
      await new Promise((r) => requestAnimationFrame(r))
    })

    expect(result.current.activeId).toBe('section-1')
  })

  it('setActiveHeading 可立即设置高亮', () => {
    const { result } = renderHook(() => useOutlineActiveHeading(['intro', 'section-1']))

    act(() => {
      result.current.setActiveHeading('intro')
    })

    expect(result.current.activeId).toBe('intro')
  })

  it('滚动容器缺失时不抛错', () => {
    document.body.innerHTML = ''
    expect(() => {
      renderHook(() => useOutlineActiveHeading(['intro']))
    }).not.toThrow()
    expect(document.querySelector(SCROLL_CONTAINER_SELECTOR)).toBeNull()
  })
})
