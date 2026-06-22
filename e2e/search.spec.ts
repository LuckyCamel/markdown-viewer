import { test, expect } from '@playwright/test'
import { launchApp, createTestDir, writeFixture, openWorkspace } from './utils'

test.describe('Search', () => {
  async function sendMenuIpc(
    electronApp: import('@playwright/test').ElectronApplication,
    channel: string,
  ) {
    await electronApp.evaluate(({ BrowserWindow }, c: string) => {
      const win = BrowserWindow.getAllWindows()[0]
      win?.webContents.send(c)
    }, channel)
  }

  test('should open file search with Ctrl+P', async () => {
    const { electronApp, page, cleanup } = await launchApp()
    const dir = createTestDir()
    writeFixture(dir.path, 'test.md', '# Test')
    await openWorkspace(electronApp, page, dir.path)

    await sendMenuIpc(electronApp, 'menu:fileSearch')
    const searchInput = page.locator('input[placeholder*="files" i]').first()
    await expect(searchInput).toBeVisible({ timeout: 10000 })

    dir.cleanup()
    await cleanup()
  })

  test('should open content search with Ctrl+Shift+F', async () => {
    const { electronApp, page, cleanup } = await launchApp()
    const dir = createTestDir()
    writeFixture(dir.path, 'test.md', '# Test')
    await openWorkspace(electronApp, page, dir.path)

    await sendMenuIpc(electronApp, 'menu:contentSearch')
    const searchInput = page.locator('input[placeholder*="content" i]').first()
    await expect(searchInput).toBeVisible({ timeout: 10000 })

    dir.cleanup()
    await cleanup()
  })
})
