export interface ReadingStats {
  chars: number
  charsNoSpaces: number
  words: number
  readTimeMin: number
}

/**
 * 计算文档阅读统计
 * @param content - Markdown 源码
 * @param readingSpeed - 阅读速度（字/分钟），默认 300
 * @returns 字符数、字数、预计阅读时间
 */
export function computeReadingStats(content: string, readingSpeed = 300): ReadingStats {
  const chars = content.length
  const charsNoSpaces = content.replace(/\s/g, '').length

  // 中文字符数：每个汉字计为 1 词
  const chineseMatches = content.match(/[\u4e00-\u9fa5]/g)
  const chineseWords = chineseMatches ? chineseMatches.length : 0

  // 英文单词数：连续的字母或数字计为 1 词
  const englishMatches = content.match(/[a-zA-Z0-9]+/g)
  const englishWords = englishMatches ? englishMatches.length : 0

  const words = chineseWords + englishWords
  const readTimeMin = Math.max(1, Math.ceil(words / readingSpeed))

  return { chars, charsNoSpaces, words, readTimeMin }
}
