import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { RecentFiles } from './RecentFiles'
import type { RecentEntry } from '../../../shared/types'

describe('RecentFiles', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  /**
   * 构造一个最近文件条目，agoMs 表示距当前时间的毫秒数
   */
  function makeEntry(path: string, name: string, agoMs: number): RecentEntry {
    return { path, name, timestamp: Date.now() - agoMs }
  }

  it('渲染最近文件列表（传入 3 个文件，显示 3 个条目）', () => {
    const files = [
      makeEntry('/docs/readme.md', 'readme.md', 60_000),
      makeEntry('/docs/index.md', 'index.md', 120_000),
      makeEntry('/docs/notes.md', 'notes.md', 180_000),
    ]
    render(<RecentFiles files={files} onSelect={() => {}} onClose={() => {}} />)
    const items = screen.getAllByRole('option')
    expect(items).toHaveLength(3)
  })

  it('空列表显示提示文字', () => {
    render(<RecentFiles files={[]} onSelect={() => {}} onClose={() => {}} />)
    expect(screen.getByText('暂无最近文件')).toBeDefined()
  })

  it('点击条目触发 onSelect 回调', () => {
    const files = [makeEntry('/docs/readme.md', 'readme.md', 60_000)]
    const onSelect = vi.fn()
    render(<RecentFiles files={files} onSelect={onSelect} onClose={() => {}} />)
    fireEvent.click(screen.getByText('readme.md'))
    expect(onSelect).toHaveBeenCalledWith('/docs/readme.md')
  })

  it('键盘上下键导航（高亮移动）', () => {
    const files = [
      makeEntry('/docs/a.md', 'a.md', 60_000),
      makeEntry('/docs/b.md', 'b.md', 120_000),
      makeEntry('/docs/c.md', 'c.md', 180_000),
    ]
    render(<RecentFiles files={files} onSelect={() => {}} onClose={() => {}} />)

    // 初始第一个条目高亮
    let items = screen.getAllByRole('option')
    expect(items[0].getAttribute('data-selected')).toBe('true')

    // 按 ArrowDown，高亮移动到第二个
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    items = screen.getAllByRole('option')
    expect(items[1].getAttribute('data-selected')).toBe('true')
    expect(items[0].getAttribute('data-selected')).toBe('false')

    // 按 ArrowUp，高亮回到第一个
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    items = screen.getAllByRole('option')
    expect(items[0].getAttribute('data-selected')).toBe('true')
  })

  it('回车键触发 onSelect', () => {
    const files = [
      makeEntry('/docs/a.md', 'a.md', 60_000),
      makeEntry('/docs/b.md', 'b.md', 120_000),
    ]
    const onSelect = vi.fn()
    render(<RecentFiles files={files} onSelect={onSelect} onClose={() => {}} />)
    // 默认选中第一个条目，回车应打开它
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith('/docs/a.md')
  })

  it('Esc 键触发 onClose', () => {
    const onClose = vi.fn()
    render(
      <RecentFiles
        files={[makeEntry('/docs/a.md', 'a.md', 60_000)]}
        onSelect={() => {}}
        onClose={onClose}
      />,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('每个条目显示文件名、父目录路径、相对时间', () => {
    const files = [makeEntry('/docs/readme.md', 'readme.md', 5 * 60_000)]
    render(<RecentFiles files={files} onSelect={() => {}} onClose={() => {}} />)
    expect(screen.getByText('readme.md')).toBeDefined()
    expect(screen.getByText('/docs')).toBeDefined()
    expect(screen.getByText('5 分钟前')).toBeDefined()
  })

  it('最多显示 10 条', () => {
    const files = Array.from({ length: 12 }, (_, i) =>
      makeEntry(`/docs/file${i}.md`, `file${i}.md`, (i + 1) * 60_000),
    )
    render(<RecentFiles files={files} onSelect={() => {}} onClose={() => {}} />)
    expect(screen.getAllByRole('option')).toHaveLength(10)
  })
})
