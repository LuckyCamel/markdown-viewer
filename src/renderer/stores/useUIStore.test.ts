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

  it('should have default sidebarWidth of 256', () => {
    const { result } = renderHook(() => useUIStore())
    expect(result.current.sidebarWidth).toBe(256)
  })

  it('should have default outlineWidth of 224', () => {
    const { result } = renderHook(() => useUIStore())
    expect(result.current.outlineWidth).toBe(224)
  })

  it('should set sidebarWidth', () => {
    const { result } = renderHook(() => useUIStore())
    act(() => result.current.setSidebarWidth(320))
    expect(result.current.sidebarWidth).toBe(320)
  })

  it('should set outlineWidth', () => {
    const { result } = renderHook(() => useUIStore())
    act(() => result.current.setOutlineWidth(300))
    expect(result.current.outlineWidth).toBe(300)
  })

  it('should reset sidebarWidth and outlineWidth', () => {
    const { result } = renderHook(() => useUIStore())
    act(() => result.current.setSidebarWidth(400))
    act(() => result.current.setOutlineWidth(350))
    act(() => result.current.reset())
    expect(result.current.sidebarWidth).toBe(256)
    expect(result.current.outlineWidth).toBe(224)
  })
})
