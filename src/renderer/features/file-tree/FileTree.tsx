import { useState } from 'react'
import { basename } from '../../../shared/utils'
import { isVisibleFileEntry } from '../../../shared/settingsDefaults'
import { useFileStore } from './useFileStore'
import { useTabStore } from '../tabs/useTabStore'
import { FileIcon } from '../../components/FileIcon'
import { ContextMenu, type ContextMenuItem } from '../../components/ContextMenu'
import { copyPathToClipboard, revealPathInDir } from '../../lib/fileActions'
import { useFavoritesStore } from './useFavoritesStore'
import type { FileEntry } from '../../../shared/types'

interface MenuState {
  x: number
  y: number
  path: string
  isDirectory: boolean
}

/**
 * 文件树节点组件
 */
function FileTreeNode({
  entry,
  depth,
  allEntries,
  getSortedEntries,
  onContextMenu,
}: {
  entry: FileEntry
  depth: number
  allEntries: Record<string, FileEntry[]>
  getSortedEntries: (dirPath: string) => FileEntry[]
  onContextMenu: (e: React.MouseEvent, path: string, isDirectory: boolean) => void
}) {
  const expanded = useFileStore((s) => s.expanded)
  const toggleExpand = useFileStore((s) => s.toggleExpand)
  const children = allEntries[entry.path] ? getSortedEntries(entry.path) : undefined

  const isExpanded = expanded[entry.path] ?? false

  const handleClick = () => {
    if (entry.isDirectory) {
      toggleExpand(entry.path)
    } else {
      useTabStore.getState().openFile(entry.path)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu(e, entry.path, entry.isDirectory)}
        className={`w-full text-left px-2 py-0.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1.5 ${
          entry.isHidden ? 'text-gray-400' : ''
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {entry.isDirectory ? (
          <span className="text-xs text-gray-400 w-3 flex-shrink-0 text-center">
            {isExpanded ? '▼' : '▶'}
          </span>
        ) : (
          <span className="w-3 flex-shrink-0" />
        )}
        <FileIcon name={entry.name} isDirectory={entry.isDirectory} isOpen={isExpanded} size={16} />
        <span className="truncate">{entry.name}</span>
      </button>
      {entry.isDirectory && isExpanded && children && (
        <div>
          {children.filter(isVisibleFileEntry).map((child) => (
            <FileTreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              allEntries={allEntries}
              getSortedEntries={getSortedEntries}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * 文件树组件
 *
 * 支持多根目录（多工作区）显示，每个根目录独立展开/折叠。
 */
export function FileTree() {
  const entries = useFileStore((s) => s.entries)
  const rootPaths = useFileStore((s) => s.rootPaths)
  const isRoot = useFileStore((s) => s.isRoot)
  const removeRoot = useFileStore((s) => s.removeRoot)
  const setSort = useFileStore((s) => s.setSort)
  const getSortedEntries = useFileStore((s) => s.getSortedEntries)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const [sortButtonRef, setSortButtonRef] = useState<HTMLButtonElement | null>(null)

  /**
   * 排序菜单项
   */
  const sortMenuItems: ContextMenuItem[] = [
    { label: '按名称', onClick: () => setSort('name') },
    { label: '按修改时间', onClick: () => setSort('modified') },
    { label: '按大小', onClick: () => setSort('size') },
  ]

  /**
   * 获取排序按钮位置
   */
  const getSortMenuPosition = () => {
    if (!sortButtonRef) return { x: 0, y: 0 }
    const rect = sortButtonRef.getBoundingClientRect()
    return { x: rect.left, y: rect.bottom }
  }

  /**
   * 右键打开上下文菜单：阻止默认菜单并记录目标路径
   */
  const handleContextMenu = (e: React.MouseEvent, path: string, isDirectory: boolean) => {
    e.preventDefault()
    e.stopPropagation()
    setMenu({ x: e.clientX, y: e.clientY, path, isDirectory })
  }

  /**
   * 处理新建文件
   */
  const handleCreateFile = async (dirPath: string) => {
    console.log('create file in', dirPath)
  }

  /**
   * 处理新建文件夹
   */
  const handleCreateDirectory = async (dirPath: string) => {
    console.log('create dir in', dirPath)
  }

  /**
   * 处理重命名
   */
  const handleRename = async (path: string) => {
    console.log('rename', path)
  }

  /**
   * 处理删除
   */
  const handleDelete = async (path: string) => {
    console.log('delete', path)
  }

  /**
   * 处理刷新
   */
  const handleRefresh = async (dirPath: string) => {
    await useFileStore.getState().refreshDirectory(dirPath)
  }

  /**
   * 根目录右键菜单
   */
  const isRootTarget = menu ? isRoot(menu.path) : false

  const menuItems: ContextMenuItem[] = menu
    ? [
        ...(isRootTarget
          ? [
              {
                label: '从工作区移除',
                onClick: () => removeRoot(menu.path),
              } as ContextMenuItem,
              { onClick: undefined, label: '' } as ContextMenuItem,
            ]
          : []),
        {
          label: '新建文件',
          onClick: () =>
            handleCreateFile(menu.isDirectory ? menu.path : menu.path.replace(/[^/\\]+$/, '')),
        },
        {
          label: '新建文件夹',
          onClick: () =>
            handleCreateDirectory(menu.isDirectory ? menu.path : menu.path.replace(/[^/\\]+$/, '')),
        },
        { onClick: undefined, label: '' },
        {
          label: '重命名',
          onClick: () => handleRename(menu.path),
        },
        {
          label: '删除',
          onClick: () => handleDelete(menu.path),
        },
        ...(menu.isDirectory
          ? [
              { onClick: undefined, label: '' } as ContextMenuItem,
              {
                label: '刷新',
                onClick: () => handleRefresh(menu.path),
              } as ContextMenuItem,
            ]
          : []),
        { onClick: undefined, label: '' },
        {
          label: useFavoritesStore.getState().has(menu.path) ? '从收藏夹移除' : '添加到收藏夹',
          onClick: () => {
            const favorites = useFavoritesStore.getState()
            if (favorites.has(menu.path)) {
              favorites.remove(menu.path)
            } else {
              favorites.add(
                menu.path,
                menu.path.split(/[\\/]/).pop() || menu.path,
                menu.isDirectory,
              )
            }
          },
        },
        { onClick: undefined, label: '' },
        {
          label: '复制地址',
          onClick: () => copyPathToClipboard(menu.path),
        },
        {
          label: '在文件夹中打开',
          onClick: () => revealPathInDir(menu.path),
        },
      ]
    : []

  return (
    <div className="py-2">
      <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
        <span>文件</span>
        <button
          ref={setSortButtonRef}
          title="排序"
          onClick={() => setSortMenuOpen(!sortMenuOpen)}
          className="text-xs hover:text-gray-700 dark:hover:text-gray-300"
        >
          ⇅
        </button>
      </div>
      {rootPaths.map((rootPath) => (
        <div key={rootPath} className="mt-1">
          <button
            onContextMenu={(e) => handleContextMenu(e, rootPath, true)}
            className="w-full text-left px-3 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center"
          >
            <span className="truncate">{basename(rootPath)}</span>
          </button>
          {getSortedEntries(rootPath)
            .filter(isVisibleFileEntry)
            .map((entry) => (
              <FileTreeNode
                key={entry.path}
                entry={entry}
                depth={0}
                allEntries={entries}
                getSortedEntries={getSortedEntries}
                onContextMenu={handleContextMenu}
              />
            ))}
        </div>
      ))}
      {menu && (
        <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />
      )}
      {sortMenuOpen && (
        <ContextMenu
          x={getSortMenuPosition().x}
          y={getSortMenuPosition().y}
          items={sortMenuItems}
          onClose={() => setSortMenuOpen(false)}
        />
      )}
    </div>
  )
}
