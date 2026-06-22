import { _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

export async function launchApp(): Promise<{
  electronApp: ElectronApplication
  page: Page
  cleanup: () => Promise<void>
}> {
  const electronApp = await electron.launch({
    args: ['.'],
    executablePath: undefined,
  })
  const page = await electronApp.firstWindow()
  const cleanup = async () => {
    await electronApp.close()
  }
  return { electronApp, page, cleanup }
}

export function createTestDir(): { path: string; cleanup: () => void } {
  const tmpDir = mkdtempSync(join(tmpdir(), 'mde2e-'))
  const cleanup = () => rmSync(tmpDir, { recursive: true, force: true })
  return { path: tmpDir, cleanup }
}

export function writeFixture(
  dir: string,
  relativePath: string,
  content: string,
): string {
  const fullPath = join(dir, relativePath)
  const parentDir = join(dir, ...relativePath.split(/[\\/]/).slice(0, -1))
  mkdirSync(parentDir, { recursive: true })
  writeFileSync(fullPath, content, 'utf-8')
  return fullPath
}
