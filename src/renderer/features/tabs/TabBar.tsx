import { basename } from '../../../shared/utils'
import { useTabStore } from './useTabStore'
import { useUIStore } from '../../stores/useUIStore'
import { FileIcon } from '../../components/FileIcon'

/**
 * TabBar：显示打开的文件标签页，右侧提供源码/渲染切换按钮
 */
export function TabBar() {
  const openFiles = useTabStore((s) => s.openFiles)
  const activeFile = useTabStore((s) => s.activeFile)
  const isDirty = useTabStore((s) => s.isDirty)
  const setActive = useTabStore((s) => s.setActive)
  const closeFile = useTabStore((s) => s.closeFile)

  const viewMode = useUIStore((s) => s.viewMode)
  const setViewMode = useUIStore((s) => s.setViewMode)

  if (openFiles.length === 0) return null

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
          onClick={() => setViewMode('render')}
          title="渲染视图"
          className={`p-1.5 rounded ${viewMode === 'render' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
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
          onClick={() => setViewMode('source')}
          title="源码视图"
          className={`p-1.5 rounded ${viewMode === 'source' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </button>
      </div>
    </div>
  )
}
