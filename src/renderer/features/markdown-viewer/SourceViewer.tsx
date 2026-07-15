import { useEffect, useMemo, useRef } from 'react'
import { highlightElement } from '../../lib/highlight'
import { getHighlightLanguage } from '../../../shared/fileTypes'

interface SourceViewerProps {
  content: string
  filePath?: string
}

/**
 * 源码查看器：展示原始文本并根据文件类型进行语法高亮
 */
export function SourceViewer({ content, filePath }: SourceViewerProps) {
  const codeRef = useRef<HTMLElement>(null)

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
    <div className="h-full overflow-auto p-4 source-viewer">
      <pre className="text-sm leading-relaxed">
        <code ref={codeRef} className={languageClass}>
          {content}
        </code>
      </pre>
    </div>
  )
}
