import { create } from 'zustand'
import type { ThemeMode } from '../../shared/types'
import type { ThemeId } from '../lib/themes'

/**
 * 主题状态 Store
 *
 * 管理 theme（系统/亮/暗）、themeId（内置主题配色）、codeTheme（代码高亮主题）。
 * 从 useUIStore 拆分而来，提高主题域的 Locality。
 */
interface ThemeState {
  /** 主题模式：system / light / dark */
  theme: ThemeMode
  /** 内置主题配色 ID */
  themeId: ThemeId | null
  /** 代码高亮主题 */
  codeTheme: string
  setTheme: (theme: ThemeMode) => void
  setThemeId: (themeId: ThemeId | null) => void
  setCodeTheme: (theme: string) => void
  reset: () => void
}

const initialState = {
  theme: 'system' as ThemeMode,
  themeId: null as ThemeId | null,
  codeTheme: 'auto',
}

export const useThemeStore = create<ThemeState>((set) => ({
  ...initialState,
  setTheme: (theme) => set({ theme }),
  setThemeId: (themeId) => set({ themeId }),
  setCodeTheme: (theme) => set({ codeTheme: theme }),
  reset: () => set(initialState),
}))
