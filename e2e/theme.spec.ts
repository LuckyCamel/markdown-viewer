import { test, expect } from '@playwright/test'
import { launchApp, createTestDir, openWorkspace } from './utils'

test.describe('Theme Switching', () => {
  test('should toggle between light and dark themes', async () => {
    const { electronApp, page, cleanup } = await launchApp()
    const dir = createTestDir()
    const html = page.locator('html')

    // Need a workspace so Layout renders (SettingsPanel is inside Layout)
    await openWorkspace(electronApp, page, dir.path)
    await page.waitForTimeout(500)

    // Open settings panel via IPC (simulating menu click)
    await electronApp.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.webContents.send('menu:openSettings')
    })
    await page.waitForTimeout(500)

    // Switch to dark — verify class added
    await page.getByRole('button', { name: 'Dark' }).click()
    await page.waitForTimeout(300)
    await expect(html).toHaveClass(/dark/)

    // Switch to light — verify class removed
    await page.getByRole('button', { name: 'Light' }).click()
    await page.waitForTimeout(300)
    await expect(html).not.toHaveClass(/dark/)

    dir.cleanup()
    await cleanup()
  })
})
