import { test, expect } from '@playwright/test'
import { createTestWorkspace, launchApp, openWorkspace } from './utils'

/**
 * 编辑会话合并：外部变更冲突 E2E 测试
 *
 * 验证内容：
 * 1. 编辑中外部修改文件 → 显示冲突横幅
 * 2. 点击「加载磁盘版本」→ 内容更新，冲突消失
 * 3. 点击「保留我的版本」→ 保存覆盖，冲突消失
 */
test.describe('Editor External Change Conflict', () => {
  test('external file change during editing shows conflict banner', async ({ page }) => {
    const ws = createTestWorkspace({
      'note.md': '# Original\n\nThis is the original content.',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    await page.getByText('note.md').first().click()
    const tab = page.getByRole('tab', { name: /note\.md/ })
    await expect(tab).toBeVisible({ timeout: 10000 })

    // 切换到编辑模式
    const editBtn = page.getByTitle(/编辑视图|Edit view/i)
    await editBtn.click()
    const editor = page.locator('.cm-editor')
    await expect(editor).toBeVisible({ timeout: 5000 })

    // 验证初始没有冲突横幅
    const conflictBanner = page.getByText('文件已被外部修改')
    await expect(conflictBanner).not.toBeVisible()

    // 先输入一些内容，使状态变为 dirty
    await page.locator('.cm-content').click()
    await page.keyboard.press('End')
    await page.keyboard.type('\n\nMy edit.')

    // 等待一下，确保状态变更
    await page.waitForTimeout(500)

    // 模拟外部修改文件
    await page.evaluate(
      ({ filePath, newContent }) => {
        // 更新 mock 文件内容
        window.__E2E__.files.set(filePath, newContent)
        // 触发所有文件变更回调
        for (const cb of window.__E2E__.fileChangeCallbacks) {
          cb({ path: filePath, type: 'change' }, newContent)
        }
      },
      {
        filePath: ws.dirPath + '/note.md',
        newContent: '# Updated by External\n\nThis content was changed externally.',
      },
    )

    // 验证冲突横幅出现
    await expect(conflictBanner).toBeVisible({ timeout: 5000 })

    ws.cleanup()
  })

  test('clicking "Load Disk" updates content and dismisses conflict', async ({ page }) => {
    const ws = createTestWorkspace({
      'note.md': '# Original\n\nOriginal content here.',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    await page.getByText('note.md').first().click()
    const tab = page.getByRole('tab', { name: /note\.md/ })
    await expect(tab).toBeVisible({ timeout: 10000 })

    // 切换到编辑模式
    const editBtn = page.getByTitle(/编辑视图|Edit view/i)
    await editBtn.click()
    const editor = page.locator('.cm-editor')
    await expect(editor).toBeVisible({ timeout: 5000 })

    // 先输入一些内容，使状态变为 dirty
    await page.locator('.cm-content').click()
    await page.keyboard.press('End')
    await page.keyboard.type('\n\nMy edit.')
    await page.waitForTimeout(500)

    // 模拟外部修改
    await page.evaluate(
      ({ filePath, newContent }) => {
        window.__E2E__.files.set(filePath, newContent)
        for (const cb of window.__E2E__.fileChangeCallbacks) {
          cb({ path: filePath, type: 'change' }, newContent)
        }
      },
      {
        filePath: ws.dirPath + '/note.md',
        newContent: '# External Update\n\nExternal content.',
      },
    )

    // 等待冲突横幅出现
    const conflictBanner = page.getByText('文件已被外部修改')
    await expect(conflictBanner).toBeVisible({ timeout: 5000 })

    // 点击「加载磁盘版本」
    const loadDiskBtn = page.getByRole('button', { name: /加载磁盘|Load Disk/i })
    await loadDiskBtn.click()

    // 验证冲突横幅消失
    await expect(conflictBanner).not.toBeVisible({ timeout: 5000 })

    ws.cleanup()
  })

  test('clicking "Keep Mine" saves and dismisses conflict', async ({ page }) => {
    const ws = createTestWorkspace({
      'note.md': '# Original\n\nOriginal content.',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    await page.getByText('note.md').first().click()
    const tab = page.getByRole('tab', { name: /note\.md/ })
    await expect(tab).toBeVisible({ timeout: 10000 })

    // 切换到编辑模式
    const editBtn = page.getByTitle(/编辑视图|Edit view/i)
    await editBtn.click()
    const editor = page.locator('.cm-editor')
    await expect(editor).toBeVisible({ timeout: 5000 })

    // 先输入一些内容，使状态变为 dirty
    await page.locator('.cm-content').click()
    await page.keyboard.press('End')
    await page.keyboard.type('\n\nMy edit.')
    await page.waitForTimeout(500)

    // 模拟外部修改
    await page.evaluate(
      ({ filePath, newContent }) => {
        window.__E2E__.files.set(filePath, newContent)
        for (const cb of window.__E2E__.fileChangeCallbacks) {
          cb({ path: filePath, type: 'change' }, newContent)
        }
      },
      {
        filePath: ws.dirPath + '/note.md',
        newContent: '# External\n\nExternal change.',
      },
    )

    // 等待冲突横幅出现
    const conflictBanner = page.getByText('文件已被外部修改')
    await expect(conflictBanner).toBeVisible({ timeout: 5000 })

    // 点击「保留我的版本」
    const keepMineBtn = page.getByRole('button', { name: /保留我的|Keep Mine/i })
    await keepMineBtn.click()

    // 验证冲突横幅消失
    await expect(conflictBanner).not.toBeVisible({ timeout: 5000 })

    ws.cleanup()
  })
})
