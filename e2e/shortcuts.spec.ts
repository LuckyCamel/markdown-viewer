import { test, expect } from '@playwright/test'
import { createTestWorkspace, launchApp, openWorkspace } from './utils'

test.describe('Keyboard Shortcuts', () => {
  test('Ctrl+B should toggle file tree', async ({ page }) => {
    const ws = createTestWorkspace({
      'doc.md': '# Doc',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await expect(page.getByText('doc.md')).toBeVisible({ timeout: 10000 })

    await page.keyboard.press('Control+b')
    await expect(page.getByText('doc.md')).not.toBeVisible({ timeout: 5000 })

    await page.keyboard.press('Control+b')
    await expect(page.getByText('doc.md')).toBeVisible({ timeout: 5000 })

    ws.cleanup()
  })

  test('Ctrl+Shift+L should toggle outline panel', async ({ page }) => {
    const ws = createTestWorkspace({
      'doc.md': '# Heading 1\n## Heading 2',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await page.getByText('doc.md').first().click()

    const outlineItem = page.locator('nav button').filter({ hasText: 'Heading 1' })
    await expect(outlineItem).toBeVisible({ timeout: 10000 })

    await page.keyboard.press('Control+Shift+l')
    await expect(outlineItem).not.toBeVisible({ timeout: 5000 })

    await page.keyboard.press('Control+Shift+l')
    await expect(outlineItem).toBeVisible({ timeout: 5000 })

    ws.cleanup()
  })

  test('Ctrl+P should open file search', async ({ page }) => {
    const ws = createTestWorkspace({
      'test.md': '# Test',
    })
    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    await page.keyboard.press('Control+p')
    const searchInput = page.locator('input[placeholder*="files" i]').first()
    await expect(searchInput).toBeVisible({ timeout: 10000 })

    ws.cleanup()
  })

  test('Ctrl+Shift+F should open content search', async ({ page }) => {
    const ws = createTestWorkspace({
      'test.md': '# Test',
    })
    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    await page.keyboard.press('Control+Shift+f')
    const searchInput = page.locator('input[placeholder*="content" i]').first()
    await expect(searchInput).toBeVisible({ timeout: 10000 })

    ws.cleanup()
  })
})
