import { useRef, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useUIStore } from '../stores/useUIStore'
import { ipc } from '../lib/ipc'
import { logError } from '../logger'

interface LayoutProps {
  sidebar: ReactNode
  main: ReactNode
  outline: ReactNode
  sidebarVisible: boolean
  outlineVisible: boolean
}

export function Layout({ sidebar, main, outline, sidebarVisible, outlineVisible }: LayoutProps) {
  const sidebarWidth = useUIStore((s) => s.sidebarWidth)
  const outlineWidth = useUIStore((s) => s.outlineWidth)
  const setSidebarWidth = useUIStore((s) => s.setSidebarWidth)
  const setOutlineWidth = useUIStore((s) => s.setOutlineWidth)

  const containerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef<'sidebar' | 'outline' | null>(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  const handleMouseDown = useCallback(
    (panel: 'sidebar' | 'outline') => (e: React.MouseEvent) => {
      e.preventDefault()
      draggingRef.current = panel
      startXRef.current = e.clientX
      startWidthRef.current = panel === 'sidebar' ? sidebarWidth : outlineWidth
      document.body.classList.add('select-none')
      document.body.style.cursor = 'col-resize'
    },
    [sidebarWidth, outlineWidth],
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return
      const delta = e.clientX - startXRef.current
      const maxWidth = containerRef.current.offsetWidth * 0.5
      const newWidth = Math.min(maxWidth, Math.max(160, startWidthRef.current + delta))
      if (draggingRef.current === 'sidebar') {
        setSidebarWidth(newWidth)
      } else {
        setOutlineWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      if (!draggingRef.current) return
      const panel = draggingRef.current
      draggingRef.current = null
      document.body.classList.remove('select-none')
      document.body.style.cursor = ''
      const width =
        panel === 'sidebar'
          ? useUIStore.getState().sidebarWidth
          : useUIStore.getState().outlineWidth
      ipc.store.set(panel === 'sidebar' ? 'sidebarWidth' : 'outlineWidth', width).catch((err) => {
        logError('Layout:persistWidth', err)
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [setSidebarWidth, setOutlineWidth])

  return (
    <div className="h-screen flex flex-col">
      <div ref={containerRef} className="flex flex-1 overflow-hidden">
        {sidebarVisible && (
          <>
            <aside
              style={{ width: sidebarWidth }}
              className="border-r border-gray-200 dark:border-gray-700 overflow-y-auto flex-shrink-0"
            >
              {sidebar}
            </aside>
            <div
              className="w-1 cursor-col-resize bg-transparent hover:bg-blue-400 flex-shrink-0"
              onMouseDown={handleMouseDown('sidebar')}
            />
          </>
        )}
        <main className="flex-1 overflow-y-auto">{main}</main>
        {outlineVisible && (
          <>
            <div
              className="w-1 cursor-col-resize bg-transparent hover:bg-blue-400 flex-shrink-0"
              onMouseDown={handleMouseDown('outline')}
            />
            <aside
              style={{ width: outlineWidth }}
              className="border-l border-gray-200 dark:border-gray-700 overflow-y-auto flex-shrink-0"
            >
              {outline}
            </aside>
          </>
        )}
      </div>
    </div>
  )
}
