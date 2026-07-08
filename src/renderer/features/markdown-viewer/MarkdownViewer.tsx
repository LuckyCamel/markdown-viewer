import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import { MermaidBlock } from './MermaidBlock'
import { rehypeHeadingIds } from './rehypeHeadingIds'
import { markdownHeadingComponents } from './markdownHeadings'
import { ipc } from '../../lib/ipc'
import { useTabStore } from '../tabs/useTabStore'
import { dirname, joinPaths } from '../../../shared/utils'

interface MarkdownViewerProps {
  content: string
  filePath?: string
}

export function MarkdownViewer({ content, filePath }: MarkdownViewerProps) {
  const components = {
    code({ className, children, ...props }: any) {
      const text = String(children)
      const isMermaid = className?.includes('language-mermaid')
      if (isMermaid) {
        return <MermaidBlock chart={text} />
      }
      if (className) {
        return (
          <code className={className} {...props}>
            {children}
          </code>
        )
      }
      return <code {...props}>{children}</code>
    },
    img({ src, alt }: { src?: string; alt?: string }) {
      if (src && !src.startsWith('http') && !src.startsWith('asset://') && filePath) {
        const resolved = joinPaths(dirname(filePath), src)
        const normalized = resolved.replace(/\\/g, '/')
        const encoded = encodeURIComponent(normalized).replace(/%2F/g, '/').replace(/%3A/g, ':')
        return <img src={`asset://localhost/${encoded}`} alt={alt || ''} />
      }
      return <img src={src} alt={alt || ''} />
    },
    a({ href, children }: { href?: string; children?: React.ReactNode }) {
      if (href?.startsWith('http')) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault()
              ipc.shell.openExternal(href)
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
                useTabStore.getState().openFile(resolved)
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
        rehypePlugins={[rehypeRaw, rehypeHeadingIds, rehypeKatex, rehypeHighlight]}
        components={{ ...markdownHeadingComponents, ...components }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
