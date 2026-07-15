import { create } from 'zustand'
import { ipc } from '../../lib/ipc'
import { logError } from '../../logger'

/**
 * 收藏夹条目
 */
export interface FavoriteItem {
  /** 文件/文件夹路径 */
  path: string
  /** 显示名称 */
  name: string
  /** 是否为目录 */
  isDirectory: boolean
}

interface FavoritesState {
  items: FavoriteItem[]
  /** 添加收藏 */
  add: (path: string, name: string, isDirectory: boolean) => void
  /** 移除收藏 */
  remove: (path: string) => void
  /** 判断是否已收藏 */
  has: (path: string) => boolean
  /** 调整顺序 */
  reorder: (fromIndex: number, toIndex: number) => void
  /** 从持久化存储加载 */
  loadFavorites: () => Promise<void>
}

const STORAGE_KEY = 'favorites'

/**
 * 持久化收藏夹到 store
 */
function persist(items: FavoriteItem[]) {
  ipc.store.set(STORAGE_KEY, items).catch((err) => {
    logError('useFavoritesStore:persist', err)
  })
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  items: [],

  /**
   * 添加收藏
   */
  add: (path, name, isDirectory) => {
    const { items } = get()
    if (items.some((item) => item.path === path)) {
      return
    }
    const next = [...items, { path, name, isDirectory }]
    set({ items: next })
    persist(next)
  },

  /**
   * 移除收藏
   */
  remove: (path) => {
    const { items } = get()
    const next = items.filter((item) => item.path !== path)
    set({ items: next })
    persist(next)
  },

  /**
   * 判断是否已收藏
   */
  has: (path) => {
    return get().items.some((item) => item.path === path)
  },

  /**
   * 调整收藏顺序
   */
  reorder: (fromIndex, toIndex) => {
    const { items } = get()
    if (fromIndex < 0 || fromIndex >= items.length) return
    if (toIndex < 0 || toIndex >= items.length) return
    if (fromIndex === toIndex) return

    const next = [...items]
    const [removed] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, removed)
    set({ items: next })
    persist(next)
  },

  /**
   * 从持久化存储加载收藏夹
   */
  loadFavorites: async () => {
    try {
      const saved = await ipc.store.get<FavoriteItem[]>(STORAGE_KEY)
      if (Array.isArray(saved)) {
        set({ items: saved })
      }
    } catch (err) {
      logError('useFavoritesStore:loadFavorites', err)
    }
  },
}))
