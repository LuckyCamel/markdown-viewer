import { useEffect, useMemo, useRef, useState } from 'react'
import { commandRegistry, type Command } from '../features/commands/commands'
import { fuzzyMatch } from '../features/commands/fuzzyMatch'
import { useCommandStore } from '../stores/useCommandStore'
import { t } from '../../shared/i18n'

/**
 * 命令面板 UI
 *
 * - 居中模态弹窗，包含搜索输入框和命令列表
 * - 使用 fuzzyMatch 对命令 name/alias 进行模糊匹配，按得分降序排序
 * - 上下方向键选择项、Enter 执行、Escape 关闭
 */
export function CommandPalette() {
  const open = useCommandStore((s) => s.open)
  const hide = useCommandStore((s) => s.hide)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  /**
   * 已注册命令的快照（过滤不可用命令）
   */
  const commands: Command[] = useMemo(() => {
    if (!open) return []
    return commandRegistry.getAll().filter((cmd) => !cmd.isAvailable || cmd.isAvailable())
  }, [open])

  /**
   * 根据 query 模糊匹配并排序
   */
  const matches = useMemo(() => {
    const scored = commands
      .map((cmd) => {
        const nameScore = fuzzyMatch(query, cmd.name)
        const aliasScore = cmd.alias ? fuzzyMatch(query, cmd.alias) : 0
        const score = Math.max(nameScore, aliasScore)
        return { cmd, score }
      })
      .filter((m) => m.score > 0)
    scored.sort((a, b) => b.score - a.score)
    return scored.map((m) => m.cmd)
  }, [commands, query])

  // 打开时聚焦输入框并重置状态
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      // 等待 DOM 渲染
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [open])

  // 搜索结果变化时重置选中项
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  /**
   * 执行当前选中的命令并关闭面板
   */
  const executeCommand = async (cmd: Command) => {
    hide()
    try {
      await cmd.execute()
    } catch {
      // 静默忽略命令执行错误
    }
  }

  /**
   * 处理键盘事件：上下方向键、Enter、Escape
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      hide()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((idx) => Math.min(matches.length - 1, idx + 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((idx) => Math.max(0, idx - 1))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const cmd = matches[selectedIndex]
      if (cmd) {
        void executeCommand(cmd)
      }
    }
  }

  // 选中项变化时滚动到可视区域
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const item = list.querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`)
    if (item && typeof item.scrollIntoView === 'function') {
      item.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onMouseDown={(e) => {
        // 点击遮罩关闭
        if (e.target === e.currentTarget) hide()
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-label={t('commandPalette.openDialog')}
        className="relative bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-[480px] max-h-[60vh] border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        <div className="border-b border-gray-200 dark:border-gray-700">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('commandPalette.placeholder')}
            className="w-full px-4 py-3 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none"
          />
        </div>
        <div ref={listRef} role="listbox" className="flex-1 overflow-y-auto py-1">
          {matches.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
              {t('commandPalette.noResults')}
            </div>
          ) : (
            matches.map((cmd, idx) => {
              const isActive = idx === selectedIndex
              return (
                <button
                  key={cmd.id}
                  data-index={idx}
                  role="option"
                  aria-selected={isActive}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => void executeCommand(cmd)}
                  className={`w-full text-left px-4 py-2 flex items-center gap-3 text-sm ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <span className="flex-1 truncate">{cmd.name}</span>
                  <span className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    {cmd.category}
                  </span>
                </button>
              )
            })
          )}
        </div>
        {matches.length > 0 && (
          <div className="px-3 py-1.5 border-t border-gray-200 dark:border-gray-700 text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-3">
            <span>↑↓ {t('search.next')}</span>
            <span>↵ {t('search.search')}</span>
            <span>Esc {t('search.close')}</span>
          </div>
        )}
      </div>
    </div>
  )
}
