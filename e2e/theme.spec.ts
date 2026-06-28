import { test, expect } from '@playwright/test'
import { launchApp, createTestDir, writeFixture, openWorkspace } from './utils'

test.describe('Theme Switching', () => {
  test('should toggle between light and dark themes', async () => {
    const { electronApp, page, cleanup } = await launchApp()
    const dir = createTestDir()
    writeFixture(dir.path, 'test.md', '# Test')
    const html = page.locator('html')

    // Need a workspace so Layout renders (SettingsPanel is inside Layout)
    await openWorkspace(electronApp, page, dir.path)
    await expect(page.getByText('test.md')).toBeVisible({ timeout: 10000 })

    // Open settings panel via IPC (simulating menu click)
    await electronApp.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.webContents.send('menu:openSettings')
    })
    await expect(page.getByText('Settings').first()).toBeVisible({ timeout: 10000 })

    // Switch to dark — verify class added
    await page.getByRole('button', { name: 'Dark' }).click()
    await expect(html).toHaveClass(/dark/, { timeout: 5000 })

    // Switch to light — verify class removed
    await page.getByRole('button', { name: 'Light' }).click()
    await expect(html).not.toHaveClass(/dark/, { timeout: 5000 })

    dir.cleanup()
    await cleanup()
  })
})
