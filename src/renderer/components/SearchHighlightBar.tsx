import { t } from '../../shared/i18n'

interface SearchHighlightBarProps {
  matchCount: number
  currentIndex: number
  onNext: () => void
  onPrev: () => void
  onClose: () => void
}

/** 按钮基础样式 */
const BUTTON_CLASS =
  'px-2 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'

/**
 * 搜索高亮工具栏：固定在文档区域顶部，显示匹配数量与当前位置，
 * 提供上一个/下一个跳转与关闭按钮
 */
export function SearchHighlightBar({
  matchCount,
  currentIndex,
  onNext,
  onPrev,
  onClose,
}: SearchHighlightBarProps) {
  const hasMatches = matchCount > 0

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      {hasMatches ? (
        <>
          <span className="text-gray-600 dark:text-gray-300">
            {t('search.matches').replace('{count}', String(matchCount))}
          </span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-600 dark:text-gray-300">
            {currentIndex + 1}/{matchCount}
          </span>
          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              aria-label={t('search.previous')}
              onClick={onPrev}
              className={BUTTON_CLASS}
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={t('search.next')}
              onClick={onNext}
              className={BUTTON_CLASS}
            >
              ↓
            </button>
          </div>
        </>
      ) : (
        <span className="text-gray-500 dark:text-gray-400">{t('search.noMatches')}</span>
      )}
      <button
        type="button"
        aria-label={t('search.close')}
        onClick={onClose}
        className={`${BUTTON_CLASS} ml-auto`}
      >
        ×
      </button>
    </div>
  )
}
