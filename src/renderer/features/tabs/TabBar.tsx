import { basename } from '../../../shared/utils'
import { useTabStore } from './useTabStore'

export function TabBar() {
  const openFiles = useTabStore((s) => s.openFiles)
  const activeFile = useTabStore((s) => s.activeFile)
  const dirtyFiles = useTabStore((s) => s.dirtyFiles)
  const setActive = useTabStore((s) => s.setActive)
  const closeFile = useTabStore((s) => s.closeFile)

  if (openFiles.length === 0) return null

  return (
    <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-x-auto">
      {openFiles.map((filePath) => {
        const isActive = filePath === activeFile
        const isDirty = dirtyFiles.has(filePath)
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
              flex items-center gap-1 px-3 py-1.5 text-sm cursor-pointer border-r border-gray-200 dark:border-gray-700 select-none
              ${
                isActive
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-t-2 border-t-blue-500'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-750'
              }
            `}
          >
            <span className="truncate max-w-32">{basename(filePath)}</span>
            {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
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
  )
}
