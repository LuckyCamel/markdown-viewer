import { test, expect } from '@playwright/test'
import { createTestWorkspace, launchApp, openWorkspace } from './utils'

/**
 * 方向一·批次1.1 最近文件快速切换 E2E 测试
 *
 * 验证：
 * - Ctrl+E 打开最近文件面板
 * - 列表展示预置的最近文件
 * - 点击条目切换到对应文件
 */
test.describe('Recent Files Panel', () => {
  test('should open recent files panel with Ctrl+E', async ({ page }) => {
    const ws = createTestWorkspace({
      'a.md': '# A',
      'b.md': '# B',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    await page.keyboard.press('Control+e')

    // 面板标题可见
    await expect(page.getByText('Recent Files')).toBeVisible({ timeout: 5000 })

    ws.cleanup()
  })

  test('should list preset recent files and switch on click', async ({ page }) => {
    const ws = createTestWorkspace({
      'alpha.md': '# Alpha',
      'beta.md': '# Beta',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    // 预置 recentFiles 列表（顺序：beta 在前）
    const filePaths = Object.keys(ws.fileContents)
    const alphaPath = filePaths.find((p) => p.endsWith('alpha.md'))!
    const betaPath = filePaths.find((p) => p.endsWith('beta.md'))!
    await page.evaluate(
      ({ key, alpha, beta }) => {
        const entries = [
          { path: beta, name: 'beta.md', timestamp: Date.now() },
          { path: alpha, name: 'alpha.md', timestamp: Date.now() - 60000 },
        ]
        localStorage.setItem(key, JSON.stringify(entries))
      },
      { key: 'recentFiles', alpha: alphaPath, beta: betaPath },
    )

    // 打开面板（重新触发以加载最新数据）
    await page.keyboard.press('Control+e')
    await expect(page.getByText('Recent Files')).toBeVisible({ timeout: 5000 })

    // 第一项应为 beta.md（按时间倒序）
    const firstItem = page.locator('[role="option"]').first()
    await expect(firstItem).toContainText('beta.md', { timeout: 5000 })

    // 点击 alpha.md 切换
    await page.getByText('alpha.md').first().click()
    await expect(page.locator('h1').filter({ hasText: 'Alpha' })).toBeVisible({ timeout: 10000 })

    ws.cleanup()
  })

  test('should show empty hint when no recent files', async ({ page }) => {
    const ws = createTestWorkspace({
      'only.md': '# Only',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    await page.keyboard.press('Control+e')
    await expect(page.getByText('No recent files')).toBeVisible({ timeout: 5000 })

    ws.cleanup()
  })
})
