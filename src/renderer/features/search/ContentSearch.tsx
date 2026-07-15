import { useEffect, useRef, useState } from 'react'
import { ipc } from '../../lib/ipc'
import { useSearchStore } from './useSearchStore'
import { logError } from '../../logger'
import { t } from '../../../shared/i18n'
import type { SearchMatch, SearchProgress } from '../../../shared/types'

const SEARCH_DEBOUNCE_MS = 300

interface ContentSearchProps {
  rootPaths: string[]
  onSelect: (match: SearchMatch) => void
}

/**
 * 生成唯一搜索会话 id
 */
function createSearchId(generation: number): string {
  return `search-${generation}-${Date.now()}`
}

export function ContentSearch({ rootPaths, onSelect }: ContentSearchProps) {
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const results = useSearchStore((s) => s.results)
  const isSearching = useSearchStore((s) => s.isSearching)
  const isRegex = useSearchStore((s) => s.isRegex)
  const setResults = useSearchStore((s) => s.setResults)
  const appendResults = useSearchStore((s) => s.appendResults)
  const setIsSearching = useSearchStore((s) => s.setIsSearching)
  const setIsRegex = useSearchStore((s) => s.setIsRegex)
  const searchGenerationRef = useRef(0)
  const activeSearchIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!query || query.length < 2) {
      setIsSearching(false)
      setResults(null)
      setError(null)
      return
    }

    const generation = ++searchGenerationRef.current
    let unsubscribe: (() => void) | undefined

    const timer = setTimeout(() => {
      const searchId = createSearchId(generation)
      activeSearchIdRef.current = searchId
      setIsSearching(true)
      setResults(null)
      setError(null)

      const handleResult = (progress: SearchProgress) => {
        if (generation !== searchGenerationRef.current) return
        if (progress.searchId !== searchId) return
        appendResults(progress)
        if (progress.isComplete) {
          setIsSearching(false)
        }
      }

      unsubscribe = ipc.search.onResult(handleResult)
      ipc.search.searchContent(rootPaths, query, searchId, isRegex).catch((err) => {
        if (generation === searchGenerationRef.current) {
          logError('ContentSearch:searchContent', err)
          setIsSearching(false)
          setError(typeof err === 'string' ? err : String(err))
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
  }, [query, rootPaths, isRegex, setResults, appendResults, setIsSearching])

  const matches = results?.matches || []

  return (
    <div className="p-2">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={t('search.contentPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoFocus
        />
        <button
          type="button"
          onClick={() => setIsRegex(!isRegex)}
          title={t('search.regexMode')}
          className={`px-2 py-1.5 text-sm rounded border whitespace-nowrap ${
            isRegex
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600'
          }`}
        >
          .*
        </button>
      </div>
      {error && <div className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</div>}
      {isSearching && (
        <div className="mt-2 text-xs text-gray-500">
          {t('search.searching')} {results?.searchedFiles ?? 0}/{results?.totalFiles ?? 0}{' '}
          {t('search.files')}
        </div>
      )}
      {results?.truncated && (
        <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          {t('search.truncatedPrefix')}
          {results.matchLimit ?? 500}
          {t('search.truncatedSuffix')}
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
