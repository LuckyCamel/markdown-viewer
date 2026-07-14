import { useEffect, useReducer, useRef } from 'react'
import type { RecentEntry } from '../../../shared/types'

/** 最多展示的最近文件条目数 */
const MAX_ITEMS = 10

interface RecentFilesProps {
  files: RecentEntry[]
  onSelect: (path: string) => void
  onClose: () => void
}

/**
 * 获取文件路径对应的父目录路径，兼容 / 与 \ 分隔符
 */
function getParentDir(path: string): string {
  const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  if (lastSlash === -1) return ''
  return path.substring(0, lastSlash)
}

/**
 * 将时间戳格式化为相对时间字符串
 * - <1 分钟：刚刚
 * - <60 分钟：N 分钟前
 * - <24 小时：N 小时前
 * - 其他：N 天前
 */
function formatRelativeTime(timestamp: number, now: number): string {
  const diffMs = now - timestamp
  if (diffMs < 60_000) return '刚刚'
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 60) return `${diffMin} 分钟前`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} 小时前`
  const diffDay = Math.floor(diffHour / 24)
  return `${diffDay} 天前`
}

/**
 * 最近文件快速切换面板
 *
 * 参考 FileSearch 的面板风格，展示最近打开过的文件列表。
 * 支持键盘上下键移动选中、回车打开、Esc 关闭。
 */
export function RecentFiles({ files, onSelect, onClose }: RecentFilesProps) {
  const visible = files.slice(0, MAX_ITEMS)
  // 使用 useRef 管理选中索引，配合 forceRender 触发高亮重绘
  const selectedIndexRef = useRef(0)
  const [, forceRender] = useReducer((x: number) => x + 1, 0)

  // 通过 ref 持有最新的可见列表与回调，避免键盘监听器重复绑定
  const stateRef = useRef({ visible, onSelect, onClose })
  stateRef.current = { visible, onSelect, onClose }

  // 文件列表变化时重置选中索引到首项
  useEffect(() => {
    selectedIndexRef.current = 0
  }, [files])

  // 监听全局键盘事件：上下键导航、回车打开、Esc 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { visible, onSelect, onClose } = stateRef.current
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        selectedIndexRef.current = Math.min(selectedIndexRef.current + 1, visible.length - 1)
        forceRender()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        selectedIndexRef.current = Math.max(selectedIndexRef.current - 1, 0)
        forceRender()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const entry = visible[selectedIndexRef.current]
        if (entry) onSelect(entry.path)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const now = Date.now()

  if (visible.length === 0) {
    return <div className="p-3 text-sm text-gray-500 dark:text-gray-400">暂无最近文件</div>
  }

  return (
    <div className="p-2" role="listbox">
      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-2 py-1">
        最近文件
      </div>
      <div className="mt-1 max-h-64 overflow-y-auto">
        {visible.map((file, i) => (
          <button
            key={file.path}
            role="option"
            data-selected={i === selectedIndexRef.current}
            onClick={() => onSelect(file.path)}
            className={
              'w-full text-left px-2 py-1 rounded flex items-center gap-2 ' +
              (i === selectedIndexRef.current
                ? 'bg-blue-100 dark:bg-blue-900'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800')
            }
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{file.name}</div>
              <div className="text-xs text-gray-500 truncate">{getParentDir(file.path)}</div>
            </div>
            <span className="text-xs text-gray-400 shrink-0">
              {formatRelativeTime(file.timestamp, now)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
