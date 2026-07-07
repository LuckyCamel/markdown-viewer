import { test, expect } from '@playwright/test'
import { createTestWorkspace, launchApp, openWorkspace } from './utils'

test.describe('Tab Management', () => {
  test('should create a tab with filename when opening a file', async ({ page }) => {
    const ws = createTestWorkspace({
      'hello.md': '# Hello',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    await page.getByText('hello.md').first().click()
    const tab = page.getByRole('tab', { name: /hello\.md/ })
    await expect(tab).toBeVisible({ timeout: 10000 })

    ws.cleanup()
  })

  test('should switch content when switching tabs', async ({ page }) => {
    const ws = createTestWorkspace({
      'a.md': '# File A',
      'b.md': '# File B',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    await page.getByText('a.md').first().click()
    await page.getByText('b.md').first().click()

    const tabB = page.getByRole('tab', { name: /b\.md/ })
    const tabA = page.getByRole('tab', { name: /a\.md/ })

    await expect(tabB).toHaveAttribute('aria-selected', 'true', { timeout: 10000 })
    await expect(tabA).toHaveAttribute('aria-selected', 'false')

    await tabA.click()
    await expect(tabA).toHaveAttribute('aria-selected', 'true')
    await expect(tabB).toHaveAttribute('aria-selected', 'false')

    ws.cleanup()
  })

  test('should remove tab when closing a tab', async ({ page }) => {
    const ws = createTestWorkspace({
      'close-me.md': '# Close me',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    await page.getByText('close-me.md').first().click()
    const tab = page.getByRole('tab', { name: /close-me\.md/ })
    await expect(tab).toBeVisible({ timeout: 10000 })

    await tab.locator('button').click()
    await expect(tab).not.toBeVisible()

    ws.cleanup()
  })
})
