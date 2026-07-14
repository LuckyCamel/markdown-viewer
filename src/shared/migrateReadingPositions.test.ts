import { describe, it, expect } from 'vitest'
import { migrateReadingPositions } from './migrateReadingPositions'

describe('migrateReadingPositions', () => {
  it('旧格式 number 转为 { render, source: 0 }', () => {
    const result = migrateReadingPositions({ '/path/a': 100 })
    expect(result).toEqual({ '/path/a': { render: 100, source: 0 } })
  })

  it('新格式（对象）保持不变', () => {
    const input = { '/path/b': { render: 200, source: 50 } }
    const result = migrateReadingPositions(input)
    expect(result).toEqual({ '/path/b': { render: 200, source: 50 } })
  })

  it('混合格式：旧 number 与新对象共存时正确迁移', () => {
    const input = {
      '/path/old': 100,
      '/path/new': { render: 200, source: 50 },
    }
    const result = migrateReadingPositions(input)
    expect(result).toEqual({
      '/path/old': { render: 100, source: 0 },
      '/path/new': { render: 200, source: 50 },
    })
  })

  it('空对象 {} 返回 {}', () => {
    const result = migrateReadingPositions({})
    expect(result).toEqual({})
  })

  it('null 返回 {}', () => {
    const result = migrateReadingPositions(null)
    expect(result).toEqual({})
  })

  it('undefined 返回 {}', () => {
    const result = migrateReadingPositions(undefined)
    expect(result).toEqual({})
  })

  it('跳过非法值（字符串、数组、null 值）', () => {
    const input = {
      '/path/valid': 100,
      '/path/str': 'not a number',
      '/path/arr': [1, 2, 3],
      '/path/null': null,
    }
    const result = migrateReadingPositions(input)
    expect(result).toEqual({
      '/path/valid': { render: 100, source: 0 },
    })
  })

  it('对象缺少 source 字段时补 0', () => {
    const input = { '/path/a': { render: 100 } }
    const result = migrateReadingPositions(input)
    expect(result).toEqual({ '/path/a': { render: 100, source: 0 } })
  })

  it('对象缺少 render 字段时补 0', () => {
    const input = { '/path/a': { source: 50 } }
    const result = migrateReadingPositions(input)
    expect(result).toEqual({ '/path/a': { render: 0, source: 50 } })
  })
})
