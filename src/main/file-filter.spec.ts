import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('file-filter', () => {
  let tmpDir: string

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'mdfilter-'))
    writeFileSync(join(tmpDir, 'readme.md'), '# Hello')
    writeFileSync(join(tmpDir, 'script.js'), 'console.log(1)')
    writeFileSync(join(tmpDir, 'data.json'), '{}')
    writeFileSync(join(tmpDir, 'LICENSE'), 'MIT')
    writeFileSync(join(tmpDir, 'icon.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]))
    writeFileSync(join(tmpDir, 'binaryfile'), Buffer.from([0x00, 0x01, 0x02]))
    writeFileSync(join(tmpDir, '.hidden.md'), '# hidden')
    mkdirSync(join(tmpDir, 'docs'))
    writeFileSync(join(tmpDir, 'docs', 'guide.md'), '# Guide')
    mkdirSync(join(tmpDir, 'empty'))
  })

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('should filter by extensions', async () => {
    const { getFilteredEntries } = await import('./file-filter')
    const entries = await getFilteredEntries(tmpDir, [], ['.md', '.markdown'])
    const names = entries.map((e) => e.name)
    expect(names).toContain('readme.md')
    expect(names).toContain('.hidden.md')
    expect(names).toContain('docs')
    expect(names).toContain('empty')
    expect(names).not.toContain('script.js')
    expect(names).not.toContain('data.json')
  })

  it('should include no-extension text files when empty string in extensions', async () => {
    const { getFilteredEntries } = await import('./file-filter')
    const entries = await getFilteredEntries(tmpDir, [], ['', '.md'])
    const names = entries.map((e) => e.name)
    expect(names).toContain('LICENSE')
  })

  it('should exclude no-extension binary files', async () => {
    const { getFilteredEntries } = await import('./file-filter')
    const entries = await getFilteredEntries(tmpDir, [], [''])
    const names = entries.map((e) => e.name)
    expect(names).not.toContain('binaryfile')
  })

  it('should respect ignoreList', async () => {
    const { getFilteredEntries } = await import('./file-filter')
    const entries = await getFilteredEntries(tmpDir, ['.hidden.md'], ['.md'])
    const names = entries.map((e) => e.name)
    expect(names).not.toContain('.hidden.md')
    expect(names).toContain('readme.md')
  })

  it('should cache results', async () => {
    const { getFilteredEntries, invalidateAll } = await import('./file-filter')
    await getFilteredEntries(tmpDir, [], ['.md'])
    await getFilteredEntries(tmpDir, [], ['.md']) // second call should hit cache
    invalidateAll()
    const entries = await getFilteredEntries(tmpDir, [], ['.md'])
    expect(entries.length).toBeGreaterThan(0)
  })
})
