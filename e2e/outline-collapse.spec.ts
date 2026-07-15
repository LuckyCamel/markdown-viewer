import { test, expect } from '@playwright/test'
import { createTestWorkspace, launchApp, openWorkspace } from './utils'

/**
 * 方向一·批次1.2 大纲折叠与展开 E2E 测试
 *
 * 验证：
 * - 点击折叠箭头隐藏子级标题
 * - 再次点击恢复显示
 * - 全部折叠 / 全部展开按钮工作正常
 * - 右键菜单可触发复制锚点链接
 */
test.describe('Outline Collapse', () => {
  test('should collapse and expand child headings via arrow button', async ({ page }) => {
    const ws = createTestWorkspace({
      'doc.md': '# Title\n## Sub A\n## Sub B\n### Deep\n## Sub C',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await page.getByText('doc.md').first().click()

    const outline = page.locator('nav')
    await expect(outline).toBeVisible({ timeout: 10000 })

    // H1 应有折叠箭头，子级 H2 可见
    const h1Row = outline.locator('div', { hasText: 'Title' }).first()
    const arrowButton = h1Row.locator('button[aria-label="Collapse"]')
    await expect(arrowButton).toBeVisible({ timeout: 5000 })

    await expect(outline.getByText('Sub A')).toBeVisible()
    await expect(outline.getByText('Sub B')).toBeVisible()

    // 点击折叠
    await arrowButton.click()

    // 子级 H2 应隐藏
    await expect(outline.getByText('Sub A')).not.toBeVisible({ timeout: 3000 })
    await expect(outline.getByText('Sub B')).not.toBeVisible({ timeout: 3000 })

    // 再次点击展开
    const expandButton = h1Row.locator('button[aria-label="Expand"]')
    await expect(expandButton).toBeVisible()
    await expandButton.click()

    await expect(outline.getByText('Sub A')).toBeVisible({ timeout: 3000 })
    await expect(outline.getByText('Sub B')).toBeVisible({ timeout: 3000 })

    ws.cleanup()
  })

  test('should collapse all and expand all via toolbar', async ({ page }) => {
    const ws = createTestWorkspace({
      'doc.md': '# H1\n## H2a\n### H3\n## H2b',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await page.getByText('doc.md').first().click()

    const outline = page.locator('nav')
    await expect(outline).toBeVisible({ timeout: 10000 })

    // 全部折叠
    await outline.getByRole('button', { name: 'Collapse All' }).click()

    // 二级、三级标题应被隐藏
    await expect(outline.getByText('H2a')).not.toBeVisible({ timeout: 3000 })
    await expect(outline.getByText('H3')).not.toBeVisible({ timeout: 3000 })
    await expect(outline.getByText('H2b')).not.toBeVisible({ timeout: 3000 })

    // 全部展开
    await outline.getByRole('button', { name: 'Expand All' }).click()

    await expect(outline.getByText('H2a')).toBeVisible({ timeout: 3000 })
    await expect(outline.getByText('H3')).toBeVisible({ timeout: 3000 })
    await expect(outline.getByText('H2b')).toBeVisible({ timeout: 3000 })

    ws.cleanup()
  })

  test('should show copy anchor menu on right-click', async ({ page }) => {
    const ws = createTestWorkspace({
      'doc.md': '# Title\n## Sub',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await page.getByText('doc.md').first().click()

    const outline = page.locator('nav')
    const titleItem = outline.getByText('Title').first()
    await expect(titleItem).toBeVisible({ timeout: 10000 })

    // 右键点击
    await titleItem.click({ button: 'right' })

    // 上下文菜单应出现"复制锚点链接"
    await expect(page.getByText('Copy anchor link')).toBeVisible({ timeout: 3000 })

    // 点击菜单项
    await page.getByText('Copy anchor link').click()
    // 应出现反馈提示
    await expect(page.getByText('Anchor link copied')).toBeVisible({ timeout: 3000 })

    ws.cleanup()
  })
})
