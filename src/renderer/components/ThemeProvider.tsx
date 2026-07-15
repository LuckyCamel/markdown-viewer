import { useEffect, type ReactNode } from 'react'
import { useUIStore } from '../stores/useUIStore'
import { applyCodeTheme, resolveCodeTheme } from '../lib/codeThemes'
import { useSettingsStore } from '../features/settings/useSettingsStore'
import { resolveThemeId, getThemeVariant, type ThemeId } from '../lib/themes'

/**
 * 应用阅读设置到 CSS 变量
 */
function applyReadingSettings(settings: {
  fontSize: number
  lineHeight: number
  contentMaxWidth: number | null
  fontFamily: string
  codeFontFamily: string
}) {
  const root = document.documentElement
  root.style.setProperty('--font-size', `${settings.fontSize}px`)
  root.style.setProperty('--line-height', String(settings.lineHeight))
  root.style.setProperty(
    '--content-max-width',
    settings.contentMaxWidth ? `${settings.contentMaxWidth}px` : 'none',
  )
  root.style.setProperty('--font-family', settings.fontFamily || 'inherit')
  root.style.setProperty('--code-font-family', settings.codeFontFamily || 'inherit')
}

/**
 * 应用主题 ID 到 DOM
 */
function applyThemeId(themeId: ThemeId) {
  document.documentElement.setAttribute('data-theme', themeId)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useUIStore((s) => s.theme)
  const themeId = useUIStore((s) => s.themeId)
  const codeTheme = useUIStore((s) => s.codeTheme)
  const fontSize = useSettingsStore((s) => s.fontSize)
  const lineHeight = useSettingsStore((s) => s.lineHeight)
  const contentMaxWidth = useSettingsStore((s) => s.contentMaxWidth)
  const fontFamily = useSettingsStore((s) => s.fontFamily)
  const codeFontFamily = useSettingsStore((s) => s.codeFontFamily)

  useEffect(() => {
    const root = document.documentElement

    const applyTheme = (isDark: boolean) => {
      root.classList.toggle('dark', isDark)

      // 解析最终使用的主题 ID
      const resolvedThemeId = resolveThemeId(theme, themeId, isDark)
      applyThemeId(resolvedThemeId)

      // 根据实际主题变体应用代码主题
      const actualVariant = getThemeVariant(resolvedThemeId)
      const resolved = resolveCodeTheme(codeTheme, actualVariant)
      applyCodeTheme(resolved)
    }

    if (theme === 'dark') {
      applyTheme(true)
      return
    } else if (theme === 'light') {
      applyTheme(false)
      return
    }

    // system 模式：监听 OS 主题变更
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    applyTheme(mq.matches)

    const handleChange = (e: MediaQueryListEvent) => applyTheme(e.matches)
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [theme, themeId, codeTheme])

  // 应用阅读设置
  useEffect(() => {
    applyReadingSettings({ fontSize, lineHeight, contentMaxWidth, fontFamily, codeFontFamily })
  }, [fontSize, lineHeight, contentMaxWidth, fontFamily, codeFontFamily])

  return <>{children}</>
}
