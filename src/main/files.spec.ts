import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('file system operations', () => {
  let tmpDir: string

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'mdfiles-'))
    writeFileSync(join(tmpDir, 'test.md'), '# Hello\nWorld')
    writeFileSync(join(tmpDir, '.hidden.md'), '# Hidden')
    writeFileSync(join(tmpDir, 'readme.txt'), 'plain text')
    mkdirSync(join(tmpDir, 'sub'))
    writeFileSync(join(tmpDir, 'sub', 'nested.md'), '# Nested')
    mkdirSync(join(tmpDir, 'node_modules'))
    mkdirSync(join(tmpDir, 'empty'))
  })

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('should list directory contents', async () => {
    const { listDirectory } = await import('./files')
    const entries = await listDirectory(tmpDir)
    expect(entries.length).toBeGreaterThanOrEqual(3)
    expect(entries.find((e) => e.name === 'test.md')).toBeDefined()
  })

  it('should mark hidden files', async () => {
    const { listDirectory } = await import('./files')
    const entries = await listDirectory(tmpDir)
    const hidden = entries.find((e) => e.name === '.hidden.md')
    expect(hidden?.isHidden).toBe(true)
  })

  it('should read file content', async () => {
    const { readFile } = await import('./files')
    const result = await readFile(join(tmpDir, 'test.md'))
    expect(result.path).toBe(join(tmpDir, 'test.md'))
    expect(result.content).toContain('# Hello')
  })

  it('should get file info', async () => {
    const { getFileInfo } = await import('./files')
    const info = await getFileInfo(tmpDir)
    expect(info.isDirectory).toBe(true)
  })

  it('should detect supported files', async () => {
    const { hasSupportedFiles, listDirectory } = await import('./files')
    const entries = await listDirectory(tmpDir)
    expect(hasSupportedFiles(entries)).toBe(true)
  })

  it('should sort directories first then alphabetically', async () => {
    const { listDirectory } = await import('./files')
    const entries = await listDirectory(tmpDir)
    const dirs = entries.filter((e) => e.isDirectory)
    const files = entries.filter((e) => !e.isDirectory)
    if (entries.length > 0) {
      expect(entries[0].isDirectory).toBe(true)
    }
    for (let i = 1; i < dirs.length; i++) {
      expect(dirs[i - 1].name.localeCompare(dirs[i].name)).toBeLessThanOrEqual(0)
    }
    for (let i = 1; i < files.length; i++) {
      expect(files[i - 1].name.localeCompare(files[i].name)).toBeLessThanOrEqual(0)
    }
  })

  it('should respect ignoreList parameter', async () => {
    const { listDirectory } = await import('./files')
    const entries = await listDirectory(tmpDir, ['sub', 'readme.txt'])
    const names = entries.map((e) => e.name)
    expect(names).not.toContain('sub')
    expect(names).not.toContain('readme.txt')
    expect(names).toContain('test.md')
    expect(names).toContain('.hidden.md')
    expect(names).toContain('node_modules')
    expect(names).toContain('empty')
  })

  it('should use DEFAULT_IGNORE when no ignoreList passed', async () => {
    const { listDirectory, DEFAULT_IGNORE } = await import('./files')
    const entries = await listDirectory(tmpDir)
    expect(entries.find((e) => e.name === 'node_modules')).toBeUndefined()
  })
})
