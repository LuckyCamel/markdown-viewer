import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SearchHighlightBar } from './SearchHighlightBar'

describe('SearchHighlightBar', () => {
  it('显示匹配数量和当前位置', () => {
    render(
      <SearchHighlightBar
        matchCount={5}
        currentIndex={2}
        onNext={() => {}}
        onPrev={() => {}}
        onClose={() => {}}
      />,
    )
    // currentIndex 为 0-based，显示时 +1
    expect(screen.getByText('5 个匹配')).toBeDefined()
    expect(screen.getByText(/3\/5/)).toBeDefined()
  })

  it('点击「下一个」触发 onNext 回调', () => {
    const onNext = vi.fn()
    render(
      <SearchHighlightBar
        matchCount={3}
        currentIndex={0}
        onNext={onNext}
        onPrev={() => {}}
        onClose={() => {}}
      />,
    )
    fireEvent.click(screen.getByLabelText('下一个'))
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('点击「上一个」触发 onPrev 回调', () => {
    const onPrev = vi.fn()
    render(
      <SearchHighlightBar
        matchCount={3}
        currentIndex={0}
        onNext={() => {}}
        onPrev={onPrev}
        onClose={() => {}}
      />,
    )
    fireEvent.click(screen.getByLabelText('上一个'))
    expect(onPrev).toHaveBeenCalledTimes(1)
  })

  it('点击「关闭」触发 onClose 回调', () => {
    const onClose = vi.fn()
    render(
      <SearchHighlightBar
        matchCount={3}
        currentIndex={0}
        onNext={() => {}}
        onPrev={() => {}}
        onClose={onClose}
      />,
    )
    fireEvent.click(screen.getByLabelText('关闭'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('无匹配时显示「无匹配」', () => {
    render(
      <SearchHighlightBar
        matchCount={0}
        currentIndex={-1}
        onNext={() => {}}
        onPrev={() => {}}
        onClose={() => {}}
      />,
    )
    expect(screen.getByText('无匹配')).toBeDefined()
  })

  it('无匹配时不显示上一个/下一个按钮', () => {
    render(
      <SearchHighlightBar
        matchCount={0}
        currentIndex={-1}
        onNext={() => {}}
        onPrev={() => {}}
        onClose={() => {}}
      />,
    )
    expect(screen.queryByLabelText('上一个')).toBeNull()
    expect(screen.queryByLabelText('下一个')).toBeNull()
  })

  it('无匹配时仍显示关闭按钮', () => {
    const onClose = vi.fn()
    render(
      <SearchHighlightBar
        matchCount={0}
        currentIndex={-1}
        onNext={() => {}}
        onPrev={() => {}}
        onClose={onClose}
      />,
    )
    fireEvent.click(screen.getByLabelText('关闭'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('单个匹配时显示「1 个匹配」', () => {
    render(
      <SearchHighlightBar
        matchCount={1}
        currentIndex={0}
        onNext={() => {}}
        onPrev={() => {}}
        onClose={() => {}}
      />,
    )
    expect(screen.getByText('1 个匹配')).toBeDefined()
    expect(screen.getByText(/1\/1/)).toBeDefined()
  })
})
