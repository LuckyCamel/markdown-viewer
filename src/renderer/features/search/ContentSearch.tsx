import { useEffect, useState } from 'react'
import { useSearchStore } from './useSearchStore'
import type { SearchProgress } from '../../../shared/types'

interface ContentSearchProps {
  workspacePath: string
  onSelect: (path: string) => void
}

export function ContentSearch({ workspacePath, onSelect }: ContentSearchProps) {
  const [query, setQuery] = useState('')
  const results = useSearchStore((s) => s.results)
  const isSearching = useSearchStore((s) => s.isSearching)
  const setResults = useSearchStore((s) => s.setResults)
  const setIsSearching = useSearchStore((s) => s.setIsSearching)

  useEffect(() => {
    if (!query || query.length < 2) return
    setIsSearching(true)
    setResults(null)

    const onResult = (progress: SearchProgress) => {
      setResults(progress)
    }

    window.api.search.onResult(onResult)
    window.api.search.searchContent(workspacePath, query)

    return () => {
      window.api.search.offResult(onResult)
    }
  }, [query, workspacePath, setResults, setIsSearching])

  const matches = results?.matches || []

  return (
    <div className="p-2">
      <input
        type="text"
        placeholder="Search content..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
        autoFocus
      />
      {isSearching && (
        <div className="mt-2 text-xs text-gray-500">
          Searching... {results?.searchedFiles}/{results?.totalFiles} files
        </div>
      )}
      <div className="mt-2 max-h-64 overflow-y-auto">
        {matches.map((match, i) => (
          <button
            key={`${match.path}-${match.line}-${i}`}
            onClick={() => onSelect(match.path)}
            className="w-full text-left px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <div className="text-sm font-medium truncate">
              {match.path.split('\\').pop()?.split('/').pop()}
            </div>
            <div className="text-xs text-gray-500 line-clamp-1">{match.lineContent}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
