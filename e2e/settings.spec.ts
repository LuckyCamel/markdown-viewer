import { test, expect } from '@playwright/test'
import { createTestWorkspace, launchApp, openWorkspace } from './utils'

test.describe('Settings Panel', () => {
  test('should open settings panel with Ctrl+,', async ({ page }) => {
    const ws = createTestWorkspace({
      'test.md': '# Test',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await expect(page.getByText('test.md')).toBeVisible({ timeout: 10000 })

    await page.keyboard.press('Control+,')

    await expect(page.getByText('Settings').first()).toBeVisible({ timeout: 10000 })

    ws.cleanup()
  })

  test('should close settings panel on Escape', async ({ page }) => {
    const ws = createTestWorkspace({
      'test.md': '# Test',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await expect(page.getByText('test.md')).toBeVisible({ timeout: 10000 })

    await page.keyboard.press('Control+,')

    await expect(page.getByText('Settings').first()).toBeVisible({ timeout: 10000 })

    await page.keyboard.press('Escape')

    await expect(page.getByText('Settings').first()).not.toBeVisible({ timeout: 10000 })

    ws.cleanup()
  })
})
