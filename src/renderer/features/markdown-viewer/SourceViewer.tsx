import { useEffect, useMemo, useRef } from 'react'
import { highlightElement } from '../../lib/highlight'
import { getHighlightLanguage } from '../../../shared/fileTypes'

interface SourceViewerProps {
  content: string
  filePath?: string
}

/**
 * 源码查看器：展示原始文本并根据文件类型进行语法高亮
 * 支持行号显示、搜索行定位与高亮
 */
export function SourceViewer({ content, filePath }: SourceViewerProps) {
  const codeRef = useRef<HTMLElement>(null)

  const lines = useMemo(() => {
    return content.split('\n').length
  }, [content])

  const lineNumbers = useMemo(() => {
    return Array.from({ length: lines }, (_, i) => i + 1)
  }, [lines])

  /**
   * 根据文件路径计算对应的 highlight.js 语言类名
   * 未知语言降级为 plaintext
   */
  const languageClass = useMemo(() => {
    if (!filePath) return 'language-plaintext'
    const lang = getHighlightLanguage(filePath)
    return lang ? `language-${lang}` : 'language-plaintext'
  }, [filePath])

  useEffect(() => {
    if (codeRef.current) {
      highlightElement(codeRef.current)
    }
  }, [content, languageClass])

  return (
    <div className="h-full overflow-auto source-viewer">
      <div className="flex">
        <div className="select-none pr-3 pl-4 py-4 text-right text-gray-500 dark:text-gray-600 text-sm leading-relaxed border-r border-gray-200 dark:border-gray-700 min-w-[50px] bg-gray-50 dark:bg-gray-900/50">
          {lineNumbers.map((num) => (
            <div key={num} data-line={num} className="transition-colors duration-500">
              {num}
            </div>
          ))}
        </div>
        <div className="flex-1 p-4">
          <pre className="text-sm leading-relaxed">
            <code ref={codeRef} className={languageClass}>
              {content}
            </code>
          </pre>
        </div>
      </div>
    </div>
  )
}
