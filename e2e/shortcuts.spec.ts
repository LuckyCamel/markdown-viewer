import { test, expect } from '@playwright/test'
import { launchApp, createTestDir, writeFixture, openWorkspace } from './utils'

test.describe('Keyboard Shortcuts', () => {
  test('Ctrl+B should toggle file tree', async () => {
    const { electronApp, page, cleanup } = await launchApp()
    const dir = createTestDir()
    writeFixture(dir.path, 'doc.md', '# Doc')

    await openWorkspace(electronApp, page, dir.path)
    await expect(page.getByText('doc.md')).toBeVisible({ timeout: 10000 })

    // Ctrl+B: toggle off
    await electronApp.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      win.webContents.send('menu:toggleFileTree')
    })
    await page.waitForTimeout(500)
    await expect(page.getByText('doc.md')).not.toBeVisible()

    // Ctrl+B: toggle back on
    await electronApp.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      win.webContents.send('menu:toggleFileTree')
    })
    await page.waitForTimeout(500)
    await expect(page.getByText('doc.md')).toBeVisible()

    dir.cleanup()
    await cleanup()
  })

  test('Ctrl+T should toggle outline panel', async () => {
    const { electronApp, page, cleanup } = await launchApp()
    const dir = createTestDir()
    writeFixture(dir.path, 'doc.md', '# Heading 1\n## Heading 2')

    await openWorkspace(electronApp, page, dir.path)
    await page.getByText('doc.md').first().click()

    const outlineItem = page.locator('nav button').filter({ hasText: 'Heading 1' })
    await expect(outlineItem).toBeVisible({ timeout: 10000 })

    // Ctrl+T: toggle off
    await electronApp.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      win.webContents.send('menu:toggleOutline')
    })
    await page.waitForTimeout(500)
    await expect(outlineItem).not.toBeVisible()

    // Ctrl+T: toggle back on
    await electronApp.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      win.webContents.send('menu:toggleOutline')
    })
    await page.waitForTimeout(500)
    await expect(outlineItem).toBeVisible()

    dir.cleanup()
    await cleanup()
  })
})
