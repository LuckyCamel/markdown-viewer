import { useEffect } from 'react'
import { ipc } from '../lib/ipc'
import { logError } from '../logger'

export function useScrollRestore(activeFile: string | null, content: string | undefined) {
  useEffect(() => {
    if (!activeFile) return
    const container = document.querySelector('main > div:first-child')
    if (!container) return
    const handleScroll = () => {
      const top = container.scrollTop
      ipc.store
        .get<Record<string, number>>('readingPositions')
        .then((saved) => ({ ...saved, [activeFile]: top }))
        .then((merged) => ipc.store.set('readingPositions', merged))
        .catch((err) => logError('useScrollRestore:save', err))
    }
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [activeFile])

  useEffect(() => {
    if (!activeFile || !content) return
    ;(async () => {
      const positions = await ipc.store
        .get<Record<string, number>>('readingPositions')
        .catch((err) => {
          logError('useScrollRestore:load', err)
          return undefined
        })
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
