import { describe, it, expect } from 'vitest'

describe('searchInFile', () => {
  async function getSearch() {
    const { searchInFile } = await import('./search')
    return searchInFile
  }

  it('should find matches in file content', async () => {
    const searchInFile = await getSearch()
    const results = await searchInFile('/fake/path.md', 'test', '# Hello\ntest match\nline')
    expect(results).toHaveLength(1)
    expect(results[0].line).toBe(2)
    expect(results[0].match).toBe('test')
  })

  it('should return empty array when no match', async () => {
    const searchInFile = await getSearch()
    const results = await searchInFile('/fake/path.md', 'xyz', '# Hello\nWorld')
    expect(results).toHaveLength(0)
  })

  it('should be case insensitive', async () => {
    const searchInFile = await getSearch()
    const results = await searchInFile('/fake/path.md', 'hello', '# Hello\nWorld')
    expect(results).toHaveLength(1)
  })

  it('should provide line context', async () => {
    const searchInFile = await getSearch()
    const results = await searchInFile(
      '/fake/path.md',
      'match',
      'prefix ' + 'x'.repeat(30) + ' match ' + 'y'.repeat(30) + ' suffix',
    )
    expect(results).toHaveLength(1)
    expect(results[0].lineContent.length).toBeLessThan(60)
  })
})
