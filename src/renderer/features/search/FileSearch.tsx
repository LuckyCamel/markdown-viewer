import { useState } from 'react'
import { FileIcon } from '../../components/FileIcon'
import { highlightMatchSegments } from '../../../shared/highlightMatch'

interface FileItem {
  path: string
  name: string
}

interface FileSearchProps {
  files: FileItem[]
  onSelect: (path: string) => void
}

export function FileSearch({ files, onSelect }: FileSearchProps) {
  const [query, setQuery] = useState('')
  const filtered = query
    ? files.filter((f) => {
        const q = query.toLowerCase()
        return f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q)
      })
    : files.slice(0, 50)

  return (
    <div className="p-2">
      <input
        type="text"
        placeholder="Search files..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
        autoFocus
      />
      <div className="mt-2 max-h-64 overflow-y-auto">
        {filtered.map((file) => (
          <button
            key={file.path}
            onClick={() => onSelect(file.path)}
            className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex items-center gap-2"
          >
            <FileIcon name={file.name} size={14} />
            <span className="truncate">
              {query ? highlightMatchSegments(file.name, query) : file.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
