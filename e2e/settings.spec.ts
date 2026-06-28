import { test, expect } from '@playwright/test'
import { launchApp, createTestDir, writeFixture, openWorkspace } from './utils'

test.describe('Settings Panel', () => {
  test('should open settings panel', async () => {
    const { electronApp, page, cleanup } = await launchApp()
    const dir = createTestDir()
    writeFixture(dir.path, 'test.md', '# Test')

    await openWorkspace(electronApp, page, dir.path)
    await expect(page.getByText('test.md')).toBeVisible({ timeout: 10000 })

    await electronApp.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.webContents.send('menu:openSettings')
    })

    await expect(page.getByText('Settings').first()).toBeVisible({ timeout: 10000 })

    dir.cleanup()
    await cleanup()
  })

  test('should close settings panel on Escape', async () => {
    const { electronApp, page, cleanup } = await launchApp()
    const dir = createTestDir()
    writeFixture(dir.path, 'test.md', '# Test')

    await openWorkspace(electronApp, page, dir.path)
    await expect(page.getByText('test.md')).toBeVisible({ timeout: 10000 })

    await electronApp.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.webContents.send('menu:openSettings')
    })

    await expect(page.getByText('Settings').first()).toBeVisible({ timeout: 10000 })

    await page.keyboard.press('Escape')

    await expect(page.getByText('Settings').first()).not.toBeVisible({ timeout: 10000 })

    dir.cleanup()
    await cleanup()
  })
})
