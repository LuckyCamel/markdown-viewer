import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useUIStore } from './useUIStore'

describe('useUIStore', () => {
  beforeEach(() => {
    act(() => {
      useUIStore.getState().reset()
    })
  })

  it('should have sidebar visible by default', () => {
    const { result } = renderHook(() => useUIStore())
    expect(result.current.sidebarVisible).toBe(true)
  })

  it('should toggle sidebar', () => {
    const { result } = renderHook(() => useUIStore())
    act(() => result.current.toggleSidebar())
    expect(result.current.sidebarVisible).toBe(false)
    act(() => result.current.toggleSidebar())
    expect(result.current.sidebarVisible).toBe(true)
  })

  it('should toggle outline', () => {
    const { result } = renderHook(() => useUIStore())
    act(() => result.current.toggleOutline())
    expect(result.current.outlineVisible).toBe(false)
  })

  it('should set theme', () => {
    const { result } = renderHook(() => useUIStore())
    act(() => result.current.setTheme('dark'))
    expect(result.current.theme).toBe('dark')
  })

  it('should manage search panel', () => {
    const { result } = renderHook(() => useUIStore())
    act(() => result.current.openSearch('file'))
    expect(result.current.searchPanel).toBe('file')
    act(() => result.current.closeSearch())
    expect(result.current.searchPanel).toBe('none')
  })
})
