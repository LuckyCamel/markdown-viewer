import { useRef, useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useLayoutStore } from '../stores/useLayoutStore'
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
  const sidebarWidth = useLayoutStore((s) => s.sidebarWidth)
  const outlineWidth = useLayoutStore((s) => s.outlineWidth)
  const setSidebarWidth = useLayoutStore((s) => s.setSidebarWidth)
  const setOutlineWidth = useLayoutStore((s) => s.setOutlineWidth)

  const containerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef<'sidebar' | 'outline' | null>(null)
  const [dragging, setDragging] = useState<'sidebar' | 'outline' | null>(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  const handleMouseDown = useCallback(
    (panel: 'sidebar' | 'outline') => (e: React.MouseEvent) => {
      e.preventDefault()
      draggingRef.current = panel
      setDragging(panel)
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
      setDragging(null)
      document.body.classList.remove('select-none')
      document.body.style.cursor = ''
      const width =
        panel === 'sidebar'
          ? useLayoutStore.getState().sidebarWidth
          : useLayoutStore.getState().outlineWidth
      ipc.store.set(panel === 'sidebar' ? 'sidebarWidth' : 'outlineWidth', width).catch((err) => {
        logError('Layout:persistWidth', err)
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.body.classList.remove('select-none')
      document.body.style.cursor = ''
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
              className="w-3 flex-shrink-0 flex justify-center cursor-col-resize"
              onMouseDown={handleMouseDown('sidebar')}
            >
              <div
                className={`w-px h-full transition-colors ${dragging === 'sidebar' ? 'bg-blue-500' : 'bg-transparent hover:bg-blue-400'}`}
              />
            </div>
          </>
        )}
        <main className="flex-1 overflow-y-auto">{main}</main>
        {outlineVisible && (
          <>
            <div
              className="w-3 flex-shrink-0 flex justify-center cursor-col-resize"
              onMouseDown={handleMouseDown('outline')}
            >
              <div
                className={`w-px h-full transition-colors ${dragging === 'outline' ? 'bg-blue-500' : 'bg-transparent hover:bg-blue-400'}`}
              />
            </div>
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
