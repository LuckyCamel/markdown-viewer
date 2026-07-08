interface EditorLoadErrorProps {
  message: string
  onRetry: () => void
}

/**
 * 文件加载失败时的错误态与重试按钮
 */
export function EditorLoadError({ message, onRetry }: EditorLoadErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <p className="text-base font-medium text-red-600 dark:text-red-400">无法加载文件</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md break-all">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        重试
      </button>
    </div>
  )
}
