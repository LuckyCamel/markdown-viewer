import { test, expect } from '@playwright/test'
import { createTestWorkspace, launchApp, openWorkspace } from './utils'

test.describe('Surface Honesty - Non-MD Files', () => {
  test('non-markdown files do not show edit button', async ({ page }) => {
    const ws = createTestWorkspace({
      'readme.md': '# README\n\nMarkdown file.',
      'code.ts': 'export const foo = "bar";',
      'notes.txt': 'Plain text file',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    await page.getByText('code.ts').first().click()
    await page.waitForSelector('.source-viewer', { timeout: 5000 })

    const editBtn = page.getByTitle(/编辑视图|Edit view/i)
    await expect(editBtn).not.toBeVisible()

    const readBtn = page.getByTitle(/阅读视图|Read view/i)
    await expect(readBtn).toBeVisible()

    ws.cleanup()
  })

  test('non-markdown files show "源码伴读" in status bar', async ({ page }) => {
    const ws = createTestWorkspace({
      'code.ts': 'export const foo = "bar";',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    await page.getByText('code.ts').first().click()
    await page.waitForSelector('.source-viewer', { timeout: 5000 })

    const statusBar = page.locator('.text-xs').filter({ hasText: '源码伴读' })
    await expect(statusBar).toBeVisible()

    ws.cleanup()
  })

  test('markdown files still show edit button', async ({ page }) => {
    const ws = createTestWorkspace({
      'readme.md': '# README\n\nMarkdown file.',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    await page.getByText('readme.md').first().click()
    await page.waitForSelector('.prose', { timeout: 5000 })

    const editBtn = page.getByTitle(/编辑视图|Edit view/i)
    await expect(editBtn).toBeVisible()

    ws.cleanup()
  })
})
