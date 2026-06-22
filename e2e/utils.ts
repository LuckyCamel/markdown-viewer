import { _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

async function clearStoredConfig(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.api.store.set('lastWorkspace', null)
    window.api.store.set('openFiles', [])
    window.api.store.set('activeFile', null)
  })
}

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
  await clearStoredConfig(page)
  await electronApp.evaluate(({ dialog }) => {
    dialog.showErrorBox = () => {}
  })
  const cleanup = async () => {
    try { await electronApp.close() } catch { /* already closed */ }
  }
  return { electronApp, page, cleanup }
}

export async function openWorkspace(
  electronApp: ElectronApplication,
  page: Page,
  dirPath: string,
): Promise<void> {
  await electronApp.evaluate(async ({ ipcMain }, d: string) => {
    ipcMain.removeHandler('dialog:openDirectory')
    ipcMain.handle('dialog:openDirectory', async () => d)
  }, dirPath)

  const btn = page.getByRole('button', { name: /Open Folder/i })
  await btn.click()
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
