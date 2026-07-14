import { useState } from 'react'
import { headingToId } from '../../../shared/headingId'
import { scrollToElementInContainer } from '../../../shared/scrollContainer'
import { extractHeadings } from '../../../shared/extractHeadings'
import { filterVisibleHeadings } from '../../../shared/outlineFilter'
import { useOutlineActiveHeading } from '../../hooks/useOutlineActiveHeading'
import { useOutlineStore } from './useOutlineStore'
import { useTabStore } from '../tabs/useTabStore'
import { ContextMenu } from '../../components/ContextMenu'
import { copyPathToClipboard } from '../../lib/fileActions'

interface HeadingItem {
  level: number
  text: string
  id: string
}

interface OutlineProps {
  content: string
}

/** 无文件上下文时使用的默认折叠键 */
const DEFAULT_OUTLINE_KEY = '__default__'

/** 复制反馈显示时长（毫秒） */
const FEEDBACK_DURATION = 1500

export function Outline({ content }: OutlineProps) {
  const headings: HeadingItem[] = extractHeadings(content, headingToId)
  const headingIds = headings.map((h) => h.id)
  const { activeId, setActiveHeading } = useOutlineActiveHeading(headingIds)

  const activeFile = useTabStore((s) => s.activeFile)
  const filePath = activeFile ?? DEFAULT_OUTLINE_KEY
  const collapsedArray = useOutlineStore((s) => s.collapsed[filePath]) ?? []
  const toggleCollapse = useOutlineStore((s) => s.toggleCollapse)
  const collapseAll = useOutlineStore((s) => s.collapseAll)
  const expandAll = useOutlineStore((s) => s.expandAll)

  const [menu, setMenu] = useState<{ x: number; y: number; headingId: string } | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const collapsedSet = new Set(collapsedArray)
  const visibleHeadings = filterVisibleHeadings(headings, collapsedSet)

  // 计算每个标题是否存在子级（后续紧邻标题 level 更大即视为有子级）
  const hasChildrenSet = new Set<string>()
  for (let i = 0; i < headings.length; i++) {
    if (i + 1 < headings.length && headings[i + 1].level > headings[i].level) {
      hasChildrenSet.add(headings[i].id)
    }
  }

  /** 可折叠的标题 id 列表（仅有子级的标题） */
  const collapsibleIds = headings.filter((h) => hasChildrenSet.has(h.id)).map((h) => h.id)

  /**
   * 点击大纲条目，滚动正文到对应标题
   */
  const handleClick = (id: string) => {
    setActiveHeading(id)
    const el = document.getElementById(id)
    if (!el) return
    if (!scrollToElementInContainer(el)) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  /**
   * 复制锚点链接到剪贴板并显示反馈
   */
  const handleCopyAnchor = async (headingId: string) => {
    await copyPathToClipboard('#' + headingId)
    setFeedback('已复制锚点链接')
    setTimeout(() => setFeedback(null), FEEDBACK_DURATION)
  }

  if (headings.length === 0) {
    return <div className="p-4 text-sm text-gray-500">No headings found</div>
  }

  return (
    <nav className="p-2">
      <div className="flex items-center gap-2 mb-2 px-1">
        <button
          onClick={() => collapseAll(filePath, collapsibleIds)}
          className="text-xs px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
        >
          全部折叠
        </button>
        <button
          onClick={() => expandAll(filePath)}
          className="text-xs px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
        >
          全部展开
        </button>
        {feedback && (
          <span className="ml-auto text-xs text-green-600 dark:text-green-400">{feedback}</span>
        )}
      </div>
      {visibleHeadings.map((h, i) => {
        const isActive = h.id === activeId
        const hasChildren = hasChildrenSet.has(h.id)
        const collapsed = collapsedSet.has(h.id)
        return (
          <div
            key={`${h.id}-${i}`}
            className="flex items-center rounded"
            style={{ paddingLeft: `${h.level * 12}px` }}
          >
            {hasChildren ? (
              <button
                onClick={() => toggleCollapse(filePath, h.id)}
                aria-label={collapsed ? '展开' : '折叠'}
                className="shrink-0 w-5 h-5 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-xs"
              >
                {collapsed ? '▶' : '▼'}
              </button>
            ) : (
              <span className="shrink-0 w-5" />
            )}
            <button
              onClick={() => handleClick(h.id)}
              onContextMenu={(e) => {
                e.preventDefault()
                setMenu({ x: e.clientX, y: e.clientY, headingId: h.id })
              }}
              className={`flex-1 text-left px-2 py-1 text-sm rounded truncate ${
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
              title={h.text}
              aria-current={isActive ? 'location' : undefined}
            >
              {h.text}
            </button>
          </div>
        )
      })}
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={[{ label: '复制锚点链接', onClick: () => handleCopyAnchor(menu.headingId) }]}
          onClose={() => setMenu(null)}
        />
      )}
    </nav>
  )
}
