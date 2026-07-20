import { describe, it, expect } from 'vitest'
import { getDocumentSurface, isSurfaceKindMarkdown } from './surface'

describe('getDocumentSurface', () => {
  const loadState = { isLoading: false, hasError: false }

  describe('Markdown files', () => {
    it('returns markdown-read in read mode', () => {
      const surface = getDocumentSurface('README.md', 'read', loadState)
      expect(surface.kind).toBe('markdown-read')
      expect(surface.capabilities).toEqual({
        hasSession: true,
        hasOutline: true,
        allowsEditMode: true,
        allowsPreview: true,
      })
    })

    it('returns markdown-edit in edit mode', () => {
      const surface = getDocumentSurface('README.md', 'edit', loadState)
      expect(surface.kind).toBe('markdown-edit')
      expect(surface.capabilities).toEqual({
        hasSession: true,
        hasOutline: true,
        allowsEditMode: true,
        allowsPreview: true,
      })
    })
  })

  describe('Code files', () => {
    it('returns source with limited capabilities', () => {
      const surface = getDocumentSurface('src/main.ts', 'read', loadState)
      expect(surface.kind).toBe('source')
      expect(surface.capabilities).toEqual({
        hasSession: false,
        hasOutline: false,
        allowsEditMode: false,
        allowsPreview: false,
      })
    })

    it('returns source even in edit mode', () => {
      const surface = getDocumentSurface('src/main.ts', 'edit', loadState)
      expect(surface.kind).toBe('source')
      expect(surface.capabilities.allowsEditMode).toBe(false)
    })
  })

  describe('Text files', () => {
    it('returns source for .txt files', () => {
      const surface = getDocumentSurface('notes.txt', 'read', loadState)
      expect(surface.kind).toBe('source')
      expect(surface.capabilities.allowsEditMode).toBe(false)
    })
  })

  describe('Binary files', () => {
    it('returns source for binary files', () => {
      const surface = getDocumentSurface('image.png', 'read', loadState)
      expect(surface.kind).toBe('source')
      expect(surface.capabilities.allowsEditMode).toBe(false)
    })
  })
})

describe('isSurfaceKindMarkdown', () => {
  it('returns true for markdown-read', () => {
    expect(isSurfaceKindMarkdown('markdown-read')).toBe(true)
  })

  it('returns true for markdown-edit', () => {
    expect(isSurfaceKindMarkdown('markdown-edit')).toBe(true)
  })

  it('returns false for source', () => {
    expect(isSurfaceKindMarkdown('source')).toBe(false)
  })
})
