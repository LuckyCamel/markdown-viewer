import { create } from 'zustand'
import type { SearchProgress } from '../../../shared/types'

interface SearchState {
  query: string
  results: SearchProgress | null
  isSearching: boolean
  isRegex: boolean
  setQuery: (query: string) => void
  setResults: (results: SearchProgress | null) => void
  appendResults: (progress: SearchProgress) => void
  setIsSearching: (isSearching: boolean) => void
  setIsRegex: (isRegex: boolean) => void
  reset: () => void
}

/**
 * 合并增量搜索进度；优先使用 newMatches 追加，避免全量 matches 复制
 */
function mergeSearchProgress(
  prev: SearchProgress | null,
  progress: SearchProgress,
): SearchProgress {
  if (!prev || prev.searchId !== progress.searchId) {
    const initialMatches = progress.newMatches ?? progress.matches
    return { ...progress, matches: initialMatches }
  }

  const incremental = progress.newMatches ?? []
  if (incremental.length > 0) {
    return {
      ...progress,
      matches: [...prev.matches, ...incremental],
    }
  }

  if (progress.matches.length >= prev.matches.length) {
    return progress
  }

  return { ...progress, matches: prev.matches }
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  results: null,
  isSearching: false,
  isRegex: false,
  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results }),
  appendResults: (progress) =>
    set((state) => ({ results: mergeSearchProgress(state.results, progress) })),
  setIsSearching: (isSearching) => set({ isSearching }),
  setIsRegex: (isRegex) => set({ isRegex }),
  reset: () => set({ query: '', results: null, isSearching: false, isRegex: false }),
}))
