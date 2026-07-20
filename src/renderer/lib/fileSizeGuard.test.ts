import { describe, it, expect } from 'vitest'
import {
  checkFileSize,
  DEFAULT_MAX_TEXT_FILE_SIZE,
  DEFAULT_MAX_MARKDOWN_SIZE,
} from './fileSizeGuard'
import type { FileKind } from '../../shared/fileTypes'

describe('fileSizeGuard', () => {
  describe('默认阈值', () => {
    it('文本文件默认阈值为 2MB', () => {
      expect(DEFAULT_MAX_TEXT_FILE_SIZE).toBe(2 * 1024 * 1024)
    })
    it('Markdown 文件默认阈值为 5MB', () => {
      expect(DEFAULT_MAX_MARKDOWN_SIZE).toBe(5 * 1024 * 1024)
    })
  })

  describe('checkFileSize - Markdown', () => {
    const kind: FileKind = 'markdown'

    it('小于阈值应允许打开', () => {
      const result = checkFileSize('/a.md', 1024, kind)
      expect(result.allowed).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('等于阈值应允许打开（边界）', () => {
      const result = checkFileSize('/a.md', DEFAULT_MAX_MARKDOWN_SIZE, kind)
      expect(result.allowed).toBe(true)
    })

    it('大于阈值应不允许直接打开', () => {
      const result = checkFileSize('/a.md', DEFAULT_MAX_MARKDOWN_SIZE + 1, kind)
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('too_large')
      expect(result.size).toBe(DEFAULT_MAX_MARKDOWN_SIZE + 1)
    })
  })

  describe('checkFileSize - 代码/文本', () => {
    const codeKind: FileKind = 'code'
    const textKind: FileKind = 'text'

    it('代码文件小于阈值应允许打开', () => {
      const result = checkFileSize('/a.ts', 1024, codeKind)
      expect(result.allowed).toBe(true)
    })

    it('代码文件大于阈值应不允许直接打开', () => {
      const result = checkFileSize('/a.ts', DEFAULT_MAX_TEXT_FILE_SIZE + 1, codeKind)
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('too_large')
    })

    it('纯文本文件大于阈值应不允许直接打开', () => {
      const result = checkFileSize('/a.txt', DEFAULT_MAX_TEXT_FILE_SIZE + 1, textKind)
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('too_large')
    })
  })

  describe('checkFileSize - 二进制', () => {
    const kind: FileKind = 'binary'

    it('二进制文件不论大小都拒绝读取为文本', () => {
      const result = checkFileSize('/a.exe', 100, kind)
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('binary')
      expect(result.size).toBe(100)
    })

    it('二进制文件大于文本阈值时 reason 仍为 binary', () => {
      const result = checkFileSize('/a.exe', DEFAULT_MAX_TEXT_FILE_SIZE + 1, kind)
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('binary')
    })
  })

  describe('checkFileSize - 边界值', () => {
    it('0 字节文件应允许打开', () => {
      expect(checkFileSize('/empty.md', 0, 'markdown').allowed).toBe(true)
      expect(checkFileSize('/empty.txt', 0, 'text').allowed).toBe(true)
    })

    it('自定义阈值生效', () => {
      const result = checkFileSize('/a.md', 500, 'markdown', {
        maxMarkdownSize: 100,
        maxTextFileSize: 100,
      })
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('too_large')
    })
  })
})
