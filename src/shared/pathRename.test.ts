import { describe, it, expect } from 'vitest'
import { renamePathInRecord, renamePathInArray } from './pathRename'

describe('pathRename', () => {
  describe('renamePathInRecord', () => {
    it('应将旧路径的记录迁移到新路径', () => {
      const record = {
        '/old/path/file.md': { position: 100 },
        '/other/file.md': { position: 200 },
      }
      const result = renamePathInRecord(record, '/old/path/file.md', '/new/path/file.md')
      expect(result['/new/path/file.md']).toEqual({ position: 100 })
      expect(result['/old/path/file.md']).toBeUndefined()
      expect(result['/other/file.md']).toEqual({ position: 200 })
    })

    it('旧路径不存在时返回原记录不变', () => {
      const record = {
        '/file.md': { position: 100 },
      }
      const result = renamePathInRecord(record, '/not-exist.md', '/new.md')
      expect(result).toEqual(record)
    })

    it('空记录应返回空记录', () => {
      const result = renamePathInRecord({}, '/old.md', '/new.md')
      expect(result).toEqual({})
    })

    it('不应修改原记录对象', () => {
      const original = {
        '/old.md': { data: 'test' },
      }
      const result = renamePathInRecord(original, '/old.md', '/new.md')
      expect(original['/old.md']).toBeDefined()
      expect(result['/new.md']).toBeDefined()
    })
  })

  describe('renamePathInArray', () => {
    it('应将数组中的旧路径替换为新路径', () => {
      const arr = ['/a.md', '/b.md', '/c.md']
      const result = renamePathInArray(arr, '/b.md', '/new-b.md')
      expect(result).toEqual(['/a.md', '/new-b.md', '/c.md'])
    })

    it('旧路径不存在时返回原数组', () => {
      const arr = ['/a.md', '/b.md']
      const result = renamePathInArray(arr, '/not-exist.md', '/new.md')
      expect(result).toEqual(arr)
    })

    it('空数组应返回空数组', () => {
      const result = renamePathInArray([], '/old.md', '/new.md')
      expect(result).toEqual([])
    })

    it('不应修改原数组', () => {
      const original = ['/old.md', '/other.md']
      const result = renamePathInArray(original, '/old.md', '/new.md')
      expect(original).toEqual(['/old.md', '/other.md'])
      expect(result).toEqual(['/new.md', '/other.md'])
    })
  })
})
