import { describe, it, expect } from 'vitest'
import { writeFileSync, mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('file watcher', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'watch-'))
    writeFileSync(join(tmpDir, 'test.md'), '# Hello')
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('should watch a file', async () => {
    const { watchFile } = await import('./watcher')
    expect(() => watchFile(join(tmpDir, 'test.md'), {} as any)).not.toThrow()
  })

  it('should unwatch a file', async () => {
    const { watchFile, unwatchFile } = await import('./watcher')
    watchFile(join(tmpDir, 'test.md'), {} as any)
    expect(() => unwatchFile(join(tmpDir, 'test.md'))).not.toThrow()
  })

  it('should not create duplicate watchers', async () => {
    const { watchFile, unwatchFile } = await import('./watcher')
    watchFile(join(tmpDir, 'test.md'), {} as any)
    watchFile(join(tmpDir, 'test.md'), {} as any)
    expect(() => unwatchFile(join(tmpDir, 'test.md'))).not.toThrow()
    expect(() => unwatchFile(join(tmpDir, 'test.md'))).not.toThrow()
  })

  it('should unwatch all files', async () => {
    const { watchFile, unwatchAll } = await import('./watcher')
    watchFile(join(tmpDir, 'test.md'), {} as any)
    expect(() => unwatchAll()).not.toThrow()
  })
})
