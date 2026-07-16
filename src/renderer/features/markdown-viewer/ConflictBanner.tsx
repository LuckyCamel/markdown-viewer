interface ConflictBannerProps {
  onLoadDisk: () => void
  onKeepMine: () => void
  onLater: () => void
}

export function ConflictBanner({ onLoadDisk, onKeepMine, onLater }: ConflictBannerProps) {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-3">
      <svg
        className="w-5 h-5 text-amber-600 flex-shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-800 truncate">文件已被外部修改</p>
        <p className="text-xs text-amber-600">选择加载磁盘版本或保留当前修改</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onLoadDisk}
          className="px-3 py-1 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded transition-colors"
        >
          加载磁盘
        </button>
        <button
          onClick={onKeepMine}
          className="px-3 py-1 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded transition-colors"
        >
          保留我的
        </button>
        <button
          onClick={onLater}
          className="px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 rounded transition-colors"
        >
          稍后处理
        </button>
      </div>
    </div>
  )
}
