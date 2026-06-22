import { useEffect, type ReactNode } from 'react'
import { useUIStore } from '../stores/useUIStore'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useUIStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement

    const applyTheme = (isDark: boolean) => {
      root.classList.toggle('dark', isDark)
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
  }, [theme])

  return <>{children}</>
}
