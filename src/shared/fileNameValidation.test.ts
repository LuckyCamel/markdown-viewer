import { describe, it, expect } from 'vitest'
import { validateFileName, FileNameValidationError } from './fileNameValidation'

describe('fileNameValidation', () => {
  describe('validateFileName', () => {
    it('合法文件名应通过验证', () => {
      expect(validateFileName('README.md')).toBe(true)
      expect(validateFileName('my-file.txt')).toBe(true)
      expect(validateFileName('notes 2024.md')).toBe(true)
      expect(validateFileName('.gitignore')).toBe(true)
      expect(validateFileName('file.with.dots.md')).toBe(true)
      expect(validateFileName('123')).toBe(true)
    })

    it('空字符串应返回空名称错误', () => {
      const result = validateFileName('')
      expect(result).toBe(FileNameValidationError.EMPTY)
    })

    it('仅空格应返回空名称错误', () => {
      const result = validateFileName('   ')
      expect(result).toBe(FileNameValidationError.EMPTY)
    })

    it('包含正斜杠应返回非法字符错误', () => {
      const result = validateFileName('path/to/file.md')
      expect(result).toBe(FileNameValidationError.INVALID_CHARACTER)
    })

    it('包含反斜杠应返回非法字符错误', () => {
      const result = validateFileName('path\\to\\file.md')
      expect(result).toBe(FileNameValidationError.INVALID_CHARACTER)
    })

    it('包含冒号应返回非法字符错误', () => {
      const result = validateFileName('file:name.md')
      expect(result).toBe(FileNameValidationError.INVALID_CHARACTER)
    })

    it('包含星号应返回非法字符错误', () => {
      const result = validateFileName('file*.md')
      expect(result).toBe(FileNameValidationError.INVALID_CHARACTER)
    })

    it('包含问号应返回非法字符错误', () => {
      const result = validateFileName('file?.md')
      expect(result).toBe(FileNameValidationError.INVALID_CHARACTER)
    })

    it('包含双引号应返回非法字符错误', () => {
      const result = validateFileName('file"name.md"')
      expect(result).toBe(FileNameValidationError.INVALID_CHARACTER)
    })

    it('包含尖括号应返回非法字符错误', () => {
      expect(validateFileName('file<name>.md')).toBe(FileNameValidationError.INVALID_CHARACTER)
      expect(validateFileName('file>name.md')).toBe(FileNameValidationError.INVALID_CHARACTER)
    })

    it('包含竖线应返回非法字符错误', () => {
      const result = validateFileName('file|name.md')
      expect(result).toBe(FileNameValidationError.INVALID_CHARACTER)
    })

    it('包含制表符应返回非法字符错误', () => {
      const result = validateFileName('file\tname.md')
      expect(result).toBe(FileNameValidationError.INVALID_CHARACTER)
    })

    it('包含换行符应返回非法字符错误', () => {
      const result = validateFileName('file\nname.md')
      expect(result).toBe(FileNameValidationError.INVALID_CHARACTER)
    })

    it('仅点号应返回非法名称错误', () => {
      expect(validateFileName('.')).toBe(FileNameValidationError.INVALID_NAME)
      expect(validateFileName('..')).toBe(FileNameValidationError.INVALID_NAME)
    })

    it('首尾空格应被修剪后验证', () => {
      expect(validateFileName('  README.md  ')).toBe(true)
      expect(validateFileName('  ')).toBe(FileNameValidationError.EMPTY)
    })
  })
})
