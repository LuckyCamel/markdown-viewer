import { test, expect } from '@playwright/test'
import { createTestWorkspace, launchApp, openWorkspace } from './utils'

test.describe('Link Handling', () => {
  test('should open internal .md link in new tab', async ({ page }) => {
    const ws = createTestWorkspace({
      'main.md': '[Link](other.md)',
      'other.md': '# Other File',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    await page.getByText('main.md').first().click()

    const link = page.locator('a').filter({ hasText: 'Link' }).first()
    await link.click()

    await expect(page.getByText('Other File').first()).toBeVisible({ timeout: 10000 })

    ws.cleanup()
  })
})
