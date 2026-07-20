import { useState, useEffect, useRef, useCallback } from 'react'

/** 触发分片的默认阈值（行数超过 1000 才分片） */
export const CHUNK_THRESHOLD_LINES = 1000

/** 首屏默认渲染行数 */
export const CHUNK_INITIAL_LINES = 200

/** 每次追加的默认行数 */
export const CHUNK_SIZE = 200

export interface UseChunkedContentOptions {
  /** 首屏渲染行数 */
  initialLines?: number
  /** 每次追加的行数 */
  chunkSize?: number
  /** 触发分片的行数阈值 */
  thresholdLines?: number
}

export interface UseChunkedContentResult {
  /** 当前应渲染的内容 */
  visibleContent: string
  /** 哨兵元素 ref，附加到渲染列表底部 */
  sentinelRef: React.RefObject<HTMLDivElement | null>
  /** 是否还有更多未渲染的内容 */
  hasMore: boolean
  /** 一次性渲染全部内容（用于锚点跳转等场景） */
  renderAll: () => void
}

/**
 * 大文档分片渲染 hook
 *
 * - 短文档（行数 ≤ thresholdLines）：直接返回全部内容，不分片
 * - 长文档：首屏返回 initialLines 行，IntersectionObserver 监听哨兵元素，
 *   当哨兵进入视口时追加 chunkSize 行
 *
 * 锚点跳转场景调用方应主动调用 renderAll()，避免目标锚点未在已渲染区域。
 */
export function useChunkedContent(
  content: string,
  options: UseChunkedContentOptions = {},
): UseChunkedContentResult {
  const {
    initialLines = CHUNK_INITIAL_LINES,
    chunkSize = CHUNK_SIZE,
    thresholdLines = CHUNK_THRESHOLD_LINES,
  } = options

  const linesRef = useRef<string[]>(content.split('\n'))
  const totalLines = linesRef.current.length
  const shouldChunk = totalLines > thresholdLines

  const [visibleLineCount, setVisibleLineCount] = useState<number>(
    shouldChunk ? initialLines : totalLines,
  )

  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // 当前是否还有未渲染内容
  const hasMore = shouldChunk && visibleLineCount < totalLines

  // 内容或阈值变化时重置可见行数
  useEffect(() => {
    const newLines = content.split('\n')
    const newTotal = newLines.length
    const newShouldChunk = newTotal > thresholdLines
    linesRef.current = newLines
    setVisibleLineCount(newShouldChunk ? initialLines : newTotal)
  }, [content, thresholdLines, initialLines])

  // 监听哨兵元素，触发追加渲染
  useEffect(() => {
    if (!shouldChunk || !hasMore) return
    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleLineCount((prev) => {
            const total = linesRef.current.length
            const next = Math.min(prev + chunkSize, total)
            return next
          })
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [shouldChunk, hasMore, chunkSize])

  const renderAll = useCallback(() => {
    setVisibleLineCount(linesRef.current.length)
  }, [])

  const visibleContent = shouldChunk
    ? linesRef.current.slice(0, visibleLineCount).join('\n')
    : content

  return { visibleContent, sentinelRef, hasMore, renderAll }
}
