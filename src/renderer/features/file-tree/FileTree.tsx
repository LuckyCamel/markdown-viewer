import { useState } from 'react'
import { basename } from '../../../shared/utils'
import { isVisibleFileEntry } from '../../../shared/settingsDefaults'
import { useFileStore } from './useFileStore'
import { useTabStore } from '../tabs/useTabStore'
import { FileIcon } from '../../components/FileIcon'
import { ContextMenu, type ContextMenuItem } from '../../components/ContextMenu'
import { copyPathToClipboard, revealPathInDir } from '../../lib/fileActions'
import type { FileEntry } from '../../../shared/types'

interface MenuState {
  x: number
  y: number
  path: string
}

function FileTreeNode({
  entry,
  depth,
  allEntries,
  onContextMenu,
}: {
  entry: FileEntry
  depth: number
  allEntries: Record<string, FileEntry[]>
  onContextMenu: (e: React.MouseEvent, path: string) => void
}) {
  const expanded = useFileStore((s) => s.expanded)
  const toggleExpand = useFileStore((s) => s.toggleExpand)
  const children = allEntries[entry.path]

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
        onContextMenu={(e) => onContextMenu(e, entry.path)}
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
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface FileTreeProps {
  rootPath: string
}

export function FileTree({ rootPath }: FileTreeProps) {
  const entries = useFileStore((s) => s.entries)
  const rootEntries = entries[rootPath]
  const [menu, setMenu] = useState<MenuState | null>(null)

  /**
   * 右键打开上下文菜单：阻止默认菜单并记录目标路径
   */
  const handleContextMenu = (e: React.MouseEvent, path: string) => {
    e.preventDefault()
    e.stopPropagation()
    setMenu({ x: e.clientX, y: e.clientY, path })
  }

  const menuItems: ContextMenuItem[] = menu
    ? [
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
      <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {basename(rootPath)}
      </div>
      {rootEntries?.filter(isVisibleFileEntry).map((entry) => (
        <FileTreeNode
          key={entry.path}
          entry={entry}
          depth={0}
          allEntries={entries}
          onContextMenu={handleContextMenu}
        />
      ))}
      {menu && (
        <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />
      )}
    </div>
  )
}
