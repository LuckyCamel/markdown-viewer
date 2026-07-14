import { describe, it, expect } from 'vitest'
import { computeReadingStats } from './readingStats'

describe('computeReadingStats', () => {
  it('空文档：chars=0, charsNoSpaces=0, words=0, readTimeMin=1（最少1分钟）', () => {
    const stats = computeReadingStats('')
    expect(stats.chars).toBe(0)
    expect(stats.charsNoSpaces).toBe(0)
    expect(stats.words).toBe(0)
    expect(stats.readTimeMin).toBe(1)
  })

  it('纯英文："hello world" → chars=11, charsNoSpaces=10, words=2, readTimeMin=1', () => {
    const stats = computeReadingStats('hello world')
    expect(stats.chars).toBe(11)
    expect(stats.charsNoSpaces).toBe(10)
    expect(stats.words).toBe(2)
    expect(stats.readTimeMin).toBe(1)
  })

  it('纯中文："你好世界" → chars=4, charsNoSpaces=4, words=4, readTimeMin=1', () => {
    const stats = computeReadingStats('你好世界')
    expect(stats.chars).toBe(4)
    expect(stats.charsNoSpaces).toBe(4)
    expect(stats.words).toBe(4)
    expect(stats.readTimeMin).toBe(1)
  })

  it('中英混合："hello 世界" → words=3（hello=1词 + 世=1 + 界=1）', () => {
    const stats = computeReadingStats('hello 世界')
    expect(stats.chars).toBe(8)
    expect(stats.charsNoSpaces).toBe(7)
    expect(stats.words).toBe(3)
    expect(stats.readTimeMin).toBe(1)
  })

  it('长文档：600字 → readTimeMin=2（300字/分钟）', () => {
    const content = '世'.repeat(600)
    const stats = computeReadingStats(content)
    expect(stats.words).toBe(600)
    expect(stats.readTimeMin).toBe(2)
  })
})
