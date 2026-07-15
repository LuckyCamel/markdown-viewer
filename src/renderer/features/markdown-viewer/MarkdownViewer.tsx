import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import { MermaidBlock } from './MermaidBlock'
import { rehypeHeadingIds } from './rehypeHeadingIds'
import { markdownSanitizeSchema } from './sanitizeSchema'
import { markdownHeadingComponents } from './markdownHeadings'
import { ipc } from '../../lib/ipc'
import { useTabStore } from '../tabs/useTabStore'
import { dirname, joinPaths } from '../../../shared/utils'
import { isInternalMarkdownHref, parseMarkdownHref } from '../../../shared/markdownLink'
import { scrollToAnchor } from '../../../shared/scrollContainer'
import { useUIStore } from '../../stores/useUIStore'

interface MarkdownViewerProps {
  content: string
  filePath?: string
}

export function MarkdownViewer({ content, filePath }: MarkdownViewerProps) {
  const components = {
    code({ className, children, ...props }: any) {
      const isMermaid = className?.includes('language-mermaid')
      if (isMermaid) {
        const text = Array.isArray(children)
          ? children.map((c) => (typeof c === 'string' ? c : '')).join('')
          : typeof children === 'string'
            ? children
            : ''
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
      if (!href) return <a>{children}</a>

      if (href.startsWith('http')) {
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

      if (isInternalMarkdownHref(href)) {
        return (
          <a
            href={href}
            onClick={(e) => {
              e.preventDefault()
              if (!filePath) return

              const parsed = parseMarkdownHref(href)
              if (!parsed.filePart && parsed.anchor) {
                scrollToAnchor(parsed.anchor)
                return
              }

              if (parsed.filePart) {
                const resolved = joinPaths(dirname(filePath), parsed.filePart)
                if (parsed.anchor) {
                  useUIStore.getState().setPendingAnchorJump({
                    path: resolved,
                    anchor: parsed.anchor,
                  })
                }
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
    <div
      className="prose dark:prose-invert p-6"
      style={{
        fontSize: 'var(--font-size, 14px)',
        lineHeight: 'var(--line-height, 1.6)',
        maxWidth: 'var(--content-max-width, none)',
        fontFamily: 'var(--font-family, inherit)',
        margin: '0 auto',
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          rehypeRaw,
          [rehypeSanitize, markdownSanitizeSchema],
          rehypeHeadingIds,
          rehypeKatex,
          rehypeHighlight,
        ]}
        components={{ ...markdownHeadingComponents, ...components }}
        children={content}
      />
    </div>
  )
}
