import { headingToId } from '../../../shared/headingId'
import { scrollToElementInContainer } from '../../../shared/scrollContainer'
import { extractHeadings } from '../../../shared/extractHeadings'
import { useOutlineActiveHeading } from '../../hooks/useOutlineActiveHeading'

interface HeadingItem {
  level: number
  text: string
  id: string
}

interface OutlineProps {
  content: string
}

export function Outline({ content }: OutlineProps) {
  const headings: HeadingItem[] = extractHeadings(content, headingToId)
  const headingIds = headings.map((h) => h.id)
  const { activeId, setActiveHeading } = useOutlineActiveHeading(headingIds)

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

  if (headings.length === 0) {
    return <div className="p-4 text-sm text-gray-500">No headings found</div>
  }

  return (
    <nav className="p-2">
      {headings.map((h, i) => {
        const isActive = h.id === activeId
        return (
          <button
            key={`${h.id}-${i}`}
            onClick={() => handleClick(h.id)}
            className={`block w-full text-left px-2 py-1 text-sm rounded truncate ${
              isActive
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
            style={{ paddingLeft: `${h.level * 12 + 8}px` }}
            title={h.text}
            aria-current={isActive ? 'location' : undefined}
          >
            {h.text}
          </button>
        )
      })}
    </nav>
  )
}
