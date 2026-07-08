import { headingToId } from '../../../shared/headingId'

interface HastNode {
  type: string
  tagName?: string
  value?: string
  properties?: Record<string, unknown>
  children?: HastNode[]
}

/**
 * 从 HAST 节点提取纯文本
 */
function textContent(node: HastNode): string {
  if (node.type === 'text') return node.value ?? ''
  if (node.children) {
    return node.children.map(textContent).join('')
  }
  return ''
}

/**
 * 为 h1-h6 注入与 Outline 一致的 id 属性
 */
export function rehypeHeadingIds() {
  return (tree: HastNode) => {
    const walk = (node: HastNode) => {
      if (node.type === 'element' && node.tagName && /^h[1-6]$/.test(node.tagName)) {
        const id = headingToId(textContent(node))
        if (id) {
          node.properties = { ...node.properties, id }
        }
      }
      if (node.children) {
        for (const child of node.children) {
          if (child.type === 'element') walk(child)
        }
      }
    }
    walk(tree)
  }
}
