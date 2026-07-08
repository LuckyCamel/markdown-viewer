import { headingToId } from '../../../shared/headingId'
import { scrollToElementInContainer } from '../../../shared/scrollContainer'

interface HeadingItem {
  level: number
  text: string
  id: string
}

/**
 * 从 Markdown 源码提取标题列表
 */
function extractHeadings(markdown: string): HeadingItem[] {
  const headings: HeadingItem[] = []
  const lines = markdown.split('\n')
  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (match) {
      const level = match[1].length
      const text = match[2].replace(/[`*_~[\]]/g, '')
      headings.push({ level, text, id: headingToId(text) })
    }
  }
  return headings
}

interface OutlineProps {
  content: string
}

export function Outline({ content }: OutlineProps) {
  const headings = extractHeadings(content)

  /**
   * 点击大纲条目，滚动正文到对应标题
   */
  const handleClick = (id: string) => {
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
      {headings.map((h, i) => (
        <button
          key={`${h.id}-${i}`}
          onClick={() => handleClick(h.id)}
          className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded truncate"
          style={{ paddingLeft: `${h.level * 12 + 8}px` }}
          title={h.text}
        >
          <span className="text-gray-600 dark:text-gray-400">{h.text}</span>
        </button>
      ))}
    </nav>
  )
}
