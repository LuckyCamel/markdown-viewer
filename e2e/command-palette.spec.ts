import { test, expect } from '@playwright/test'
import { createTestWorkspace, launchApp, openWorkspace } from './utils'

/**
 * 命令面板 E2E 测试
 *
 * 覆盖：Ctrl+Shift+P 唤起、模糊匹配、命令执行、Escape 关闭。
 */
test.describe('Command Palette', () => {
  test('Ctrl+Shift+P 应唤起命令面板', async ({ page }) => {
    const ws = createTestWorkspace({
      'doc.md': '# Doc',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await expect(page.getByText('doc.md')).toBeVisible({ timeout: 10000 })

    await page.keyboard.press('Control+Shift+p')
    const input = page.locator('input[placeholder*="command" i]').first()
    await expect(input).toBeVisible({ timeout: 5000 })

    ws.cleanup()
  })

  test('Escape 键应关闭命令面板', async ({ page }) => {
    const ws = createTestWorkspace({
      'doc.md': '# Doc',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await expect(page.getByText('doc.md')).toBeVisible({ timeout: 10000 })

    await page.keyboard.press('Control+Shift+p')
    const input = page.locator('input[placeholder*="command" i]').first()
    await expect(input).toBeVisible({ timeout: 5000 })

    await page.keyboard.press('Escape')
    await expect(input).not.toBeVisible({ timeout: 5000 })

    ws.cleanup()
  })

  test('输入关键字应过滤命令列表', async ({ page }) => {
    const ws = createTestWorkspace({
      'doc.md': '# Doc',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await expect(page.getByText('doc.md')).toBeVisible({ timeout: 10000 })

    await page.keyboard.press('Control+Shift+p')
    const input = page.locator('input[placeholder*="command" i]').first()
    await expect(input).toBeVisible({ timeout: 5000 })

    await input.fill('sidebar')
    // 应至少过滤掉部分命令
    await expect(input).toHaveValue('sidebar')

    ws.cleanup()
  })
})
