import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { Favorites } from './Favorites'
import { useFavoritesStore } from './useFavoritesStore'

const mockOpenFile = vi.fn()
const mockToggleExpand = vi.fn()

vi.mock('../tabs/useTabStore', () => ({
  useTabStore: {
    getState: () => ({
      openFile: mockOpenFile,
    }),
  },
}))

vi.mock('./useFileStore', () => ({
  useFileStore: {
    getState: () => ({
      toggleExpand: mockToggleExpand,
      rootPath: '/test',
    }),
  },
}))

vi.mock('../../lib/ipc', () => ({
  ipc: {
    store: {
      get: vi.fn().mockResolvedValue(undefined),
      set: vi.fn().mockResolvedValue(undefined),
    },
  },
}))

describe('Favorites', () => {
  beforeEach(() => {
    useFavoritesStore.setState({
      items: [
        { path: '/docs/readme.md', name: 'readme.md', isDirectory: false },
        { path: '/notes', name: 'notes', isDirectory: true },
        { path: '/docs/api.md', name: 'api.md', isDirectory: false },
      ],
    })
    vi.clearAllMocks()
  })

  it('应渲染收藏夹标题', () => {
    render(<Favorites />)
    expect(screen.getByText('收藏夹')).toBeDefined()
  })

  it('应渲染所有收藏项', () => {
    render(<Favorites />)
    expect(screen.getByText('readme.md')).toBeDefined()
    expect(screen.getByText('notes')).toBeDefined()
    expect(screen.getByText('api.md')).toBeDefined()
  })

  it('收藏文件点击应打开文件', () => {
    render(<Favorites />)
    fireEvent.click(screen.getByText('readme.md'))
    expect(mockOpenFile).toHaveBeenCalledWith('/docs/readme.md')
  })

  it('右键收藏项应显示「从收藏夹移除」菜单项', () => {
    render(<Favorites />)
    const item = screen.getByText('readme.md')
    fireEvent.contextMenu(item)
    expect(screen.getByText('从收藏夹移除')).toBeDefined()
  })

  it('点击「从收藏夹移除」应调用 remove', () => {
    render(<Favorites />)
    const item = screen.getByText('readme.md')
    fireEvent.contextMenu(item)
    fireEvent.click(screen.getByText('从收藏夹移除'))
    const items = useFavoritesStore.getState().items
    expect(items.find((i) => i.path === '/docs/readme.md')).toBeUndefined()
  })

  it('收藏夹为空时应显示空状态', () => {
    useFavoritesStore.setState({ items: [] })
    render(<Favorites />)
    expect(screen.getByText('暂无收藏')).toBeDefined()
  })
})
