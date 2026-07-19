import { useEffect, useState, useCallback, useRef } from 'react'
import { SCROLL_CONTAINER_SELECTOR } from '../../shared/scrollContainer'
import { measureHeadingOffsets, pickActiveHeadingByScroll } from '../../shared/outlineActiveHeading'

/**
 * 根据正文滚动位置同步当前可见的大纲标题 id（scroll-spy）
 */
export function useOutlineActiveHeading(headingIds: string[]) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const idsKey = headingIds.join('\0')
  const rafRef = useRef<number | null>(null)

  const setActiveHeading = useCallback((id: string) => {
    setActiveId(id)
  }, [])

  useEffect(() => {
    if (headingIds.length === 0) {
      setActiveId(null)
      return
    }

    let cancelled = false
    let unbindScroll: (() => void) | null = null

    const syncActive = () => {
      const container = document.querySelector(SCROLL_CONTAINER_SELECTOR)
      if (!(container instanceof HTMLElement)) return

      const offsets = measureHeadingOffsets(container, headingIds)
      if (offsets.length === 0) return

      setActiveId(pickActiveHeadingByScroll(offsets, container.scrollTop))
    }

    const scheduleSync = () => {
      if (rafRef.current !== null) return
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        if (!cancelled) syncActive()
      })
    }

    const frame = requestAnimationFrame(() => {
      if (cancelled) return

      const container = document.querySelector(SCROLL_CONTAINER_SELECTOR)
      if (!(container instanceof HTMLElement)) return

      syncActive()
      container.addEventListener('scroll', scheduleSync, { passive: true })
      unbindScroll = () => container.removeEventListener('scroll', scheduleSync)
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      unbindScroll?.()
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
    // 使用 idsKey（headingIds 的字符串化）作为依赖，避免数组引用变化导致重复绑定 scroll 事件
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey])

  return { activeId, setActiveHeading }
}
