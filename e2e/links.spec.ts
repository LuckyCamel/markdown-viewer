import { test, expect } from '@playwright/test'
import { launchApp, createTestDir, writeFixture, openWorkspace } from './utils'

test.describe('Link Handling', () => {
  test('should open internal .md link in new tab', async () => {
    const { electronApp, page, cleanup } = await launchApp()
    const dir = createTestDir()
    writeFixture(dir.path, 'main.md', '[Link](other.md)')
    writeFixture(dir.path, 'other.md', '# Other File')

    await openWorkspace(electronApp, page, dir.path)

    await page.getByText('main.md').first().click()

    const link = page.locator('a').filter({ hasText: 'Link' }).first()
    await link.click()

    await expect(page.getByText('Other File').first()).toBeVisible({ timeout: 10000 })

    dir.cleanup()
    await cleanup()
  })
})
