import { describe, it, expect, beforeEach } from 'vitest'
import { useSearchStore } from './useSearchStore'

describe('useSearchStore', () => {
  beforeEach(() => {
    useSearchStore.setState({ query: '', results: null, isSearching: false })
  })

  it('初始状态为空', () => {
    const s = useSearchStore.getState()
    expect(s.query).toBe('')
    expect(s.results).toBeNull()
    expect(s.isSearching).toBe(false)
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

  it('reset 清空所有字段', () => {
    useSearchStore.setState({ query: 'x', results: {} as any, isSearching: true })
    useSearchStore.getState().reset()
    const s = useSearchStore.getState()
    expect(s.query).toBe('')
    expect(s.results).toBeNull()
    expect(s.isSearching).toBe(false)
  })
})
