import { test, expect } from '@playwright/test'
import { createTestWorkspace, launchApp, openWorkspace } from './utils'

test.describe('Theme Switching', () => {
  test('should toggle between light and dark themes', async ({ page }) => {
    const ws = createTestWorkspace({
      'test.md': '# Test',
    })
    const html = page.locator('html')

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await expect(page.getByText('test.md')).toBeVisible({ timeout: 10000 })

    await page.keyboard.press('Control+,')
    await expect(page.getByText('Settings').first()).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: 'Dark' }).click()
    await expect(html).toHaveClass(/dark/, { timeout: 5000 })

    await page.getByRole('button', { name: 'Light' }).click()
    await expect(html).not.toHaveClass(/dark/, { timeout: 5000 })

    ws.cleanup()
  })
})
