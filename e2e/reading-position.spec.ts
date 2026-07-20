import { test, expect } from '@playwright/test'
import { createTestWorkspace, launchApp, openWorkspace } from './utils'

/**
 * 方向一·批次1.1 滚动位置恢复 E2E 测试
 *
 * 验证：
 * - 文件打开后能恢复上次保存的滚动位置
 * - 切换 tab 后再切回，滚动位置保持
 */
test.describe('Reading Position Restore', () => {
  test('should restore saved scroll position when opening a file', async ({ page }) => {
    // 构造一份长文档，确保 scrollHeight 足够支持目标滚动位置
    const longBody = Array.from({ length: 60 }, (_, i) => `段落 ${i + 1}：内容填充文本。`).join(
      '\n\n',
    )
    const ws = createTestWorkspace({
      'long.md': `# Long Doc\n\n${longBody}`,
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await expect(page.getByText('long.md').first()).toBeVisible({ timeout: 10000 })

    // 预置 readingPositions：long.md 渲染模式滚动到 220px
    const filePath = Object.keys(ws.fileContents)[0]
    await page.evaluate(
      ({ key, path, pos }) => {
        const saved = localStorage.getItem(key)
        const obj = saved ? JSON.parse(saved) : {}
        obj[path] = { render: pos, source: 0 }
        localStorage.setItem(key, JSON.stringify(obj))
      },
      { key: 'readingPositions', path: filePath, pos: 220 },
    )

    // 重新打开文件以触发恢复逻辑
    await page.getByText('long.md').first().click()

    // 等待滚动恢复（双 rAF + 重试，最长 ~750ms），放宽到 3s
    await expect
      .poll(
        async () => {
          const top = await page
            .locator('[data-scroll-container]')
            .evaluate((el: HTMLElement) => el.scrollTop)
          return top
        },
        { timeout: 5000, intervals: [200, 400, 800] },
      )
      .toBeGreaterThan(100)

    ws.cleanup()
  })

  test('should persist scroll position when switching tabs and back', async ({ page }) => {
    const ws = createTestWorkspace({
      'a.md': `# A\n\n${Array.from({ length: 50 }, (_, i) => `A 段落 ${i + 1}`).join('\n\n')}`,
      'b.md': '# B\n\n短文档',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    // 打开 a.md 并滚动
    await page.getByText('a.md').first().click()
    await expect(page.locator('h1').filter({ hasText: 'A' })).toBeVisible({ timeout: 10000 })

    const container = page.locator('[data-scroll-container]')
    await container.evaluate((el: HTMLElement) => {
      el.scrollTop = 300
      el.dispatchEvent(new Event('scroll'))
    })

    // 等待防抖写入（500ms）
    await page.waitForTimeout(800)

    // 切换到 b.md
    await page.getByText('b.md').first().click()
    await expect(page.locator('h1').filter({ hasText: 'B' })).toBeVisible({ timeout: 10000 })

    // 切回 a.md
    await page.getByRole('tab', { name: /a\.md/ }).click()
    await expect(page.locator('h1').filter({ hasText: 'A' })).toBeVisible({ timeout: 10000 })

    // 验证滚动位置被恢复（≥ 200，允许一定误差）
    await expect
      .poll(
        async () => {
          return container.evaluate((el: HTMLElement) => el.scrollTop)
        },
        { timeout: 5000, intervals: [200, 400, 800] },
      )
      .toBeGreaterThan(200)

    ws.cleanup()
  })
})
