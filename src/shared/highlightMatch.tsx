import React from 'react'

/**
 * 高亮字符串中的匹配片段
 * 大小写不敏感地查找 query 在 text 中的所有出现位置，
 * 将匹配部分用 <mark> 标签包裹，非匹配部分保留为纯文本。
 * @param text - 原始文本
 * @param query - 查询字符串（大小写不敏感）
 * @returns React 节点数组（含 <mark> 标签）
 */
export function highlightMatchSegments(text: string, query: string): React.ReactNode[] {
  // query 为空或 text 为空：直接返回原始文本
  if (!query || !text) {
    return [text]
  }

  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const segments: React.ReactNode[] = []
  let lastIndex = 0
  let currentIndex = lowerText.indexOf(lowerQuery, lastIndex)
  let markKey = 0

  // 遍历所有匹配位置，分割文本并插入 <mark> 高亮
  while (currentIndex !== -1) {
    // 添加匹配前的纯文本片段（前缀）
    if (currentIndex > lastIndex) {
      segments.push(text.slice(lastIndex, currentIndex))
    }
    // 添加匹配的高亮片段（保留原始大小写）
    const matchedText = text.slice(currentIndex, currentIndex + query.length)
    segments.push(
      <mark key={markKey++} className="bg-yellow-200 dark:bg-yellow-600 dark:text-white">
        {matchedText}
      </mark>,
    )
    lastIndex = currentIndex + query.length
    currentIndex = lowerText.indexOf(lowerQuery, lastIndex)
  }

  // 添加最后一段纯文本（后缀）
  if (lastIndex < text.length) {
    segments.push(text.slice(lastIndex))
  }

  // 无任何匹配时返回原始文本
  if (segments.length === 0) {
    return [text]
  }

  return segments
}
