import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import { MermaidBlock } from './MermaidBlock'
import { dirname, joinPaths } from '../../../shared/utils'

interface MarkdownViewerProps {
  content: string
  filePath?: string
}

export function MarkdownViewer({ content, filePath }: MarkdownViewerProps) {
  const components = {
    code({ className, children, ...props }: any) {
      const text = String(children)
      const isMermaid = text.startsWith('mermaid\n')
      if (isMermaid) {
        const chart = text.replace(/^mermaid\n/, '')
        return <MermaidBlock chart={chart} />
      }
      if (className) {
        return <code className={className} {...props}>{children}</code>
      }
      return <code {...props}>{children}</code>
    },
    img({ src, alt }: { src?: string; alt?: string }) {
      if (src && !src.startsWith('http') && !src.startsWith('local-file://') && filePath) {
        const resolved = joinPaths(dirname(filePath), src)
        return <img src={`local-file://${resolved}`} alt={alt || ''} />
      }
      return <img src={src} alt={alt || ''} />
    },
    a({ href, children }: { href?: string; children: React.ReactNode }) {
      if (href?.startsWith('http')) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault()
              window.api.shell.openExternal(href)
            }}
          >
            {children}
          </a>
        )
      }
      if (href?.endsWith('.md')) {
        return (
          <a
            href={href}
            onClick={(e) => {
              e.preventDefault()
              if (filePath) {
                const resolved = joinPaths(dirname(filePath), href)
                window.api.store.set('activeFile', resolved)
              }
            }}
          >
            {children}
          </a>
        )
      }
      return <a href={href}>{children}</a>
    },
  }

  return (
    <div className="prose dark:prose-invert max-w-none p-6">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
