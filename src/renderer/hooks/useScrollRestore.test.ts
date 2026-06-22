import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useScrollRestore } from './useScrollRestore'

const mockStoreGet = vi.fn()
const mockStoreSet = vi.fn()
const mockLogError = vi.fn()

vi.mock('../lib/ipc', () => ({
  ipc: {
    store: {
      get: (...args: unknown[]) => mockStoreGet(...args),
      set: (...args: unknown[]) => mockStoreSet(...args),
    },
  },
}))
vi.mock('../logger', () => ({ logError: (...args: unknown[]) => mockLogError(...args) }))

function setupDOM() {
  document.body.innerHTML = '<main><div></div></main>'
}

function fireScroll(top: number) {
  const el = document.querySelector('main > div:first-child') as HTMLElement
  Object.defineProperty(el, 'scrollTop', { value: top, writable: true })
  el.dispatchEvent(new Event('scroll'))
}

describe('useScrollRestore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStoreGet.mockResolvedValue(undefined)
    mockStoreSet.mockResolvedValue(undefined)
  })

  it('activeFile 为 null 时不保存滚动位置', () => {
    setupDOM()
    renderHook(() => useScrollRestore(null, 'content'))
    fireScroll(100)
    expect(mockStoreSet).not.toHaveBeenCalled()
  })

  it('DOM 容器不存在时不报错', () => {
    document.body.innerHTML = ''
    expect(() => {
      renderHook(() => useScrollRestore('/a.md', 'content'))
    }).not.toThrow()
  })

  it('scroll 事件保存位置到 store', () => {
    setupDOM()
    renderHook(() => useScrollRestore('/a.md', 'content'))
    fireScroll(250)
    expect(mockStoreSet).toHaveBeenCalledWith('readingPositions', { '/a.md': 250 })
  })

  it('activeFile 变化时更新保存的路径', () => {
    setupDOM()
    const { rerender } = renderHook(({ file }) => useScrollRestore(file, 'content'), {
      initialProps: { file: '/a.md' },
    })
    rerender({ file: '/b.md' })
    fireScroll(300)
    expect(mockStoreSet).toHaveBeenCalledWith('readingPositions', { '/b.md': 300 })
  })

  it('store.set 异常时调用 logError', async () => {
    setupDOM()
    mockStoreSet.mockRejectedValue(new Error('disk full'))
    renderHook(() => useScrollRestore('/a.md', 'content'))
    fireScroll(50)
    await vi.waitFor(() => {
      expect(mockLogError).toHaveBeenCalledWith('useScrollRestore:save', expect.any(Error))
    })
  })

  describe('恢复滚动位置', () => {
    it('从 store 读取位置并设置 scrollTop', async () => {
      setupDOM()
      mockStoreGet.mockResolvedValue({ '/a.md': 120 })
      renderHook(() => useScrollRestore('/a.md', 'content'))
      await vi.waitFor(() => {
        const el = document.querySelector('main > div:first-child') as HTMLElement
        expect(el.scrollTop).toBe(120)
      })
    })

    it('位置不存在时不设置 scrollTop', async () => {
      setupDOM()
      mockStoreGet.mockResolvedValue({ '/other.md': 200 })
      renderHook(() => useScrollRestore('/a.md', 'content'))
      await vi.waitFor(() => {
        expect(mockStoreGet).toHaveBeenCalled()
      })
    })

    it('加载异常时调用 logError', async () => {
      setupDOM()
      mockStoreGet.mockRejectedValue(new Error('read error'))
      renderHook(() => useScrollRestore('/a.md', 'content'))
      await vi.waitFor(() => {
        expect(mockLogError).toHaveBeenCalledWith('useScrollRestore:load', expect.any(Error))
      })
    })

    it('activeFile 为 null 时不恢复', async () => {
      setupDOM()
      renderHook(() => useScrollRestore(null, 'content'))
      expect(mockStoreGet).not.toHaveBeenCalled()
    })

    it('content 为 undefined 时不恢复', async () => {
      setupDOM()
      renderHook(() => useScrollRestore('/a.md', undefined))
      expect(mockStoreGet).not.toHaveBeenCalled()
    })
  })
})
