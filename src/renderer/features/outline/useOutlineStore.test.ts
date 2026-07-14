import { describe, it, expect, beforeEach } from 'vitest'
import { useOutlineStore } from './useOutlineStore'

/**
 * 大纲折叠状态 store 测试
 * 覆盖：toggleCollapse、isCollapsed、collapseAll、expandAll、文件隔离
 */
describe('useOutlineStore', () => {
  beforeEach(() => {
    useOutlineStore.setState({ collapsed: {} })
  })

  it('toggleCollapse 切换折叠状态', () => {
    useOutlineStore.getState().toggleCollapse('/a.md', 'h1')
    expect(useOutlineStore.getState().isCollapsed('/a.md', 'h1')).toBe(true)

    useOutlineStore.getState().toggleCollapse('/a.md', 'h1')
    expect(useOutlineStore.getState().isCollapsed('/a.md', 'h1')).toBe(false)
  })

  it('isCollapsed 查询折叠状态', () => {
    expect(useOutlineStore.getState().isCollapsed('/a.md', 'h1')).toBe(false)
    useOutlineStore.getState().toggleCollapse('/a.md', 'h1')
    expect(useOutlineStore.getState().isCollapsed('/a.md', 'h1')).toBe(true)
    expect(useOutlineStore.getState().isCollapsed('/a.md', 'h2')).toBe(false)
  })

  it('collapseAll 折叠所有标题', () => {
    useOutlineStore.getState().collapseAll('/a.md', ['h1', 'h2', 'h3'])
    expect(useOutlineStore.getState().isCollapsed('/a.md', 'h1')).toBe(true)
    expect(useOutlineStore.getState().isCollapsed('/a.md', 'h2')).toBe(true)
    expect(useOutlineStore.getState().isCollapsed('/a.md', 'h3')).toBe(true)
  })

  it('expandAll 展开所有标题', () => {
    useOutlineStore.getState().collapseAll('/a.md', ['h1', 'h2'])
    useOutlineStore.getState().expandAll('/a.md')
    expect(useOutlineStore.getState().isCollapsed('/a.md', 'h1')).toBe(false)
    expect(useOutlineStore.getState().isCollapsed('/a.md', 'h2')).toBe(false)
  })

  it('不同文件的折叠状态独立', () => {
    useOutlineStore.getState().toggleCollapse('/a.md', 'h1')
    expect(useOutlineStore.getState().isCollapsed('/a.md', 'h1')).toBe(true)
    expect(useOutlineStore.getState().isCollapsed('/b.md', 'h1')).toBe(false)

    useOutlineStore.getState().collapseAll('/b.md', ['h1', 'h2'])
    expect(useOutlineStore.getState().isCollapsed('/a.md', 'h1')).toBe(true)
    expect(useOutlineStore.getState().isCollapsed('/b.md', 'h1')).toBe(true)
    expect(useOutlineStore.getState().isCollapsed('/b.md', 'h2')).toBe(true)
  })

  it('getCollapsedSet 返回当前文件的折叠集合', () => {
    useOutlineStore.getState().collapseAll('/a.md', ['h1', 'h2'])
    const set = useOutlineStore.getState().getCollapsedSet('/a.md')
    expect(set).toBeInstanceOf(Set)
    expect(set.has('h1')).toBe(true)
    expect(set.has('h2')).toBe(true)
    expect(set.has('h3')).toBe(false)
  })
})
