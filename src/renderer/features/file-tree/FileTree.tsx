import { basename } from '../../../shared/utils'
import { isVisibleFileEntry } from '../../../shared/settingsDefaults'
import { useFileStore } from './useFileStore'
import { useTabStore } from '../tabs/useTabStore'
import { FileIcon } from '../../components/FileIcon'
import type { FileEntry } from '../../../shared/types'

function FileTreeNode({
  entry,
  depth,
  allEntries,
}: {
  entry: FileEntry
  depth: number
  allEntries: Record<string, FileEntry[]>
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

  return (
    <div className="py-2">
      <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {basename(rootPath)}
      </div>
      {rootEntries?.filter(isVisibleFileEntry).map((entry) => (
        <FileTreeNode key={entry.path} entry={entry} depth={0} allEntries={entries} />
      ))}
    </div>
  )
}
