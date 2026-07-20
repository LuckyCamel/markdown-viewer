import { describe, it, expect } from 'vitest'
import { getFileKind, allowsEdit, allowsPreview, isTextFile } from './fileTypes'

describe('getFileKind', () => {
  it('returns markdown for Markdown files', () => {
    expect(getFileKind('README.md')).toBe('markdown')
    expect(getFileKind('docs/guide.markdown')).toBe('markdown')
    expect(getFileKind('article.mkd')).toBe('markdown')
    expect(getFileKind('README')).toBe('markdown')
  })

  it('returns code for code files', () => {
    expect(getFileKind('src/main.ts')).toBe('code')
    expect(getFileKind('app.jsx')).toBe('code')
    expect(getFileKind('script.py')).toBe('code')
    expect(getFileKind('styles.css')).toBe('code')
    expect(getFileKind('config.json')).toBe('code')
    expect(getFileKind('Dockerfile')).toBe('code')
    expect(getFileKind('Makefile')).toBe('code')
  })

  it('returns text for plain text files', () => {
    expect(getFileKind('notes.txt')).toBe('text')
  })

  it('returns binary for unknown files', () => {
    expect(getFileKind('image.png')).toBe('binary')
    expect(getFileKind('archive.zip')).toBe('binary')
    expect(getFileKind('data.bin')).toBe('binary')
  })
})

describe('allowsEdit', () => {
  it('returns true for Markdown files', () => {
    expect(allowsEdit('README.md')).toBe(true)
    expect(allowsEdit('docs/guide.markdown')).toBe(true)
  })

  it('returns false for non-Markdown files', () => {
    expect(allowsEdit('src/main.ts')).toBe(false)
    expect(allowsEdit('app.js')).toBe(false)
    expect(allowsEdit('notes.txt')).toBe(false)
    expect(allowsEdit('image.png')).toBe(false)
  })
})

describe('allowsPreview', () => {
  it('returns true for Markdown files', () => {
    expect(allowsPreview('README.md')).toBe(true)
    expect(allowsPreview('docs/guide.markdown')).toBe(true)
  })

  it('returns false for non-Markdown files', () => {
    expect(allowsPreview('src/main.ts')).toBe(false)
    expect(allowsPreview('app.js')).toBe(false)
    expect(allowsPreview('notes.txt')).toBe(false)
    expect(allowsPreview('image.png')).toBe(false)
  })
})

describe('isTextFile', () => {
  it('returns true for Markdown files', () => {
    expect(isTextFile('README.md')).toBe(true)
    expect(isTextFile('guide.markdown')).toBe(true)
  })

  it('returns true for code files', () => {
    expect(isTextFile('src/main.ts')).toBe(true)
    expect(isTextFile('script.py')).toBe(true)
    expect(isTextFile('Dockerfile')).toBe(true)
  })

  it('returns false for binary files', () => {
    expect(isTextFile('image.png')).toBe(false)
    expect(isTextFile('archive.zip')).toBe(false)
  })
})
