import { create } from 'zustand'
import type { SearchProgress } from '../../../shared/types'

interface SearchState {
  query: string
  results: SearchProgress | null
  isSearching: boolean
  setQuery: (query: string) => void
  setResults: (results: SearchProgress | null) => void
  setIsSearching: (isSearching: boolean) => void
  reset: () => void
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  results: null,
  isSearching: false,
  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results }),
  setIsSearching: (isSearching) => set({ isSearching }),
  reset: () => set({ query: '', results: null, isSearching: false }),
}))
