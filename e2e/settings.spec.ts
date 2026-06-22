import { test, expect } from '@playwright/test'
import { launchApp, createTestDir, openWorkspace } from './utils'

test.describe('Settings Panel', () => {
  test('should open settings panel', async () => {
    const { electronApp, page, cleanup } = await launchApp()
    const dir = createTestDir()

    await openWorkspace(electronApp, page, dir.path)
    await page.waitForTimeout(500)

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

    await openWorkspace(electronApp, page, dir.path)
    await page.waitForTimeout(500)

    await electronApp.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.webContents.send('menu:openSettings')
    })

    await expect(page.getByText('Settings').first()).toBeVisible({ timeout: 10000 })

    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    await expect(page.getByText('Settings').first()).not.toBeVisible()

    dir.cleanup()
    await cleanup()
  })
})
