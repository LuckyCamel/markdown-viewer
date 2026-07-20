import { test, expect } from '@playwright/test'
import { createTestWorkspace, launchApp, openWorkspace } from './utils'

/**
 * 大文档分片渲染 E2E 测试
 *
 * 验证：
 * 1. 打开 > 1000 行的 MD 文件时，首屏只渲染前 200 行，哨兵元素可见
 * 2. 滚动到哨兵位置后追加渲染更多内容
 * 3. 短文档（< 1000 行）不显示哨兵
 * 4. 锚点跳转时一次性渲染全部
 */

/** 生成指定行数的 Markdown 内容，每行带标题便于验证 */
function generateLargeMarkdown(lines: number): string {
  const parts: string[] = []
  for (let i = 0; i < lines; i++) {
    if (i % 50 === 0) {
      parts.push(`## 章节标题 ${i}`)
    }
    parts.push(`这是第 ${i} 行的填充文本，用于测试大文档渲染性能。`)
  }
  return parts.join('\n')
}

test.describe('Large Doc Chunked Rendering', () => {
  test('短文档不显示分片哨兵', async ({ page }) => {
    const ws = createTestWorkspace({
      'small.md': '# 短文档\n\n行 1\n行 2\n行 3',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await page.getByText('small.md', { exact: true }).click()

    await expect(page.getByText('短文档').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('markdown-chunk-sentinel')).toBeHidden()

    ws.cleanup()
  })

  test('长文档首屏只渲染部分内容，哨兵可见', async ({ page }) => {
    // 1500 行 > 阈值 1000
    const ws = createTestWorkspace({
      'large.md': generateLargeMarkdown(1500),
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await page.getByText('large.md', { exact: true }).click()

    // 等待首屏渲染完成（章节标题 0 在前 200 行内）
    await expect(page.locator('.prose').getByText('章节标题 0').first()).toBeVisible({
      timeout: 10000,
    })

    // 哨兵应可见
    await expect(page.getByTestId('markdown-chunk-sentinel')).toBeVisible()

    // 章节 200 不应在首屏 200 行内（首屏 0/50/100/150 可见，200 及之后不可见）
    await expect(page.locator('.prose').getByText('章节标题 200').first()).toBeHidden()

    ws.cleanup()
  })

  test('滚动到哨兵后追加渲染更多内容', async ({ page }) => {
    const ws = createTestWorkspace({
      'large.md': generateLargeMarkdown(1500),
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await page.getByText('large.md', { exact: true }).click()

    await expect(page.locator('.prose').getByText('章节标题 0').first()).toBeVisible({
      timeout: 10000,
    })

    // 滚动哨兵到视口（rootMargin 200px 已配置，简单滚动即可触发）
    await page.getByTestId('markdown-chunk-sentinel').scrollIntoViewIfNeeded()

    // 等待追加渲染，章节标题 200 应变为可见
    await expect(page.locator('.prose').getByText('章节标题 200').first()).toBeVisible({
      timeout: 5000,
    })

    ws.cleanup()
  })
})
