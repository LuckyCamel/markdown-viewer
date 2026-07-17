import { useState } from 'react'
import { basename } from '../../../shared/utils'
import { useTabStore } from './useTabStore'
import { FileIcon } from '../../components/FileIcon'
import { ContextMenu, type ContextMenuItem } from '../../components/ContextMenu'
import { copyPathToClipboard, revealPathInDir } from '../../lib/fileActions'
import type { ViewMode } from '../../../shared/types'

interface MenuState {
  x: number
  y: number
  path: string
}

/**
 * TabBar：显示打开的文件标签页，右侧提供阅读/编辑切换按钮
 */
export function TabBar() {
  const openFiles = useTabStore((s) => s.openFiles)
  const activeFile = useTabStore((s) => s.activeFile)
  const viewModes = useTabStore((s) => s.viewModes)
  const isDirty = useTabStore((s) => s.isDirty)
  const setActive = useTabStore((s) => s.setActive)
  const closeFile = useTabStore((s) => s.closeFile)
  const setViewMode = useTabStore((s) => s.setViewMode)
  const [menu, setMenu] = useState<MenuState | null>(null)

  const viewMode: ViewMode = activeFile ? (viewModes[activeFile] ?? 'read') : 'read'

  const handleSetViewMode = (mode: ViewMode) => {
    if (activeFile) {
      setViewMode(activeFile, mode)
    }
  }

  if (openFiles.length === 0) return null

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
    <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      <div className="flex-1 flex overflow-x-auto">
        {openFiles.map((filePath) => {
          const isActive = filePath === activeFile
          const dirty = isDirty(filePath)
          const fileName = basename(filePath)
          return (
            <div
              key={filePath}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(filePath)}
              onMouseDown={(e) => {
                if (e.button === 1) closeFile(filePath)
              }}
              onContextMenu={(e) => handleContextMenu(e, filePath)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 text-sm cursor-pointer border-r border-gray-200 dark:border-gray-700 select-none
                ${
                  isActive
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-t-2 border-t-blue-500'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-750'
                }
              `}
            >
              <FileIcon name={fileName} size={14} />
              <span className="truncate max-w-32">{fileName}</span>
              {dirty && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  closeFile(filePath)
                }}
                className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs"
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-1 px-2 border-l border-gray-200 dark:border-gray-700">
        <button
          onClick={() => handleSetViewMode('read')}
          title="阅读视图"
          className={`p-1.5 rounded ${viewMode === 'read' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 5h16M4 10h16M4 15h10M4 20h7" />
          </svg>
        </button>
        <button
          onClick={() => handleSetViewMode('edit')}
          title="编辑视图"
          className={`p-1.5 rounded ${viewMode === 'edit' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </button>
      </div>
      {menu && (
        <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />
      )}
    </div>
  )
}
