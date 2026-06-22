import { test, expect } from '@playwright/test'
import { launchApp, createTestDir, writeFixture, openWorkspace } from './utils'

test.describe('Tab Management', () => {
  test('should create a tab with filename when opening a file', async () => {
    const { electronApp, page, cleanup } = await launchApp()
    const dir = createTestDir()
    writeFixture(dir.path, 'hello.md', '# Hello')

    await openWorkspace(electronApp, page, dir.path)

    await page.getByText('hello.md').first().click()
    const tab = page.getByRole('tab', { name: /hello\.md/ })
    await expect(tab).toBeVisible({ timeout: 10000 })

    dir.cleanup()
    await cleanup()
  })

  test('should switch content when switching tabs', async () => {
    const { electronApp, page, cleanup } = await launchApp()
    const dir = createTestDir()
    writeFixture(dir.path, 'a.md', '# File A')
    writeFixture(dir.path, 'b.md', '# File B')

    await openWorkspace(electronApp, page, dir.path)

    await page.getByText('a.md').first().click()
    await page.getByText('b.md').first().click()

    const tabB = page.getByRole('tab', { name: /b\.md/ })
    const tabA = page.getByRole('tab', { name: /a\.md/ })

    await expect(tabB).toHaveAttribute('aria-selected', 'true', { timeout: 10000 })
    await expect(tabA).toHaveAttribute('aria-selected', 'false')

    await tabA.click()
    await expect(tabA).toHaveAttribute('aria-selected', 'true')
    await expect(tabB).toHaveAttribute('aria-selected', 'false')

    dir.cleanup()
    await cleanup()
  })

  test('should remove tab when closing a tab', async () => {
    const { electronApp, page, cleanup } = await launchApp()
    const dir = createTestDir()
    writeFixture(dir.path, 'close-me.md', '# Close me')

    await openWorkspace(electronApp, page, dir.path)

    await page.getByText('close-me.md').first().click()
    const tab = page.getByRole('tab', { name: /close-me\.md/ })
    await expect(tab).toBeVisible({ timeout: 10000 })

    await tab.locator('button').click()
    await expect(tab).not.toBeVisible()

    dir.cleanup()
    await cleanup()
  })
})
