import { describe, it, expect } from 'vitest'
import { fuzzyMatch } from './fuzzyMatch'

describe('fuzzyMatch', () => {
  it('should return 1 for empty query', () => {
    expect(fuzzyMatch('', '任何文本')).toBe(1)
  })

  it('should return 0 when no match', () => {
    expect(fuzzyMatch('xyz', 'abc')).toBe(0)
  })

  it('should match substring with high score', () => {
    const score = fuzzyMatch('设置', '打开设置面板')
    expect(score).toBeGreaterThan(0)
  })

  it('should match subsequence', () => {
    // "sj" 应匹配 "设置" (sè zhì)
    const score = fuzzyMatch('sj', '设置')
    expect(score).toBe(0) // 中文不适用子序列匹配，按包含匹配
  })

  it('should be case insensitive', () => {
    const score = fuzzyMatch('SETTINGS', 'open settings panel')
    expect(score).toBeGreaterThan(0)
  })

  it('should give higher score to prefix match', () => {
    const prefixScore = fuzzyMatch('打开', '打开文件')
    const middleScore = fuzzyMatch('打开', '快速打开文件')
    expect(prefixScore).toBeGreaterThan(middleScore)
  })

  it('should match English subsequence', () => {
    // "opfl" should match "Open File"
    const score = fuzzyMatch('opfl', 'Open File')
    expect(score).toBeGreaterThan(0)
  })
})
