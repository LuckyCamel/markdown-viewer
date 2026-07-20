import { test, expect } from '@playwright/test'
import { createTestWorkspace, launchApp, openWorkspace } from './utils'

test.describe('Source Viewer - Line Numbers', () => {
  test('source viewer shows line numbers for code files', async ({ page }) => {
    const ws = createTestWorkspace({
      'code.ts': `export const foo = "bar";\n\nexport function test() {\n  return 1;\n}\n`,
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    await page.getByText('code.ts').first().click()
    await page.waitForSelector('.source-viewer', { timeout: 5000 })

    const lineNumbers = page.locator('.select-none').filter({ hasText: '1' })
    await expect(lineNumbers).toBeVisible()

    ws.cleanup()
  })

  test('source viewer shows correct number of line numbers', async ({ page }) => {
    const ws = createTestWorkspace({
      'multi-line.ts': `line 1\nline 2\nline 3\nline 4\nline 5\n`,
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    await page.getByText('multi-line.ts').first().click()
    await page.waitForSelector('.source-viewer', { timeout: 5000 })

    const lineNumberDivs = page.locator('.select-none div')
    const count = await lineNumberDivs.count()
    expect(count).toBeGreaterThanOrEqual(5)

    ws.cleanup()
  })

  test('source viewer applies syntax highlighting', async ({ page }) => {
    const ws = createTestWorkspace({
      'code.ts': 'export const foo = "bar";',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    await page.getByText('code.ts').first().click()
    await page.waitForSelector('.source-viewer', { timeout: 5000 })

    const highlightedCode = page.locator('code.language-typescript')
    await expect(highlightedCode).toBeVisible()

    ws.cleanup()
  })
})