import { useEffect, useRef } from 'react'
import hljs from 'highlight.js'

interface SourceViewerProps {
  content: string
  filePath?: string
}

/**
 * 源码查看器：展示原始 Markdown 文本并高亮
 */
export function SourceViewer({ content }: SourceViewerProps) {
  const codeRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (codeRef.current) {
      hljs.highlightElement(codeRef.current)
    }
  }, [content])

  return (
    <div className="h-full overflow-auto p-4 source-viewer">
      <pre className="text-sm leading-relaxed">
        <code ref={codeRef} className="language-markdown">
          {content}
        </code>
      </pre>
    </div>
  )
}
