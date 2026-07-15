import { useState } from 'react'
import { useFavoritesStore, type FavoriteItem } from './useFavoritesStore'
import { useTabStore } from '../tabs/useTabStore'
import { useFileStore } from './useFileStore'
import { FileIcon } from '../../components/FileIcon'
import { ContextMenu, type ContextMenuItem } from '../../components/ContextMenu'

interface MenuState {
  x: number
  y: number
  item: FavoriteItem
}

/**
 * 收藏夹组件
 *
 * 显示收藏的文件和文件夹列表，支持点击打开、右键移除。
 */
export function Favorites() {
  const items = useFavoritesStore((s) => s.items)
  const remove = useFavoritesStore((s) => s.remove)
  const reorder = useFavoritesStore((s) => s.reorder)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  /**
   * 点击收藏项
   */
  const handleClick = (item: FavoriteItem) => {
    if (item.isDirectory) {
      const { toggleExpand, rootPath } = useFileStore.getState()
      if (rootPath) {
        toggleExpand(item.path)
      }
    } else {
      useTabStore.getState().openFile(item.path)
    }
  }

  /**
   * 右键菜单
   */
  const handleContextMenu = (e: React.MouseEvent, item: FavoriteItem) => {
    e.preventDefault()
    e.stopPropagation()
    setMenu({ x: e.clientX, y: e.clientY, item })
  }

  const menuItems: ContextMenuItem[] = menu
    ? [
        {
          label: '从收藏夹移除',
          onClick: () => remove(menu.item.path),
        },
      ]
    : []

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider text-left hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-between"
      >
        <span>收藏夹</span>
        <span className="text-xs">{collapsed ? '▶' : '▼'}</span>
      </button>
      {!collapsed && (
        <div className="py-1">
          {items.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">暂无收藏</div>
          ) : (
            items.map((item, index) => (
              <div
                key={item.path}
                className="group flex items-center hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <button
                  onClick={() => handleClick(item)}
                  onContextMenu={(e) => handleContextMenu(e, item)}
                  className="flex-1 text-left px-2 py-0.5 text-sm flex items-center gap-1.5 min-w-0"
                  style={{ paddingLeft: '8px' }}
                >
                  <span className="w-3 flex-shrink-0" />
                  <FileIcon
                    name={item.name}
                    isDirectory={item.isDirectory}
                    isOpen={false}
                    size={16}
                  />
                  <span className="truncate">{item.name}</span>
                </button>
                <div className="flex items-center pr-1 opacity-0 group-hover:opacity-100">
                  <button
                    title="上移"
                    onClick={() => reorder(index, index - 1)}
                    disabled={index === 0}
                    className="px-1 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ↑
                  </button>
                  <button
                    title="下移"
                    onClick={() => reorder(index, index + 1)}
                    disabled={index === items.length - 1}
                    className="px-1 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      {menu && (
        <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />
      )}
    </div>
  )
}
