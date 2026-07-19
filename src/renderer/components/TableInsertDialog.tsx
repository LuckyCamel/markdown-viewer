import { useCallback, useEffect, useRef, useState } from 'react'

interface TableInsertDialogProps {
  /** 是否显示弹窗 */
  open: boolean
  /** 关闭弹窗回调 */
  onClose: () => void
  /**
   * 确认插入回调
   * @param rows - 数据行数（不含表头）
   * @param cols - 列数
   */
  onConfirm: (rows: number, cols: number) => void
}

const MIN_ROWS = 1
const MIN_COLS = 2
const MAX_SIZE = 10
const DEFAULT_SIZE = 3

/**
 * 表格插入弹窗
 *
 * 允许用户选择行数与列数，按 Enter 确认、Escape 取消。
 * 输入框限制为 2–10，默认 3×3。
 */
export function TableInsertDialog({ open, onClose, onConfirm }: TableInsertDialogProps) {
  const [rows, setRows] = useState(DEFAULT_SIZE)
  const [cols, setCols] = useState(DEFAULT_SIZE)
  const rowsRef = useRef<HTMLInputElement>(null)

  /**
   * 将行数/列数限制在各自有效范围内
   */
  const clampRows = useCallback((value: number): number => {
    if (Number.isNaN(value)) return DEFAULT_SIZE
    return Math.min(MAX_SIZE, Math.max(MIN_ROWS, value))
  }, [])

  const clampCols = useCallback((value: number): number => {
    if (Number.isNaN(value)) return DEFAULT_SIZE
    return Math.min(MAX_SIZE, Math.max(MIN_COLS, value))
  }, [])

  /**
   * 打开时重置为默认值并聚焦行数输入框
   */
  useEffect(() => {
    if (!open) return
    setRows(DEFAULT_SIZE)
    setCols(DEFAULT_SIZE)
    const id = requestAnimationFrame(() => {
      rowsRef.current?.focus()
      rowsRef.current?.select()
    })
    return () => cancelAnimationFrame(id)
  }, [open])

  /**
   * 全局监听 Escape 关闭弹窗
   */
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  /**
   * 处理输入框变化，确保值在有效范围内
   */
  const handleRowsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10)
      setRows(clampRows(value))
    },
    [clampRows],
  )

  const handleColsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10)
      setCols(clampCols(value))
    },
    [clampCols],
  )

  /**
   * 处理输入框失焦，确保显示值被规范化
   */
  const handleRowsBlur = useCallback(() => {
    setRows((v) => clampRows(v))
  }, [clampRows])

  const handleColsBlur = useCallback(() => {
    setCols((v) => clampCols(v))
  }, [clampCols])

  /**
   * 确认插入表格
   */
  const handleConfirm = useCallback(() => {
    onConfirm(clampRows(rows), clampCols(cols))
  }, [clampRows, clampCols, rows, cols, onConfirm])

  /**
   * 表单提交时阻止默认行为并确认
   */
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      handleConfirm()
    },
    [handleConfirm],
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        role="presentation"
      />
      <div
        role="dialog"
        aria-label="插入表格"
        className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-80 p-6 border border-gray-200 dark:border-gray-700"
      >
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">插入表格</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="table-rows"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                行数
              </label>
              <input
                ref={rowsRef}
                id="table-rows"
                type="number"
                min={MIN_ROWS}
                max={MAX_SIZE}
                value={rows}
                onChange={handleRowsChange}
                onBlur={handleRowsBlur}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="table-cols"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                列数
              </label>
              <input
                id="table-cols"
                type="number"
                min={MIN_COLS}
                max={MAX_SIZE}
                value={cols}
                onChange={handleColsChange}
                onBlur={handleColsBlur}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              确认
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
