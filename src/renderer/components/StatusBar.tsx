import type { ReadingStats } from '../../shared/readingStats'

interface StatusBarProps {
  stats: ReadingStats | null
}

/**
 * 底部状态栏，显示阅读统计信息
 */
export function StatusBar({ stats }: StatusBarProps) {
  if (!stats) return null
  return (
    <div className="flex items-center gap-4 px-3 py-1 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
      <span>约 {stats.words} 字</span>
      <span>·</span>
      <span>{stats.readTimeMin} 分钟阅读</span>
    </div>
  )
}
