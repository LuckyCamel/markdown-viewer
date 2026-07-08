import type { HTMLAttributes, ReactNode } from 'react'
import { headingToId } from '../../../shared/headingId'

/**
 * 从 React 子节点提取纯文本，用于生成标题 id
 */
export function plainTextFromChildren(children: ReactNode): string {
  if (typeof children === 'string') return children
  if (typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(plainTextFromChildren).join('')
  if (children && typeof children === 'object' && 'props' in children) {
    const props = (children as { props?: { children?: ReactNode } }).props
    if (props?.children !== undefined) return plainTextFromChildren(props.children)
  }
  return ''
}

/**
 * 生成带 id 的 Markdown 标题组件（h1-h6）
 */
export function createHeadingComponent(level: 1 | 2 | 3 | 4 | 5 | 6) {
  const Tag = `h${level}` as const
  return function MarkdownHeading({
    children,
    ...props
  }: HTMLAttributes<HTMLHeadingElement> & { children?: ReactNode }) {
    const id = headingToId(plainTextFromChildren(children))
    return (
      <Tag id={id || undefined} {...props}>
        {children}
      </Tag>
    )
  }
}

export const markdownHeadingComponents = {
  h1: createHeadingComponent(1),
  h2: createHeadingComponent(2),
  h3: createHeadingComponent(3),
  h4: createHeadingComponent(4),
  h5: createHeadingComponent(5),
  h6: createHeadingComponent(6),
}
