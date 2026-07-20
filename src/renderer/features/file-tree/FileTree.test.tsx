import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { FileTree } from './FileTree'
import { useFileStore } from './useFileStore'
import { useFavoritesStore } from './useFavoritesStore'
import type { FileEntry } from '../../../shared/types'

vi.mock('../../lib/fileActions', () => ({
  copyPathToClipboard: vi.fn(),
  revealPathInDir: vi.fn(),
}))

vi.mock('../../lib/ipc', () => ({
  ipc: {
    store: {
      get: vi.fn().mockResolvedValue(undefined),
      set: vi.fn().mockResolvedValue(undefined),
    },
  },
}))

function makeEntry(name: string, isDir = false, parent = '/test'): FileEntry {
  const isMarkdown = !isDir && /\.(md|markdown)$/i.test(name)
  return {
    name,
    path: `${parent}/${name}`,
    isDirectory: isDir,
    isHidden: name.startsWith('.'),
    isMarkdown,
  }
}

describe('FileTree', () => {
  beforeEach(() => {
    useFileStore.setState({
      rootPath: '/test',
      rootPaths: ['/test'],
      entries: {
        '/test': [makeEntry('a.md'), makeEntry('sub', true)],
        '/test/sub': [makeEntry('b.md', false, '/test/sub')],
      },
      expanded: {},
      loading: {},
      sortMode: 'name',
      sortDirection: 'asc',
    })
  })

  it('should render root directory name', () => {
    render(<FileTree />)
    expect(screen.getByText('test')).toBeDefined()
  })

  it('should render file entries', () => {
    render(<FileTree />)
    expect(screen.getByText('a.md')).toBeDefined()
    expect(screen.getByText('sub')).toBeDefined()
  })

  describe('右键菜单', () => {
    it('右键文件应显示新建/重命名/删除/复制地址等菜单项', () => {
      render(<FileTree />)
      const fileEl = screen.getByText('a.md')
      fireEvent.contextMenu(fileEl)
      expect(screen.getByText('新建文件')).toBeDefined()
      expect(screen.getByText('新建文件夹')).toBeDefined()
      expect(screen.getByText('重命名')).toBeDefined()
      expect(screen.getByText('删除')).toBeDefined()
      expect(screen.getByText('复制地址')).toBeDefined()
      expect(screen.getByText('在文件夹中打开')).toBeDefined()
    })

    it('右键目录应显示新建/重命名/删除/刷新等菜单项', () => {
      render(<FileTree />)
      const dirEl = screen.getByText('sub')
      fireEvent.contextMenu(dirEl)
      expect(screen.getByText('新建文件')).toBeDefined()
      expect(screen.getByText('新建文件夹')).toBeDefined()
      expect(screen.getByText('重命名')).toBeDefined()
      expect(screen.getByText('删除')).toBeDefined()
      expect(screen.getByText('刷新')).toBeDefined()
    })

    it('未收藏文件右键应显示「添加到收藏夹」', () => {
      useFavoritesStore.setState({ items: [] })
      render(<FileTree />)
      const fileEl = screen.getByText('a.md')
      fireEvent.contextMenu(fileEl)
      expect(screen.getByText('添加到收藏夹')).toBeDefined()
    })

    it('已收藏文件右键应显示「从收藏夹移除」', () => {
      useFavoritesStore.setState({
        items: [{ path: '/test/a.md', name: 'a.md', isDirectory: false }],
      })
      render(<FileTree />)
      const fileEl = screen.getByText('a.md')
      fireEvent.contextMenu(fileEl)
      expect(screen.getByText('从收藏夹移除')).toBeDefined()
    })

    it('点击「添加到收藏夹」应添加收藏', () => {
      useFavoritesStore.setState({ items: [] })
      render(<FileTree />)
      const fileEl = screen.getByText('a.md')
      fireEvent.contextMenu(fileEl)
      fireEvent.click(screen.getByText('添加到收藏夹'))
      expect(useFavoritesStore.getState().has('/test/a.md')).toBe(true)
    })

    it('点击「从收藏夹移除」应移除收藏', () => {
      useFavoritesStore.setState({
        items: [{ path: '/test/a.md', name: 'a.md', isDirectory: false }],
      })
      render(<FileTree />)
      const fileEl = screen.getByText('a.md')
      fireEvent.contextMenu(fileEl)
      fireEvent.click(screen.getByText('从收藏夹移除'))
      expect(useFavoritesStore.getState().has('/test/a.md')).toBe(false)
    })
  })

  describe('排序', () => {
    it('应显示排序按钮', () => {
      render(<FileTree />)
      expect(screen.getByTitle('排序')).toBeDefined()
    })

    it('点击排序按钮应显示排序选项', () => {
      render(<FileTree />)
      fireEvent.click(screen.getByTitle('排序'))
      expect(screen.getByText('按名称')).toBeDefined()
      expect(screen.getByText('按修改时间')).toBeDefined()
      expect(screen.getByText('按大小')).toBeDefined()
    })

    it('选择「按修改时间」应切换排序模式', () => {
      render(<FileTree />)
      fireEvent.click(screen.getByTitle('排序'))
      fireEvent.click(screen.getByText('按修改时间'))
      expect(useFileStore.getState().sortMode).toBe('modified')
    })
  })

  describe('多根目录', () => {
    beforeEach(() => {
      useFileStore.setState({
        rootPath: '/workspace1',
        rootPaths: ['/workspace1', '/workspace2'],
        entries: {
          '/workspace1': [makeEntry('a.md', false, '/workspace1')],
          '/workspace2': [makeEntry('b.md', false, '/workspace2')],
        },
        expanded: {},
        loading: {},
      })
    })

    it('应渲染多个根目录', () => {
      render(<FileTree />)
      expect(screen.getByText('workspace1')).toBeDefined()
      expect(screen.getByText('workspace2')).toBeDefined()
    })

    it('每个根目录显示各自的文件', () => {
      render(<FileTree />)
      expect(screen.getByText('a.md')).toBeDefined()
      expect(screen.getByText('b.md')).toBeDefined()
    })

    it('右键根目录应显示「从工作区移除」', () => {
      render(<FileTree />)
      const rootEl = screen.getByText('workspace1')
      fireEvent.contextMenu(rootEl)
      expect(screen.getByText('从工作区移除')).toBeDefined()
    })

    it('点击「从工作区移除」应移除根目录', () => {
      render(<FileTree />)
      const rootEl = screen.getByText('workspace1')
      fireEvent.contextMenu(rootEl)
      fireEvent.click(screen.getByText('从工作区移除'))
      expect(useFileStore.getState().rootPaths).toEqual(['/workspace2'])
    })
  })

  describe('懒加载 UI 边界', () => {
    it('展开目录时若处于 loading 状态应显示「加载中...」占位', () => {
      useFileStore.setState({
        rootPath: '/test',
        rootPaths: ['/test'],
        entries: {
          '/test': [makeEntry('sub', true)],
        },
        expanded: { '/test/sub': true },
        loading: { '/test/sub': true },
      })
      render(<FileTree />)
      expect(screen.getByTestId('tree-loading-/test/sub')).toBeDefined()
      expect(screen.getByTestId('tree-loading-/test/sub').textContent).toContain('加载中')
    })

    it('展开空目录应显示「空目录」提示', () => {
      useFileStore.setState({
        rootPath: '/test',
        rootPaths: ['/test'],
        entries: {
          '/test': [makeEntry('empty', true)],
          '/test/empty': [],
        },
        expanded: { '/test/empty': true },
        loading: {},
      })
      render(<FileTree />)
      expect(screen.getByTestId('tree-empty-/test/empty')).toBeDefined()
      expect(screen.getByTestId('tree-empty-/test/empty').textContent).toContain('空目录')
    })

    it('展开非空目录不应显示空目录提示', () => {
      useFileStore.setState({
        rootPath: '/test',
        rootPaths: ['/test'],
        entries: {
          '/test': [makeEntry('sub', true)],
          '/test/sub': [makeEntry('child.md', false, '/test/sub')],
        },
        expanded: { '/test/sub': true },
        loading: {},
      })
      render(<FileTree />)
      expect(screen.queryByTestId('tree-empty-/test/sub')).toBeNull()
      expect(screen.getByText('child.md')).toBeDefined()
    })

    it('未展开的目录不应显示 loading 或空目录提示', () => {
      useFileStore.setState({
        rootPath: '/test',
        rootPaths: ['/test'],
        entries: {
          '/test': [makeEntry('sub', true)],
        },
        expanded: {},
        loading: { '/test/sub': true },
      })
      render(<FileTree />)
      expect(screen.queryByTestId('tree-loading-/test/sub')).toBeNull()
      expect(screen.queryByTestId('tree-empty-/test/sub')).toBeNull()
    })
  })
})
