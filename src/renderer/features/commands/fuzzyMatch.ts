/**
 * 模糊匹配工具
 *
 * 支持子字符串包含和子序列匹配，返回相关性分数。
 */

/**
 * 简单的模糊匹配
 *
 * @param query - 查询字符串
 * @param text - 目标文本
 * @returns 匹配分数（越高越匹配），0 表示不匹配
 */
export function fuzzyMatch(query: string, text: string): number {
  if (!query) return 1
  const q = query.toLowerCase().trim()
  const t = text.toLowerCase().trim()

  if (!q) return 1

  // 完全包含得分更高
  if (t.includes(q)) {
    // 越靠前分数越高
    return 10 - (t.indexOf(q) / t.length) * 5
  }

  // 子序列匹配（仅对英文/拉丁字符效果较好）
  const isAscii = /^[a-z0-9 ]+$/i.test(q)
  if (isAscii) {
    let qi = 0
    let score = 0
    for (let i = 0; i < t.length && qi < q.length; i++) {
      if (t[i] === q[qi]) {
        score += 1
        qi++
      }
    }
    return qi === q.length ? score / t.length : 0
  }

  return 0
}
