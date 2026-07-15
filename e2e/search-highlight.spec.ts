import { test, expect } from '@playwright/test'
import { createTestWorkspace, launchApp, openWorkspace } from './utils'
import type { SearchProgress } from '../src/shared/types'

/**
 * 方向一·批次1.3 搜索高亮 E2E 测试
 *
 * 验证：
 * - 从内容搜索点击结果后，文档中出现高亮 mark
 * - SearchHighlightBar 显示匹配数量与位置
 * - 上一个/下一个按钮可循环切换
 * - 关闭按钮清除高亮
 *
 * 注意：搜索结果列表容器为 `div.max-h-64`，需用此 selector 与文件树区分。
 */
test.describe('Search Highlight', () => {
  /**
   * 在搜索结果列表中点击指定文件名对应的结果项
   * 通过限定到 max-h-64 容器避免与文件树的同名条目冲突
   */
  async function clickSearchResult(page: import('@playwright/test').Page, fileName: string) {
    const resultButton = page
      .locator('div.max-h-64 button')
      .filter({ hasText: fileName })
      .first()
    await resultButton.click()
  }

  test('should highlight matches in document after clicking search result', async ({ page }) => {
    const ws = createTestWorkspace({
      'doc.md': 'apple banana apple cherry apple',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    const filePath = Object.keys(ws.fileContents)[0]
    const fakeProgress: SearchProgress = {
      searchId: 'hl-1',
      totalFiles: 1,
      searchedFiles: 1,
      matches: [
        {
          path: filePath,
          line: 1,
          column: 1,
          matchText: 'apple',
          lineContent: 'apple banana apple cherry apple',
        },
      ],
      isComplete: true,
    }
    await page.evaluate((progress) => {
      window.__E2E__.searchResults = progress
    }, fakeProgress)

    // 打开内容搜索
    await page.keyboard.press('Control+Shift+f')
    const input = page.locator('input[placeholder*="content" i]').first()
    await expect(input).toBeVisible({ timeout: 10000 })
    await input.fill('apple')
    await page.waitForTimeout(500)

    // 点击搜索结果（限定到搜索结果容器，避免命中文件树）
    await clickSearchResult(page, 'doc.md')

    // 高亮工具栏出现，并显示匹配数
    await expect(page.getByText(/^\d+ matches$/)).toBeVisible({ timeout: 8000 })

    // 文档内出现 mark 元素
    await expect(page.locator('[data-scroll-container] mark[data-search-highlight]')).toHaveCount(
      3,
      { timeout: 5000 },
    )

    ws.cleanup()
  })

  test('should navigate matches via next/prev buttons', async ({ page }) => {
    const ws = createTestWorkspace({
      'doc.md': 'foo bar foo bar foo',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    const filePath = Object.keys(ws.fileContents)[0]
    const fakeProgress: SearchProgress = {
      searchId: 'hl-2',
      totalFiles: 1,
      searchedFiles: 1,
      matches: [
        {
          path: filePath,
          line: 1,
          column: 1,
          matchText: 'foo',
          lineContent: 'foo bar foo bar foo',
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
    await input.fill('foo')
    await page.waitForTimeout(500)

    await clickSearchResult(page, 'doc.md')

    // 等待高亮出现
    await expect(page.getByText(/^\d+ matches$/)).toBeVisible({ timeout: 8000 })

    // 初始位置 1/3
    await expect(page.getByText(/^1\/3$/)).toBeVisible({ timeout: 5000 })

    // 点击下一个
    await page.locator('[aria-label="Next"]').click()
    await expect(page.getByText(/^2\/3$/)).toBeVisible({ timeout: 5000 })

    // 点击下一个到末尾
    await page.locator('[aria-label="Next"]').click()
    await expect(page.getByText(/^3\/3$/)).toBeVisible({ timeout: 5000 })

    // 再次点击应循环回到 1/3
    await page.locator('[aria-label="Next"]').click()
    await expect(page.getByText(/^1\/3$/)).toBeVisible({ timeout: 5000 })

    ws.cleanup()
  })

  test('should clear highlights when clicking close button', async ({ page }) => {
    const ws = createTestWorkspace({
      'doc.md': 'hello world hello',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    const filePath = Object.keys(ws.fileContents)[0]
    const fakeProgress: SearchProgress = {
      searchId: 'hl-3',
      totalFiles: 1,
      searchedFiles: 1,
      matches: [
        {
          path: filePath,
          line: 1,
          column: 1,
          matchText: 'hello',
          lineContent: 'hello world hello',
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
    await input.fill('hello')
    await page.waitForTimeout(500)

    await clickSearchResult(page, 'doc.md')

    // 等待高亮出现
    await expect(page.locator('[data-scroll-container] mark[data-search-highlight]')).toHaveCount(
      2,
      { timeout: 5000 },
    )

    // 点击关闭按钮
    await page.locator('[aria-label="Close"]').click()

    // mark 元素应被清除
    await expect(page.locator('[data-scroll-container] mark[data-search-highlight]')).toHaveCount(
      0,
      { timeout: 3000 },
    )

    ws.cleanup()
  })
})
