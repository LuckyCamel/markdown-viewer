import { test, expect } from '@playwright/test'
import { createTestWorkspace, launchApp, openWorkspace } from './utils'

test.describe('File Tree Lazy Loading UI', () => {
  test('should show empty directory hint when expanded dir has no children', async ({ page }) => {
    const ws = createTestWorkspace({
      'emptydir/.keep': '',
      'normal.md': '# Normal',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    // 展开空目录（只有 .keep 文件，但 .keep 是隐藏文件会被过滤）
    await page.getByText('emptydir').first().click()

    // 等待空目录提示出现
    await expect(page.getByTestId(`tree-empty-${ws.dirPath}/emptydir`)).toBeVisible({
      timeout: 5000,
    })
    await expect(page.getByTestId(`tree-empty-${ws.dirPath}/emptydir`)).toContainText('空目录')

    ws.cleanup()
  })

  test('should render children normally for non-empty directory', async ({ page }) => {
    const ws = createTestWorkspace({
      'sub/file1.md': '# File 1',
      'sub/file2.md': '# File 2',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    await page.getByText('sub').first().click()

    await expect(page.getByText('file1.md')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('file2.md')).toBeVisible()
    // 不应显示空目录提示
    await expect(page.getByTestId(`tree-empty-${ws.dirPath}/sub`)).toBeHidden()

    ws.cleanup()
  })
})
