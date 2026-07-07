import { test, expect } from '@playwright/test'
import { createTestWorkspace, launchApp, openWorkspace } from './utils'

test.describe('File Tree', () => {
  test('should show .md files in the file tree when workspace is opened', async ({ page }) => {
    const ws = createTestWorkspace({
      'readme.md': '# Readme',
      'guide.md': '# Guide',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    await expect(page.getByText('readme.md')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('guide.md')).toBeVisible()

    ws.cleanup()
  })

  test('should open a tab when clicking a .md file in the tree', async ({ page }) => {
    const ws = createTestWorkspace({
      'test.md': '# Hello',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    await page.getByText('test.md').first().click()

    await expect(page.getByRole('tab', { name: /test\.md/ })).toBeVisible({ timeout: 10000 })

    ws.cleanup()
  })
})
