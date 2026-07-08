import { useEffect, useState } from 'react'
import {
  DEFAULT_SHORTCUTS,
  formatShortcut,
  loadShortcuts,
  saveShortcuts,
  checkShortcutConflict,
  type ShortcutAction,
  type ShortcutConfig,
} from '../../lib/shortcuts'
import { logError } from '../../logger'

interface ShortcutEditorProps {
  onSaved?: () => void
}

/**
 * 快捷键编辑器组件
 *
 * 支持：
 * - 点击按键区域录制新快捷键
 * - 冲突检测
 * - 恢复默认值
 */
export function ShortcutEditor({ onSaved }: ShortcutEditorProps) {
  const [shortcuts, setShortcuts] =
    useState<Record<ShortcutAction, ShortcutConfig>>(DEFAULT_SHORTCUTS)
  const [recordingId, setRecordingId] = useState<string | null>(null)
  const [conflict, setConflict] = useState<string | null>(null)

  useEffect(() => {
    loadShortcuts()
      .then((s) => setShortcuts(s))
      .catch((err) => logError('ShortcutEditor:loadShortcuts', err))
  }, [])

  const handleStartRecord = (id: string) => {
    setRecordingId(id)
    setConflict(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent, action: ShortcutAction) => {
    if (recordingId !== action) return
    e.preventDefault()
    e.stopPropagation()

    const key = e.key
    if (key === 'Escape') {
      setRecordingId(null)
      return
    }

    if (key === 'Control' || key === 'Shift' || key === 'Alt' || key === 'Meta') {
      return
    }

    const newConfig: ShortcutConfig = {
      ...shortcuts[action],
      key: key.length === 1 ? key.toLowerCase() : key,
      ctrl: e.ctrlKey || e.metaKey,
      shift: e.shiftKey,
      alt: e.altKey,
    }

    const allShortcuts = Object.values(shortcuts)
    const conflicting = allShortcuts.find((s) => checkShortcutConflict(s, newConfig))
    if (conflicting) {
      setConflict(`与「${conflicting.label}」冲突`)
      setRecordingId(null)
      return
    }

    const next = { ...shortcuts, [action]: newConfig }
    setShortcuts(next)
    saveShortcuts(next).catch((err) => logError('ShortcutEditor:saveShortcuts', err))
    setRecordingId(null)
    setConflict(null)
    onSaved?.()
  }

  const handleReset = () => {
    setShortcuts({ ...DEFAULT_SHORTCUTS })
    saveShortcuts(DEFAULT_SHORTCUTS).catch((err) => logError('ShortcutEditor:resetShortcuts', err))
    onSaved?.()
  }

  const actionList = Object.entries(shortcuts) as [ShortcutAction, ShortcutConfig][]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Keyboard Shortcuts</h3>
        <button
          onClick={handleReset}
          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Reset to defaults
        </button>
      </div>

      {conflict && (
        <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">{conflict}</div>
      )}

      <div className="space-y-2">
        {actionList.map(([action, config]) => (
          <div key={action} className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-700 dark:text-gray-300">{config.label}</span>
            <button
              onClick={() => handleStartRecord(action)}
              onKeyDown={(e) => handleKeyDown(e, action)}
              className={`px-3 py-1 text-sm font-mono rounded border min-w-28 text-center transition-colors ${
                recordingId === action
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              {recordingId === action ? 'Press key...' : formatShortcut(config)}
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500">点击按键后按下新的快捷键组合。按 Esc 取消录制。</p>
    </div>
  )
}
