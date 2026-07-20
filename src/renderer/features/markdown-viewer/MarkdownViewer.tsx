import { useEffect } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
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
import { useNavigationStore } from '../../stores/useNavigationStore'
import { useChunkedContent } from './useChunkedContent'

interface MarkdownViewerProps {
  content: string
  filePath?: string
}

export function MarkdownViewer({ content, filePath }: MarkdownViewerProps) {
  const { visibleContent, sentinelRef, hasMore, renderAll } = useChunkedContent(content)

  // 锚点跳转场景：若目标锚点未在已渲染区域，一次性渲染全部
  const pendingAnchorJump = useNavigationStore((s) => s.pendingAnchorJump)
  useEffect(() => {
    if (!hasMore || !pendingAnchorJump || !filePath) return
    if (pendingAnchorJump.path !== filePath) return
    renderAll()
  }, [hasMore, pendingAnchorJump, filePath, renderAll])

  const components: Components = {
    code({ className, children, node: _node, ...props }) {
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
                  useNavigationStore.getState().setPendingAnchorJump({
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
        children={visibleContent}
      />
      {hasMore && (
        <div ref={sentinelRef} data-testid="markdown-chunk-sentinel" style={{ height: '1px' }} />
      )}
    </div>
  )
}
