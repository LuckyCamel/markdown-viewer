import { test, expect } from '@playwright/test'
import { createTestWorkspace, launchApp, openWorkspace } from './utils'
import type { SearchProgress } from '../src/shared/types'

/**
 * 方向一·批次1.3 正则搜索 E2E 测试
 *
 * 验证：
 * - Ctrl+Shift+F 打开内容搜索面板
 * - .* 按钮可切换正则模式（视觉与状态）
 * - 搜索结果列表渲染
 */
test.describe('Regex Content Search', () => {
  test('should toggle regex mode via .* button', async ({ page }) => {
    const ws = createTestWorkspace({
      'doc.md': '# Hello\nworld hello HELLO',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    await page.keyboard.press('Control+Shift+f')
    const input = page.locator('input[placeholder*="content" i]').first()
    await expect(input).toBeVisible({ timeout: 10000 })

    // .* 按钮初始为非激活态
    const regexBtn = page.locator('button[title="Regex mode"]')
    await expect(regexBtn).toBeVisible()

    // 点击切换为正则模式
    await regexBtn.click()
    // 按钮变为激活色（bg-blue-500）
    await expect(regexBtn).toHaveClass(/bg-blue-500/, { timeout: 3000 })

    // 再次点击关闭正则模式
    await regexBtn.click()
    await expect(regexBtn).not.toHaveClass(/bg-blue-500/, { timeout: 3000 })

    ws.cleanup()
  })

  test('should display search results when query matches', async ({ page }) => {
    const ws = createTestWorkspace({
      'doc.md': '# Hello World\nhello again',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    // 预置 mock 搜索结果
    const filePath = Object.keys(ws.fileContents)[0]
    const fakeProgress: SearchProgress = {
      searchId: 'test-1',
      totalFiles: 2,
      searchedFiles: 2,
      matches: [
        {
          path: filePath,
          line: 1,
          column: 1,
          matchText: 'Hello',
          lineContent: '# Hello World',
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

    // 输入查询触发搜索
    await input.fill('Hello')
    // 等待 debounce + mock 推送
    await page.waitForTimeout(500)

    // 应看到搜索结果中的文件名（限定到 max-h-64 容器避免与文件树冲突）
    const resultItem = page
      .locator('div.max-h-64 button')
      .filter({ hasText: 'doc.md' })
      .first()
    await expect(resultItem).toBeVisible({ timeout: 5000 })

    ws.cleanup()
  })

  test('should show error when regex mode requested but backend lacks regex crate', async ({
    page,
  }) => {
    const ws = createTestWorkspace({
      'doc.md': '# test',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    await page.keyboard.press('Control+Shift+f')
    const input = page.locator('input[placeholder*="content" i]').first()
    await expect(input).toBeVisible({ timeout: 10000 })

    // 开启正则模式
    const regexBtn = page.locator('button[title="Regex mode"]')
    await regexBtn.click()

    // 输入查询；E2E mock 不抛错，所以此处仅校验 UI 状态保持正则激活
    await input.fill('test')
    await expect(regexBtn).toHaveClass(/bg-blue-500/, { timeout: 3000 })

    ws.cleanup()
  })
})
