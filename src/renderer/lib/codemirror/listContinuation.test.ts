import { describe, it, expect } from 'vitest'
import { parseListLine } from './listContinuation'

describe('listContinuation', () => {
  describe('parseListLine', () => {
    it('should parse unordered list with dash', () => {
      const result = parseListLine('- item')
      expect(result).toEqual({ indent: '', prefix: '- ' })
    })

    it('should parse unordered list with asterisk', () => {
      const result = parseListLine('* item')
      expect(result).toEqual({ indent: '', prefix: '* ' })
    })

    it('should parse unordered list with indentation', () => {
      const result = parseListLine('  - item')
      expect(result).toEqual({ indent: '  ', prefix: '- ' })
    })

    it('should parse ordered list and increment', () => {
      const result = parseListLine('1. item')
      expect(result).toEqual({ indent: '', prefix: '2. ' })
    })

    it('should parse ordered list with indentation', () => {
      const result = parseListLine('  3. item')
      expect(result).toEqual({ indent: '  ', prefix: '4. ' })
    })

    it('should parse unchecked task list', () => {
      const result = parseListLine('- [ ] task')
      expect(result).toEqual({ indent: '', prefix: '- [ ] ' })
    })

    it('should parse checked task list', () => {
      const result = parseListLine('- [x] done')
      expect(result).toEqual({ indent: '', prefix: '- [ ] ' })
    })

    it('should return null for non-list lines', () => {
      const result = parseListLine('regular text')
      expect(result).toBeNull()
    })

    it('should return null for empty lines', () => {
      const result = parseListLine('')
      expect(result).toBeNull()
    })
  })
})
