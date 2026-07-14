import { describe, it, expect, beforeEach } from 'vitest'
import { useSearchStore } from './useSearchStore'

describe('useSearchStore', () => {
  beforeEach(() => {
    useSearchStore.setState({
      query: '',
      results: null,
      isSearching: false,
      isRegex: false,
    })
  })

  it('初始状态为空', () => {
    const s = useSearchStore.getState()
    expect(s.query).toBe('')
    expect(s.results).toBeNull()
    expect(s.isSearching).toBe(false)
    expect(s.isRegex).toBe(false)
  })

  it('isRegex 初始为 false', () => {
    expect(useSearchStore.getState().isRegex).toBe(false)
  })

  it('setIsRegex 切换正则模式', () => {
    useSearchStore.getState().setIsRegex(true)
    expect(useSearchStore.getState().isRegex).toBe(true)
    useSearchStore.getState().setIsRegex(false)
    expect(useSearchStore.getState().isRegex).toBe(false)
  })

  it('setQuery 更新查询', () => {
    useSearchStore.getState().setQuery('test')
    expect(useSearchStore.getState().query).toBe('test')
  })

  it('setResults 更新结果', () => {
    const results = { totalFiles: 1, searchedFiles: 0, matches: [] }
    useSearchStore.getState().setResults(results)
    expect(useSearchStore.getState().results).toBe(results)
  })

  it('setIsSearching 更新搜索状态', () => {
    useSearchStore.getState().setIsSearching(true)
    expect(useSearchStore.getState().isSearching).toBe(true)
  })

  it('appendResults 增量合并 newMatches', () => {
    useSearchStore.getState().appendResults({
      searchId: 's1',
      totalFiles: 10,
      searchedFiles: 1,
      matches: [{ path: '/a.md', line: 1, column: 0, matchText: 'x', lineContent: 'x' }],
      newMatches: [{ path: '/a.md', line: 1, column: 0, matchText: 'x', lineContent: 'x' }],
      isComplete: false,
    })
    useSearchStore.getState().appendResults({
      searchId: 's1',
      totalFiles: 10,
      searchedFiles: 2,
      matches: [
        { path: '/a.md', line: 1, column: 0, matchText: 'x', lineContent: 'x' },
        { path: '/b.md', line: 2, column: 0, matchText: 'y', lineContent: 'y' },
      ],
      newMatches: [{ path: '/b.md', line: 2, column: 0, matchText: 'y', lineContent: 'y' }],
      isComplete: false,
    })
    expect(useSearchStore.getState().results?.matches).toHaveLength(2)
  })

  it('reset 清空所有字段', () => {
    useSearchStore.setState({
      query: 'x',
      results: {} as any,
      isSearching: true,
      isRegex: true,
    })
    useSearchStore.getState().reset()
    const s = useSearchStore.getState()
    expect(s.query).toBe('')
    expect(s.results).toBeNull()
    expect(s.isSearching).toBe(false)
    expect(s.isRegex).toBe(false)
  })
})
