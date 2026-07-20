import { test, expect } from '@playwright/test'
import { createTestWorkspace, launchApp, openWorkspace } from './utils'
import type { SearchProgress } from '../src/shared/types'

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

test.describe('Source Viewer - Search Line Navigation', () => {
  async function clickSearchResult(page: import('@playwright/test').Page, fileName: string) {
    const resultButton = page.locator('div.max-h-64 button').filter({ hasText: fileName }).first()
    await resultButton.click()
  }

  test('line numbers have data-line attribute', async ({ page }) => {
    const ws = createTestWorkspace({
      'test.js': 'line1\nline2\nline3',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    await page.getByText('test.js').first().click()
    await page.waitForSelector('.source-viewer', { timeout: 5000 })

    const line1 = page.locator('.source-viewer [data-line="1"]')
    await expect(line1).toBeVisible({ timeout: 5000 })
    await expect(line1).toHaveText('1')

    const line3 = page.locator('.source-viewer [data-line="3"]')
    await expect(line3).toBeVisible({ timeout: 5000 })
    await expect(line3).toHaveText('3')

    ws.cleanup()
  })

  test('search result click navigates to target line in SourceViewer', async ({ page }) => {
    const content = Array.from({ length: 50 }, (_, i) => `line ${i + 1}: content ${i + 1}`).join('\n')

    const ws = createTestWorkspace({
      'code.ts': content,
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    await page.getByText('code.ts').first().click()
    await page.waitForSelector('.source-viewer', { timeout: 5000 })

    const filePath = Object.keys(ws.fileContents)[0]
    const fakeProgress: SearchProgress = {
      searchId: 'nav-1',
      totalFiles: 1,
      searchedFiles: 1,
      matches: [
        {
          path: filePath,
          line: 30,
          column: 1,
          matchText: 'line 30',
          lineContent: 'line 30: content 30',
        },
      ],
      isComplete: true,
    }
    await page.evaluate((progress) => {
      window.__E2E__.searchResults = progress
    }, fakeProgress)

    await page.keyboard.press('Control+Shift+f')
    const input = page.locator('input[placeholder*="content" i]').first()
    await expect(input).toBeVisible({ timeout: 10000 })
    await input.fill('line 30')
    await page.waitForTimeout(500)

    await clickSearchResult(page, 'code.ts')

    await page.waitForTimeout(1000)

    const line30 = page.locator('.source-viewer [data-line="30"]')
    await expect(line30).toBeVisible({ timeout: 5000 })

    ws.cleanup()
  })
})
