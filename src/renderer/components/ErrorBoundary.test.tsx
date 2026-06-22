import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

const mockLogError = vi.fn()
vi.mock('../logger', () => ({ logError: (...args: unknown[]) => mockLogError(...args) }))

function Thrower({ msg }: { msg: string }) {
  throw new Error(msg)
  return null as never
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('正常渲染时透传子组件', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">正常内容</div>
      </ErrorBoundary>,
    )
    expect(screen.getByTestId('child')).toBeDefined()
  })

  it('子组件 throw 时渲染降级 UI', () => {
    render(
      <ErrorBoundary>
        <Thrower msg="测试错误" />
      </ErrorBoundary>,
    )
    expect(screen.getByText('出错了')).toBeDefined()
    expect(screen.getByText('测试错误')).toBeDefined()
  })

  it('componentDidCatch 调用 logError', () => {
    render(
      <ErrorBoundary>
        <Thrower msg="边界错误" />
      </ErrorBoundary>,
    )
    expect(mockLogError).toHaveBeenCalledWith('ErrorBoundary', expect.any(Error))
  })

  it('通过 key 强制重新挂载后恢复', () => {
    const { rerender } = render(
      <ErrorBoundary key="1">
        <Thrower msg="crash" />
      </ErrorBoundary>,
    )
    expect(screen.getByText('出错了')).toBeDefined()

    rerender(
      <ErrorBoundary key="2">
        <div data-testid="recovered">恢复</div>
      </ErrorBoundary>,
    )
    expect(screen.getByTestId('recovered')).toBeDefined()
  })
})
