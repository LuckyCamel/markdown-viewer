import { useMemo } from 'react'
import { computeReadingStats, type ReadingStats } from '../../shared/readingStats'

/**
 * 计算并缓存文档阅读统计
 * @param content - Markdown 源码；为空或 undefined 时返回 null
 * @returns 阅读统计；无内容时返回 null
 */
export function useReadingStats(content: string | undefined): ReadingStats | null {
  return useMemo(() => {
    if (!content) return null
    return computeReadingStats(content)
  }, [content])
}
