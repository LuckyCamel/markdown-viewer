import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useThemeStore } from './useThemeStore'

describe('useThemeStore', () => {
  beforeEach(() => {
    act(() => {
      useThemeStore.getState().reset()
    })
  })

  it('should default to system theme, null themeId, auto codeTheme', () => {
    const { result } = renderHook(() => useThemeStore())
    expect(result.current.theme).toBe('system')
    expect(result.current.themeId).toBeNull()
    expect(result.current.codeTheme).toBe('auto')
  })

  it('should set theme', () => {
    const { result } = renderHook(() => useThemeStore())
    act(() => result.current.setTheme('dark'))
    expect(result.current.theme).toBe('dark')
  })

  it('should set themeId', () => {
    const { result } = renderHook(() => useThemeStore())
    act(() => result.current.setThemeId('dracula'))
    expect(result.current.themeId).toBe('dracula')
  })

  it('should set codeTheme', () => {
    const { result } = renderHook(() => useThemeStore())
    act(() => result.current.setCodeTheme('github-dark'))
    expect(result.current.codeTheme).toBe('github-dark')
  })

  it('should reset all theme state', () => {
    const { result } = renderHook(() => useThemeStore())
    act(() => {
      result.current.setTheme('dark')
      result.current.setThemeId('dracula')
      result.current.setCodeTheme('github-dark')
    })
    act(() => result.current.reset())
    expect(result.current.theme).toBe('system')
    expect(result.current.themeId).toBeNull()
    expect(result.current.codeTheme).toBe('auto')
  })
})
