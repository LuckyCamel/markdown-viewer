import { useEffect } from 'react'
import { ipc } from '../lib/ipc'

export function useScrollRestore(activeFile: string | null, content: string | undefined) {
  useEffect(() => {
    if (!activeFile) return
    const container = document.querySelector('main > div:first-child')
    if (!container) return
    const handleScroll = () => {
      ipc.store.set('readingPositions', {
        [activeFile]: container.scrollTop,
      })
    }
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [activeFile])

  useEffect(() => {
    if (!activeFile || !content) return
    ;(async () => {
      const positions = await ipc.store.get<Record<string, number>>('readingPositions')
      if (positions?.[activeFile]) {
        const container = document.querySelector('main > div:first-child')
        if (container) {
          requestAnimationFrame(() => {
            container.scrollTop = positions[activeFile]
          })
        }
      }
    })()
  }, [activeFile, content])
}
