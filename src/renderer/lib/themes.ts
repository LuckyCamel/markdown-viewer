/**
 * 内置主题定义
 *
 * 主题系统说明：
 * - themeId: 具体主题配色标识（如 light-warm, dark-oled）
 * - variant: 明暗变体（light / dark），用于代码主题匹配
 * - 主题通过 CSS 变量 + data-theme 属性应用
 */

import type { ThemeMode } from '../../shared/types'

/** 主题标识符 */
export type ThemeId =
  | 'light-default'
  | 'light-warm'
  | 'light-cool'
  | 'dark-default'
  | 'dark-oled'
  | 'dark-sepia'

/** 主题变体 */
export type ThemeVariant = 'light' | 'dark'

/** 主题元信息 */
export interface ThemeMeta {
  id: ThemeId
  name: string
  nameEn: string
  variant: ThemeVariant
}

/**
 * 内置主题列表
 */
export const THEMES: ThemeMeta[] = [
  // 浅色主题
  { id: 'light-default', name: '浅色默认', nameEn: 'Light Default', variant: 'light' },
  { id: 'light-warm', name: '浅色护眼', nameEn: 'Light Warm', variant: 'light' },
  { id: 'light-cool', name: '浅色清爽', nameEn: 'Light Cool', variant: 'light' },
  // 深色主题
  { id: 'dark-default', name: '深色默认', nameEn: 'Dark Default', variant: 'dark' },
  { id: 'dark-oled', name: '深色纯黑', nameEn: 'Dark OLED', variant: 'dark' },
  { id: 'dark-sepia', name: '深色护眼', nameEn: 'Dark Sepia', variant: 'dark' },
]

/**
 * 根据主题 ID 获取变体
 */
export function getThemeVariant(themeId: ThemeId): ThemeVariant {
  const theme = THEMES.find((t) => t.id === themeId)
  return theme?.variant ?? 'light'
}

/**
 * 获取指定变体的主题列表
 */
export function getThemesByVariant(variant: ThemeVariant): ThemeMeta[] {
  return THEMES.filter((t) => t.variant === variant)
}

/**
 * 根据 ThemeMode 和 ThemeId 获取最终使用的主题 ID
 *
 * @param theme - 用户设置的明暗模式
 * @param themeId - 用户选择的主题配色
 * @param systemIsDark - 系统是否为深色模式（仅在 theme='system' 时使用）
 * @returns 实际应用的主题 ID
 */
export function resolveThemeId(
  theme: ThemeMode,
  themeId: ThemeId | null,
  systemIsDark: boolean,
): ThemeId {
  // 确定实际使用的变体
  const actualVariant: ThemeVariant = theme === 'system' ? (systemIsDark ? 'dark' : 'light') : theme

  // 如果已有主题 ID 且变体匹配，直接使用
  if (themeId) {
    const variant = getThemeVariant(themeId)
    if (variant === actualVariant) {
      return themeId
    }
  }

  // 否则返回对应变体的默认主题
  return actualVariant === 'dark' ? 'dark-default' : 'light-default'
}

/**
 * 获取默认主题 ID
 */
export function getDefaultThemeId(variant: ThemeVariant): ThemeId {
  return variant === 'dark' ? 'dark-default' : 'light-default'
}
