import { useEffect, useRef, useState } from 'react'
import { ipc } from '../../lib/ipc'
import { useSearchStore } from './useSearchStore'
import { logError } from '../../logger'
import type { SearchMatch, SearchProgress } from '../../../shared/types'

const SEARCH_DEBOUNCE_MS = 300

interface ContentSearchProps {
  workspacePath: string
  onSelect: (match: SearchMatch) => void
}

/**
 * 生成唯一搜索会话 id
 */
function createSearchId(generation: number): string {
  return `search-${generation}-${Date.now()}`
}

export function ContentSearch({ workspacePath, onSelect }: ContentSearchProps) {
  const [query, setQuery] = useState('')
  const results = useSearchStore((s) => s.results)
  const isSearching = useSearchStore((s) => s.isSearching)
  const setResults = useSearchStore((s) => s.setResults)
  const setIsSearching = useSearchStore((s) => s.setIsSearching)
  const searchGenerationRef = useRef(0)
  const activeSearchIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!query || query.length < 2) {
      setIsSearching(false)
      setResults(null)
      return
    }

    const generation = ++searchGenerationRef.current
    let unsubscribe: (() => void) | undefined

    const timer = setTimeout(() => {
      const searchId = createSearchId(generation)
      activeSearchIdRef.current = searchId
      setIsSearching(true)
      setResults(null)

      const handleResult = (progress: SearchProgress) => {
        if (generation !== searchGenerationRef.current) return
        if (progress.searchId !== searchId) return
        setResults(progress)
        if (progress.isComplete) {
          setIsSearching(false)
        }
      }

      unsubscribe = ipc.search.onResult(handleResult)
      ipc.search.searchContent(workspacePath, query, searchId).catch((err) => {
        if (generation === searchGenerationRef.current) {
          logError('ContentSearch:searchContent', err)
          setIsSearching(false)
        }
      })
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      searchGenerationRef.current++
      if (activeSearchIdRef.current) {
        ipc.search.cancelSearch(activeSearchIdRef.current).catch((err) => {
          logError('ContentSearch:cancelSearch', err)
        })
        activeSearchIdRef.current = null
      }
      unsubscribe?.()
      setIsSearching(false)
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
          Searching... {results?.searchedFiles ?? 0}/{results?.totalFiles ?? 0} files
        </div>
      )}
      <div className="mt-2 max-h-64 overflow-y-auto">
        {matches.map((match, i) => (
          <button
            key={`${match.path}-${match.line}-${i}`}
            onClick={() => onSelect(match)}
            className="w-full text-left px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <div className="text-sm font-medium truncate">
              {match.path.split('\\').pop()?.split('/').pop()}
              <span className="ml-2 text-xs text-gray-400">:{match.line}</span>
            </div>
            <div className="text-xs text-gray-500 line-clamp-1">{match.lineContent}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
