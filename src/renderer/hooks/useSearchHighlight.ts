import { useCallback, useEffect, useRef, useState } from 'react'
import { logError } from '../logger'

/** 最大高亮匹配数（性能保护） */
const MAX_MATCHES = 500

/** 普通匹配的样式类 */
const MATCH_CLASS = 'bg-yellow-200 dark:bg-yellow-600 rounded px-0.5'
/** 当前匹配的样式类 */
const CURRENT_CLASS = 'bg-orange-400 dark:bg-orange-500 rounded px-0.5'

export interface UseSearchHighlightResult {
  matchCount: number
  currentIndex: number
  next: () => void
  prev: () => void
  clear: () => void
}

/**
 * 清除容器内所有由本 hook 创建的 mark 元素，恢复原始文本结构
 * 仅清理带有 data-search-highlight 属性的 mark，避免影响用户自定义 mark
 */
function clearMarks(container: HTMLElement): void {
  const marks = container.querySelectorAll('mark[data-search-highlight]')
  marks.forEach((mark) => {
    const parent = mark.parentNode
    if (!parent) return
    // 将 mark 的子节点移回原位置
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark)
    }
    parent.removeChild(mark)
    // 合并相邻文本节点，恢复原始 DOM 结构
    parent.normalize()
  })
}

/**
 * 收集容器内所有包含 query 的文本节点，跳过 script/style/mark 标签
 */
function collectTextNodes(container: HTMLElement, query: string): Text[] {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentNode
      if (!parent) return NodeFilter.FILTER_REJECT
      const tag = parent.nodeName.toLowerCase()
      if (tag === 'script' || tag === 'style' || tag === 'mark') {
        return NodeFilter.FILTER_REJECT
      }
      if (!node.nodeValue || !node.nodeValue.includes(query)) {
        return NodeFilter.FILTER_REJECT
      }
      return NodeFilter.FILTER_ACCEPT
    },
  })

  const nodes: Text[] = []
  let current = walker.nextNode()
  while (current) {
    nodes.push(current as Text)
    current = walker.nextNode()
  }
  return nodes
}

/**
 * 在单个文本节点中高亮所有匹配 query 的文本片段
 * 使用 splitText 分割文本并用 <mark> 元素包裹匹配部分
 */
function highlightTextNode(textNode: Text, query: string, matches: HTMLElement[]): void {
  const text = textNode.nodeValue || ''
  let start = text.indexOf(query)
  let remaining: Text = textNode

  while (start !== -1 && matches.length < MAX_MATCHES) {
    // 分割出匹配前的部分，matched 指向从匹配开始的部分
    const matched = remaining.splitText(start)
    // 再分割出匹配后的部分，matched 现在只包含匹配文本
    const after = matched.splitText(query.length)
    const parent = matched.parentNode
    if (!parent) break

    const mark = document.createElement('mark')
    mark.setAttribute('data-search-highlight', 'true')
    mark.setAttribute('data-current', 'false')
    mark.className = MATCH_CLASS
    parent.replaceChild(mark, matched)
    mark.appendChild(matched)

    matches.push(mark)
    remaining = after
    start = (remaining.nodeValue || '').indexOf(query)
  }
}

/**
 * 更新所有 mark 元素的当前高亮状态，并滚动到当前匹配位置
 */
function updateCurrentMark(matches: HTMLElement[], currentIndex: number): void {
  matches.forEach((mark, i) => {
    if (i === currentIndex) {
      mark.setAttribute('data-current', 'true')
      mark.className = CURRENT_CLASS
    } else {
      mark.setAttribute('data-current', 'false')
      mark.className = MATCH_CLASS
    }
  })

  if (currentIndex >= 0 && currentIndex < matches.length) {
    const el = matches[currentIndex]
    // jsdom 等环境可能没有实现 scrollIntoView，调用前检查
    if (typeof el.scrollIntoView === 'function') {
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } catch (err) {
        logError('useSearchHighlight:scrollIntoView', err)
      }
    }
  }
}

/**
 * 在文档容器中高亮所有匹配搜索词的文本，并提供上一个/下一个跳转能力
 *
 * 实现思路：
 * - query 和 container 存在时，用 TreeWalker 遍历文本节点
 * - 对每个包含 query 的文本节点，用 splitText + <mark> 包裹匹配文本
 * - 维护 mark 元素数组，next/prev 切换 currentIndex 并滚动到对应 mark
 * - 限制最多高亮 500 个匹配（性能保护）
 * - 高亮在 DOM 渲染后操作，不走 rehype 管道，避免与 rehype-sanitize 冲突
 *
 * @param container - 滚动容器元素
 * @param query - 搜索关键词，为 null 时不高亮
 */
export function useSearchHighlight(
  container: HTMLElement | null,
  query: string | null,
): UseSearchHighlightResult {
  const [matchCount, setMatchCount] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(-1)
  const matchListRef = useRef<HTMLElement[]>([])
  // 用 ref 同步跟踪 currentIndex，避免 doHighlight 重新高亮时重置用户已导航的位置。
  // 场景：点击"下一个"按钮 → setCurrentIndex 触发 App 重新渲染 → MarkdownViewer 重新渲染
  // → react-markdown 重新生成 DOM → MutationObserver 触发 doHighlight →
  // 若不用 ref 保持，currentIndex 会被重置为 0，用户导航状态丢失。
  const currentIndexRef = useRef(-1)

  useEffect(() => {
    // 清理旧的高亮
    if (container) {
      clearMarks(container)
    }
    matchListRef.current = []

    if (!container || !query) {
      setMatchCount(0)
      setCurrentIndex(-1)
      currentIndexRef.current = -1
      return
    }

    let isHighlighting = false
    let needRehighlight = false
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    let flagTimer: ReturnType<typeof setTimeout> | null = null

    /**
     * 执行高亮：清除旧 mark → 遍历文本节点 → 包裹匹配文本
     * 用 isHighlighting flag 防止 MutationObserver 检测到自身 DOM 修改而递归；
     * 用 needRehighlight flag 记录高亮期间发生的 DOM 变化（如异步内容加载），
     * 在 flag 重置后重新触发高亮，避免变化被丢失。
     *
     * 注意：重新高亮时保持 currentIndexRef 当前值（用户已导航的位置），
     * 仅在索引越界或无匹配时重置。避免 DOM 重建后丢失用户导航状态。
     */
    const doHighlight = () => {
      isHighlighting = true
      needRehighlight = false
      clearMarks(container)
      matchListRef.current = []
      try {
        const textNodes = collectTextNodes(container, query)
        for (const textNode of textNodes) {
          if (matchListRef.current.length >= MAX_MATCHES) break
          highlightTextNode(textNode, query, matchListRef.current)
        }
        const count = matchListRef.current.length
        setMatchCount(count)
        // 保持当前导航位置：仅在无匹配或索引越界时重置为 0/-1
        let newIndex = currentIndexRef.current
        if (count === 0) {
          newIndex = -1
        } else if (newIndex < 0 || newIndex >= count) {
          newIndex = 0
        }
        currentIndexRef.current = newIndex
        setCurrentIndex(newIndex)
        updateCurrentMark(matchListRef.current, newIndex)
      } catch (err) {
        logError('useSearchHighlight:highlight', err)
        setMatchCount(0)
        setCurrentIndex(-1)
        currentIndexRef.current = -1
      }
      // 延迟重置 flag：MutationObserver 回调在 microtask 中先执行（flag 仍为 true，被忽略），
      // setTimeout 在 macrotask 中后执行重置 flag，并检查 needRehighlight 决定是否需要重新高亮
      flagTimer = setTimeout(() => {
        isHighlighting = false
        if (needRehighlight) {
          needRehighlight = false
          if (debounceTimer) clearTimeout(debounceTimer)
          debounceTimer = setTimeout(doHighlight, 50)
        }
      }, 0)
    }

    // MutationObserver 监听容器内容变化（如异步加载的 markdown 渲染完成），自动重新高亮
    const observer = new MutationObserver(() => {
      if (isHighlighting) {
        // 高亮期间发生 DOM 变化（如异步内容加载），标记需要重新高亮
        needRehighlight = true
        return
      }
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(doHighlight, 50)
    })

    // query 变化时重置导航位置（新搜索从第一个匹配开始）
    currentIndexRef.current = -1
    doHighlight()
    observer.observe(container, { childList: true, subtree: true, characterData: true })

    return () => {
      observer.disconnect()
      if (debounceTimer) clearTimeout(debounceTimer)
      if (flagTimer) clearTimeout(flagTimer)
      if (container) {
        clearMarks(container)
      }
      matchListRef.current = []
    }
  }, [container, query])

  /**
   * 跳转到下一个匹配，循环切换
   * 使用 currentIndexRef 避免闭包捕获过期值，且无需依赖 currentIndex 重建函数
   */
  const next = useCallback(() => {
    const matches = matchListRef.current
    if (matches.length === 0) return
    const newIndex = (currentIndexRef.current + 1) % matches.length
    currentIndexRef.current = newIndex
    updateCurrentMark(matches, newIndex)
    setCurrentIndex(newIndex)
  }, [])

  /**
   * 跳转到上一个匹配，循环切换
   * 使用 currentIndexRef 避免闭包捕获过期值
   */
  const prev = useCallback(() => {
    const matches = matchListRef.current
    if (matches.length === 0) return
    const newIndex = (currentIndexRef.current - 1 + matches.length) % matches.length
    currentIndexRef.current = newIndex
    updateCurrentMark(matches, newIndex)
    setCurrentIndex(newIndex)
  }, [])

  /**
   * 清除所有高亮并重置状态
   */
  const clear = useCallback(() => {
    if (container) {
      clearMarks(container)
    }
    matchListRef.current = []
    currentIndexRef.current = -1
    setMatchCount(0)
    setCurrentIndex(-1)
  }, [container])

  return { matchCount, currentIndex, next, prev, clear }
}
