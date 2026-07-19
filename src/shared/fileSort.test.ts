import { describe, it, expect } from 'vitest'
import { sortFileEntries } from './fileSort'
import type { FileEntry } from './types'

function makeEntry(name: string, isDir = false, modified?: number, size?: number): FileEntry {
  return {
    name,
    path: `/root/${name}`,
    isDirectory: isDir,
    isHidden: name.startsWith('.'),
    isMarkdown: !isDir && /\.(md|markdown)$/i.test(name),
    modified,
    size,
  }
}

describe('fileSort', () => {
  describe('按名称排序', () => {
    it('应按名称字母升序排列', () => {
      const entries = [makeEntry('b.md'), makeEntry('a.md'), makeEntry('c.md')]
      const result = sortFileEntries(entries, 'name', 'asc')
      expect(result.map((e) => e.name)).toEqual(['a.md', 'b.md', 'c.md'])
    })

    it('目录应始终排在文件前面', () => {
      const entries = [makeEntry('z.md'), makeEntry('a-folder', true), makeEntry('m.md')]
      const result = sortFileEntries(entries, 'name', 'asc')
      expect(result.map((e) => e.name)).toEqual(['a-folder', 'm.md', 'z.md'])
    })

    it('降序时目录仍在前，文件按名称降序', () => {
      const entries = [makeEntry('a.md'), makeEntry('z-folder', true), makeEntry('m.md')]
      const result = sortFileEntries(entries, 'name', 'desc')
      expect(result.map((e) => e.name)).toEqual(['z-folder', 'm.md', 'a.md'])
    })

    it('空列表应返回空列表', () => {
      const result = sortFileEntries([], 'name', 'asc')
      expect(result).toEqual([])
    })

    it('单元素列表应保持不变', () => {
      const entry = makeEntry('a.md')
      const result = sortFileEntries([entry], 'name', 'asc')
      expect(result).toEqual([entry])
    })
  })

  describe('按修改时间排序', () => {
    it('应按修改时间降序排列（最新在前）', () => {
      const entries = [
        makeEntry('old.md', false, 1000),
        makeEntry('new.md', false, 3000),
        makeEntry('mid.md', false, 2000),
      ]
      const result = sortFileEntries(entries, 'modified', 'desc')
      expect(result.map((e) => e.name)).toEqual(['new.md', 'mid.md', 'old.md'])
    })

    it('升序时最旧的在前', () => {
      const entries = [
        makeEntry('old.md', false, 1000),
        makeEntry('new.md', false, 3000),
        makeEntry('mid.md', false, 2000),
      ]
      const result = sortFileEntries(entries, 'modified', 'asc')
      expect(result.map((e) => e.name)).toEqual(['old.md', 'mid.md', 'new.md'])
    })

    it('缺少 modified 字段的文件应排在最后', () => {
      const entries = [
        makeEntry('no-date.md', false, undefined),
        makeEntry('new.md', false, 3000),
        makeEntry('old.md', false, 1000),
      ]
      const result = sortFileEntries(entries, 'modified', 'desc')
      expect(result.map((e) => e.name)).toEqual(['new.md', 'old.md', 'no-date.md'])
    })

    it('目录应排在文件前面', () => {
      const entries = [makeEntry('new.md', false, 9999), makeEntry('folder', true, 100)]
      const result = sortFileEntries(entries, 'modified', 'desc')
      expect(result[0].isDirectory).toBe(true)
    })
  })

  describe('按大小排序', () => {
    it('应按大小降序排列（大文件在前）', () => {
      const entries = [
        makeEntry('small.md', false, undefined, 100),
        makeEntry('large.md', false, undefined, 10000),
        makeEntry('mid.md', false, undefined, 1000),
      ]
      const result = sortFileEntries(entries, 'size', 'desc')
      expect(result.map((e) => e.name)).toEqual(['large.md', 'mid.md', 'small.md'])
    })

    it('升序时小文件在前', () => {
      const entries = [
        makeEntry('small.md', false, undefined, 100),
        makeEntry('large.md', false, undefined, 10000),
        makeEntry('mid.md', false, undefined, 1000),
      ]
      const result = sortFileEntries(entries, 'size', 'asc')
      expect(result.map((e) => e.name)).toEqual(['small.md', 'mid.md', 'large.md'])
    })

    it('缺少 size 字段的应排在最后', () => {
      const entries = [
        makeEntry('no-size.md', false, undefined, undefined),
        makeEntry('big.md', false, undefined, 5000),
        makeEntry('small.md', false, undefined, 100),
      ]
      const result = sortFileEntries(entries, 'size', 'desc')
      expect(result.map((e) => e.name)).toEqual(['big.md', 'small.md', 'no-size.md'])
    })

    it('目录应排在文件前面', () => {
      const entries = [makeEntry('huge.md', false, undefined, 999999), makeEntry('folder', true)]
      const result = sortFileEntries(entries, 'size', 'desc')
      expect(result[0].isDirectory).toBe(true)
    })
  })
})
