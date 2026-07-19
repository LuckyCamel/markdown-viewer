import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useNavigationStore } from './useNavigationStore'

describe('useNavigationStore', () => {
  beforeEach(() => {
    act(() => {
      useNavigationStore.getState().reset()
    })
  })

  it('should default to null pending jumps and null search highlight', () => {
    const { result } = renderHook(() => useNavigationStore())
    expect(result.current.pendingContentJump).toBeNull()
    expect(result.current.pendingAnchorJump).toBeNull()
    expect(result.current.searchHighlight).toBeNull()
  })

  it('should set and clear pendingContentJump', () => {
    const { result } = renderHook(() => useNavigationStore())
    const target = { path: '/test.md', line: 10, lineContent: 'foo' }
    act(() => result.current.setPendingContentJump(target))
    expect(result.current.pendingContentJump).toEqual(target)
    act(() => result.current.setPendingContentJump(null))
    expect(result.current.pendingContentJump).toBeNull()
  })

  it('should set and clear pendingAnchorJump', () => {
    const { result } = renderHook(() => useNavigationStore())
    const target = { path: '/test.md', anchor: 'section-1' }
    act(() => result.current.setPendingAnchorJump(target))
    expect(result.current.pendingAnchorJump).toEqual(target)
    act(() => result.current.setPendingAnchorJump(null))
    expect(result.current.pendingAnchorJump).toBeNull()
  })

  it('should set and clear searchHighlight with isRegex flag', () => {
    const { result } = renderHook(() => useNavigationStore())
    act(() => result.current.setSearchHighlight('foo'))
    expect(result.current.searchHighlight).toEqual({ query: 'foo', isRegex: false })
    act(() => result.current.setSearchHighlight('bar', true))
    expect(result.current.searchHighlight).toEqual({ query: 'bar', isRegex: true })
    act(() => result.current.setSearchHighlight(null))
    expect(result.current.searchHighlight).toBeNull()
  })

  it('should reset all navigation state', () => {
    const { result } = renderHook(() => useNavigationStore())
    act(() => {
      result.current.setPendingContentJump({ path: '/a.md', line: 1, lineContent: 'a' })
      result.current.setPendingAnchorJump({ path: '/b.md', anchor: 'x' })
      result.current.setSearchHighlight('q', true)
    })
    act(() => result.current.reset())
    expect(result.current.pendingContentJump).toBeNull()
    expect(result.current.pendingAnchorJump).toBeNull()
    expect(result.current.searchHighlight).toBeNull()
  })
})
