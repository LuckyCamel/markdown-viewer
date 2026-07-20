import { test, expect, type Dialog } from '@playwright/test'
import { createTestWorkspace, launchApp, openWorkspace } from './utils'

/**
 * FileSizeGuard E2E 测试
 *
 * 验证：
 * 1. 打开超阈值 Markdown 文件弹出 confirm 询问，取消则不打开
 * 2. 打开超阈值 Markdown 文件确认后正常打开
 * 3. 正常小文件无对话框直接打开
 * 4. 超阈值代码文件弹出 confirm
 *
 * 注：二进制文件场景由单元测试覆盖（文件树已过滤二进制文件，无法通过 UI 触发）
 */

test.describe('FileSizeGuard', () => {
  test('超大 Markdown 取消确认时不打开文件', async ({ page }) => {
    const ws = createTestWorkspace(
      {
        'big.md': '# Big',
        'normal.md': '# Normal',
      },
      // 6MB > 5MB Markdown 阈值
      { sizeOverride: { 'big.md': 6 * 1024 * 1024 } },
    )

    const dialogs: Dialog[] = []
    page.on('dialog', async (d) => {
      dialogs.push(d)
      // 取消确认
      await d.dismiss()
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    // 点击大文件，应弹出 confirm
    await page.getByText('big.md', { exact: true }).click()

    // 等待对话框出现
    await expect.poll(() => dialogs.length).toBe(1)
    expect(dialogs[0].type()).toBe('confirm')
    expect(await dialogs[0].message()).toContain('文件较大')
    expect(await dialogs[0].message()).toContain('big.md')

    // 取消后文件不应被打开（不应有 tab）
    await expect(page.getByRole('tab', { name: /big/i })).toBeHidden({ timeout: 2000 })

    ws.cleanup()
  })

  test('超大 Markdown 确认后正常打开', async ({ page }) => {
    const ws = createTestWorkspace(
      {
        'big.md': '# Big Content',
      },
      // 6MB > 5MB 阈值
      { sizeOverride: { 'big.md': 6 * 1024 * 1024 } },
    )

    page.on('dialog', async (d) => {
      await d.accept()
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    await page.getByText('big.md', { exact: true }).click()

    // 确认后应打开标签并渲染内容
    await expect(page.getByRole('tab', { name: /big/i })).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Big Content').first()).toBeVisible({ timeout: 5000 })

    ws.cleanup()
  })

  test('正常小文件直接打开无对话框', async ({ page }) => {
    const ws = createTestWorkspace({
      'small.md': '# Small File',
    })

    const dialogs: Dialog[] = []
    page.on('dialog', async (d) => {
      dialogs.push(d)
      await d.accept()
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    await page.getByText('small.md', { exact: true }).click()

    // 应打开 tab
    await expect(page.getByRole('tab', { name: /small/i })).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Small File').first()).toBeVisible({ timeout: 5000 })

    // 不应有任何对话框
    expect(dialogs.length).toBe(0)

    ws.cleanup()
  })

  test('超阈值代码文件弹出 confirm', async ({ page }) => {
    const ws = createTestWorkspace(
      {
        'large.ts': 'export const x = 1',
      },
      // 3MB > 2MB 文本阈值
      { sizeOverride: { 'large.ts': 3 * 1024 * 1024 } },
    )

    const dialogs: Dialog[] = []
    page.on('dialog', async (d) => {
      dialogs.push(d)
      await d.accept()
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    await page.getByText('large.ts', { exact: true }).click()

    await expect.poll(() => dialogs.length).toBe(1)
    expect(dialogs[0].type()).toBe('confirm')
    expect(await dialogs[0].message()).toContain('文件较大')

    ws.cleanup()
  })
})
