import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useFavoritesStore } from './useFavoritesStore'

const mockStoreSet = vi.fn()
const mockStoreGet = vi.fn()

vi.mock('../../lib/ipc', () => ({
  ipc: {
    store: {
      get: (...args: unknown[]) => mockStoreGet(...args),
      set: (...args: unknown[]) => mockStoreSet(...args),
    },
  },
}))

describe('useFavoritesStore', () => {
  beforeEach(() => {
    useFavoritesStore.setState({ items: [] })
    vi.clearAllMocks()
    mockStoreGet.mockResolvedValue(undefined)
    mockStoreSet.mockResolvedValue(undefined)
  })

  describe('初始状态', () => {
    it('默认收藏夹为空', () => {
      expect(useFavoritesStore.getState().items).toEqual([])
    })
  })

  describe('add', () => {
    it('应添加新的收藏项', () => {
      useFavoritesStore.getState().add('/path/to/file.md', 'file.md', false)
      const items = useFavoritesStore.getState().items
      expect(items).toHaveLength(1)
      expect(items[0].path).toBe('/path/to/file.md')
      expect(items[0].name).toBe('file.md')
      expect(items[0].isDirectory).toBe(false)
    })

    it('已存在的路径不应重复添加', () => {
      useFavoritesStore.getState().add('/path/a.md', 'a.md', false)
      useFavoritesStore.getState().add('/path/a.md', 'a.md', false)
      expect(useFavoritesStore.getState().items).toHaveLength(1)
    })

    it('应持久化到 store', () => {
      useFavoritesStore.getState().add('/path/a.md', 'a.md', false)
      expect(mockStoreSet).toHaveBeenCalledWith(
        'favorites',
        expect.arrayContaining([expect.objectContaining({ path: '/path/a.md' })]),
      )
    })
  })

  describe('remove', () => {
    it('应移除指定路径的收藏项', () => {
      useFavoritesStore.setState({
        items: [
          { path: '/a.md', name: 'a.md', isDirectory: false },
          { path: '/b.md', name: 'b.md', isDirectory: false },
        ],
      })
      useFavoritesStore.getState().remove('/a.md')
      const items = useFavoritesStore.getState().items
      expect(items).toHaveLength(1)
      expect(items[0].path).toBe('/b.md')
    })

    it('路径不存在时不报错', () => {
      useFavoritesStore.getState().remove('/not-exist.md')
      expect(useFavoritesStore.getState().items).toEqual([])
    })

    it('应持久化到 store', () => {
      useFavoritesStore.setState({
        items: [{ path: '/a.md', name: 'a.md', isDirectory: false }],
      })
      mockStoreSet.mockClear()
      useFavoritesStore.getState().remove('/a.md')
      expect(mockStoreSet).toHaveBeenCalledWith('favorites', [])
    })
  })

  describe('has', () => {
    it('存在的路径返回 true', () => {
      useFavoritesStore.setState({
        items: [{ path: '/a.md', name: 'a.md', isDirectory: false }],
      })
      expect(useFavoritesStore.getState().has('/a.md')).toBe(true)
    })

    it('不存在的路径返回 false', () => {
      expect(useFavoritesStore.getState().has('/not-exist.md')).toBe(false)
    })
  })

  describe('reorder', () => {
    it('应调整收藏项的顺序', () => {
      useFavoritesStore.setState({
        items: [
          { path: '/a.md', name: 'a.md', isDirectory: false },
          { path: '/b.md', name: 'b.md', isDirectory: false },
          { path: '/c.md', name: 'c.md', isDirectory: false },
        ],
      })
      useFavoritesStore.getState().reorder(0, 2)
      const items = useFavoritesStore.getState().items
      expect(items.map((i) => i.path)).toEqual(['/b.md', '/c.md', '/a.md'])
    })

    it('向上移动', () => {
      useFavoritesStore.setState({
        items: [
          { path: '/a.md', name: 'a.md', isDirectory: false },
          { path: '/b.md', name: 'b.md', isDirectory: false },
          { path: '/c.md', name: 'c.md', isDirectory: false },
        ],
      })
      useFavoritesStore.getState().reorder(2, 0)
      const items = useFavoritesStore.getState().items
      expect(items.map((i) => i.path)).toEqual(['/c.md', '/a.md', '/b.md'])
    })

    it('应持久化到 store', () => {
      useFavoritesStore.setState({
        items: [
          { path: '/a.md', name: 'a.md', isDirectory: false },
          { path: '/b.md', name: 'b.md', isDirectory: false },
        ],
      })
      mockStoreSet.mockClear()
      useFavoritesStore.getState().reorder(0, 1)
      expect(mockStoreSet).toHaveBeenCalledWith(
        'favorites',
        expect.arrayContaining([
          expect.objectContaining({ path: '/b.md' }),
          expect.objectContaining({ path: '/a.md' }),
        ]),
      )
    })
  })

  describe('loadFavorites', () => {
    it('应从 store 加载收藏夹', async () => {
      const saved = [{ path: '/saved.md', name: 'saved.md', isDirectory: false }]
      mockStoreGet.mockResolvedValue(saved)
      await useFavoritesStore.getState().loadFavorites()
      expect(useFavoritesStore.getState().items).toEqual(saved)
    })

    it('store 中没有数据时保持空', async () => {
      mockStoreGet.mockResolvedValue(undefined)
      await useFavoritesStore.getState().loadFavorites()
      expect(useFavoritesStore.getState().items).toEqual([])
    })
  })
})
