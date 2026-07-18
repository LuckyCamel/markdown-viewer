import type { ReadingStats } from '../../shared/readingStats'
import type { SaveStatus } from '../features/markdown-viewer/useEditorDocument'

interface StatusBarProps {
  stats: ReadingStats | null
  saveStatus?: SaveStatus
  viewMode?: 'read' | 'edit'
}

function getSaveStatusText(status: SaveStatus): string {
  switch (status) {
    case 'saved':
      return '已保存'
    case 'saving':
      return '保存中...'
    case 'dirty':
      return '未保存'
    case 'error':
      return '保存失败'
    case 'conflict':
      return '存在冲突'
    default:
      return ''
  }
}

function getViewModeText(mode: 'read' | 'edit'): string {
  switch (mode) {
    case 'read':
      return '阅读'
    case 'edit':
      return '编辑'
    default:
      return ''
  }
}

/**
 * 底部状态栏，显示阅读统计信息、保存状态和视图模式
 */
export function StatusBar({ stats, saveStatus, viewMode }: StatusBarProps) {
  return (
    <div className="flex items-center justify-between px-3 py-1 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center gap-4">
        {stats && (
          <>
            <span>约 {stats.words} 字</span>
            <span>·</span>
            <span>{stats.readTimeMin} 分钟阅读</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-4">
        {saveStatus && (
          <>
            <span
              className={
                saveStatus === 'dirty'
                  ? 'text-amber-600 dark:text-amber-400'
                  : saveStatus === 'error' || saveStatus === 'conflict'
                    ? 'text-red-600 dark:text-red-400'
                    : ''
              }
            >
              {getSaveStatusText(saveStatus)}
            </span>
            <span>·</span>
          </>
        )}
        {viewMode && <span>{getViewModeText(viewMode)}</span>}
      </div>
    </div>
  )
}
