import { useState } from 'react'
import { basename } from '../../../shared/utils'
import { isVisibleFileEntry } from '../../../shared/fileTypes'
import { useFileStore } from './useFileStore'
import { useTabStore } from '../tabs/useTabStore'
import { FileIcon } from '../../components/FileIcon'
import { ContextMenu, type ContextMenuItem } from '../../components/ContextMenu'
import { InlineRenameInput } from '../../components/InlineRenameInput'
import { copyPathToClipboard, revealPathInDir } from '../../lib/fileActions'
import { useFavoritesStore } from './useFavoritesStore'
import { t } from '../../../shared/i18n'
import type { FileEntry } from '../../../shared/types'

interface MenuState {
  x: number
  y: number
  path: string
  isDirectory: boolean
}

/** 新建条目状态：记录当前正在新建的条目类型与所在目录 */
interface CreatingState {
  type: 'file' | 'directory'
  dirPath: string
}

interface FileTreeNodeProps {
  entry: FileEntry
  depth: number
  allEntries: Record<string, FileEntry[]>
  getSortedEntries: (dirPath: string) => FileEntry[]
  onContextMenu: (e: React.MouseEvent, path: string, isDirectory: boolean) => void
  /** 当前正在重命名的节点路径 */
  renaming: string | null
  /** 提交重命名 */
  onSubmitRename: (newName: string) => void
  /** 取消重命名 */
  onCancelRename: () => void
  /** 当前正在新建的条目状态 */
  creating: CreatingState | null
  /** 提交新建 */
  onSubmitCreate: (name: string) => void
  /** 取消新建 */
  onCancelCreate: () => void
}

/**
 * 文件树节点组件
 *
 * 支持行内重命名与新建：当节点路径匹配 renaming 时渲染输入框；
 * 当节点为目录且路径匹配 creating.dirPath 时在子节点顶部渲染新建输入框。
 */
function FileTreeNode({
  entry,
  depth,
  allEntries,
  getSortedEntries,
  onContextMenu,
  renaming,
  onSubmitRename,
  onCancelRename,
  creating,
  onSubmitCreate,
  onCancelCreate,
}: FileTreeNodeProps) {
  const expanded = useFileStore((s) => s.expanded)
  const toggleExpand = useFileStore((s) => s.toggleExpand)
  const children = allEntries[entry.path] ? getSortedEntries(entry.path) : undefined

  const isExpanded = expanded[entry.path] ?? false
  const isRenaming = renaming === entry.path

  /**
   * 点击节点：目录切换展开，文件打开标签页
   */
  const handleClick = () => {
    if (entry.isDirectory) {
      toggleExpand(entry.path)
    } else {
      useTabStore.getState().openFile(entry.path)
    }
  }

  // 正在重命名当前节点：渲染输入框替代普通按钮
  if (isRenaming) {
    return (
      <div className="px-2 py-0.5" style={{ paddingLeft: `${depth * 16 + 8}px` }}>
        <InlineRenameInput
          initialValue={entry.name}
          placeholder={entry.isDirectory ? '文件夹名' : '文件名'}
          onSubmit={onSubmitRename}
          onCancel={onCancelRename}
          submitOnBlur
        />
      </div>
    )
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
          {creating && creating.dirPath === entry.path && (
            <div className="px-2 py-0.5" style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}>
              <InlineRenameInput
                initialValue=""
                placeholder={creating.type === 'file' ? '文件名' : '文件夹名'}
                onSubmit={onSubmitCreate}
                onCancel={onCancelCreate}
                submitOnBlur
              />
            </div>
          )}
          {children.filter(isVisibleFileEntry).map((child) => (
            <FileTreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              allEntries={allEntries}
              getSortedEntries={getSortedEntries}
              onContextMenu={onContextMenu}
              renaming={renaming}
              onSubmitRename={onSubmitRename}
              onCancelRename={onCancelRename}
              creating={creating}
              onSubmitCreate={onSubmitCreate}
              onCancelCreate={onCancelCreate}
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
 * 支持行内新建文件/文件夹、重命名、删除与刷新操作。
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
  const [creating, setCreating] = useState<CreatingState | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)

  /**
   * 排序菜单项：修改时间与大小默认降序
   */
  const sortMenuItems: ContextMenuItem[] = [
    { label: '按名称', onClick: () => setSort('name') },
    { label: '按修改时间', onClick: () => setSort('modified', 'desc') },
    { label: '按大小', onClick: () => setSort('size', 'desc') },
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
   * 处理新建文件：必要时展开目录后进入新建状态
   */
  const handleCreateFile = async (dirPath: string) => {
    const { expanded, toggleExpand } = useFileStore.getState()
    if (!expanded[dirPath]) {
      await toggleExpand(dirPath)
    }
    setCreating({ type: 'file', dirPath })
  }

  /**
   * 处理新建文件夹：必要时展开目录后进入新建状态
   */
  const handleCreateDirectory = async (dirPath: string) => {
    const { expanded, toggleExpand } = useFileStore.getState()
    if (!expanded[dirPath]) {
      await toggleExpand(dirPath)
    }
    setCreating({ type: 'directory', dirPath })
  }

  /**
   * 处理重命名：进入重命名状态
   */
  const handleRename = async (path: string) => {
    setRenaming(path)
  }

  /**
   * 处理删除：弹确认对话框，确认后调用 store 删除
   */
  const handleDelete = async (path: string) => {
    if (confirm(`确定删除 ${basename(path)} 吗？`)) {
      await useFileStore.getState().deleteEntry(path)
    }
  }

  /**
   * 处理刷新
   */
  const handleRefresh = async (dirPath: string) => {
    await useFileStore.getState().refreshDirectory(dirPath)
  }

  /**
   * 提交新建：根据类型调用对应 store 方法
   */
  const handleSubmitCreate = async (name: string) => {
    if (!creating || !name) {
      setCreating(null)
      return
    }
    try {
      if (creating.type === 'file') {
        await useFileStore.getState().createFile(creating.dirPath, name)
      } else {
        await useFileStore.getState().createDirectory(creating.dirPath, name)
      }
    } catch {
      // 错误已在 store 内记录
    }
    setCreating(null)
  }

  /**
   * 取消新建
   */
  const handleCancelCreate = () => {
    setCreating(null)
  }

  /**
   * 提交重命名
   */
  const handleSubmitRename = async (newName: string) => {
    if (!renaming || !newName) {
      setRenaming(null)
      return
    }
    try {
      await useFileStore.getState().renameEntry(renaming, newName)
    } catch {
      // 错误已在 store 内记录
    }
    setRenaming(null)
  }

  /**
   * 取消重命名
   */
  const handleCancelRename = () => {
    setRenaming(null)
  }

  /**
   * 刷新所有根目录
   */
  const handleRefreshAll = () => {
    for (const p of rootPaths) {
      useFileStore.getState().refreshDirectory(p)
    }
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
          label: t('fileTree.newFile'),
          onClick: () =>
            handleCreateFile(menu.isDirectory ? menu.path : menu.path.replace(/[^/\\]+$/, '')),
        },
        {
          label: t('fileTree.newFolder'),
          onClick: () =>
            handleCreateDirectory(menu.isDirectory ? menu.path : menu.path.replace(/[^/\\]+$/, '')),
        },
        { onClick: undefined, label: '' },
        {
          label: t('fileTree.rename'),
          onClick: () => handleRename(menu.path),
        },
        {
          label: t('fileTree.delete'),
          onClick: () => handleDelete(menu.path),
        },
        ...(menu.isDirectory
          ? [
              { onClick: undefined, label: '' } as ContextMenuItem,
              {
                label: t('fileTree.refresh'),
                onClick: () => handleRefresh(menu.path),
              } as ContextMenuItem,
            ]
          : []),
        { onClick: undefined, label: '' },
        {
          label: useFavoritesStore.getState().has(menu.path)
            ? t('fileTree.removeFromFavorites')
            : t('fileTree.addToFavorites'),
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
        <div className="flex items-center gap-2">
          <button
            title="刷新"
            onClick={handleRefreshAll}
            className="text-xs hover:text-gray-700 dark:hover:text-gray-300"
          >
            ↻
          </button>
          <button
            ref={setSortButtonRef}
            title="排序"
            onClick={() => setSortMenuOpen(!sortMenuOpen)}
            className="text-xs hover:text-gray-700 dark:hover:text-gray-300"
          >
            ⇅
          </button>
        </div>
      </div>
      {rootPaths.map((rootPath) => (
        <div key={rootPath} className="mt-1">
          <button
            onContextMenu={(e) => handleContextMenu(e, rootPath, true)}
            className="w-full text-left px-3 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center justify-between group"
          >
            <span className="truncate">{basename(rootPath)}</span>
            <span
              role="button"
              tabIndex={0}
              title="刷新"
              onClick={(e) => {
                e.stopPropagation()
                handleRefresh(rootPath)
              }}
              className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100"
            >
              ↻
            </span>
          </button>
          {creating && creating.dirPath === rootPath && (
            <div className="px-2 py-0.5" style={{ paddingLeft: '8px' }}>
              <InlineRenameInput
                initialValue=""
                placeholder={creating.type === 'file' ? '文件名' : '文件夹名'}
                onSubmit={handleSubmitCreate}
                onCancel={handleCancelCreate}
                submitOnBlur
              />
            </div>
          )}
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
                renaming={renaming}
                onSubmitRename={handleSubmitRename}
                onCancelRename={handleCancelRename}
                creating={creating}
                onSubmitCreate={handleSubmitCreate}
                onCancelCreate={handleCancelCreate}
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
