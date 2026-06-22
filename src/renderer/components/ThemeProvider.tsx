import { useEffect, type ReactNode } from 'react'
import { useUIStore } from '../stores/useUIStore'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useUIStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'light') {
      root.classList.remove('dark')
    } else {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      if (mq.matches) root.classList.add('dark')
      else root.classList.remove('dark')
    }
  }, [theme])

  return <>{children}</>
}
