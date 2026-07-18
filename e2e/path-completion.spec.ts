import { test, expect } from '@playwright/test'
import { createTestWorkspace, launchApp, openWorkspace } from './utils'

/**
 * 路径补全 E2E 测试
 *
 * 逐个场景验证：
 * 1. [[ 触发 wiki 链接补全
 * 2. ./ 触发相对路径补全
 * 3. ![]( 触发图片补全
 * 4. 选择候选项后正确插入文本
 */

test.describe('Path Completion', () => {
  /**
   * 辅助函数：打开文件并切换到编辑模式
   */
  async function openFileInEditMode(page: import('@playwright/test').Page, fileName: string) {
    await page.getByText(fileName).first().click()
    await expect(page.getByRole('tab', { name: new RegExp(fileName.replace('.', '\\.')) })).toBeVisible({
      timeout: 10000,
    })

    await page.getByTitle(/编辑视图|Edit view/i).click()
    await expect(page.locator('.cm-editor')).toBeVisible({ timeout: 5000 })

    await page.locator('.cm-content').click()
    await page.keyboard.press('End')
  }

  test('typing [[ shows path completion list', async ({ page }) => {
    const ws = createTestWorkspace({
      'intro.md': '# Intro\n\nWelcome.',
      'api.md': '# API\n\nAPI docs.',
      'guide.md': '# Guide\n\nGuide content.',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await openFileInEditMode(page, 'intro.md')

    // 输入 [[
    await page.keyboard.type('\n\n[[')

    // 验证补全列表出现
    const completionList = page.locator('.cm-tooltip-autocomplete')
    await expect(completionList).toBeVisible({ timeout: 5000 })

    // 验证列表中包含其他 md 文件
    await expect(
      page.locator('.cm-completionLabel', { hasText: 'api.md' }).first(),
    ).toBeVisible({ timeout: 3000 })

    ws.cleanup()
  })

  test('typing ./ shows path completion', async ({ page }) => {
    const ws = createTestWorkspace({
      'note.md': '# Note\n\nContent.',
      'other.md': '# Other\n\nOther content.',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await openFileInEditMode(page, 'note.md')

    // 输入 ./
    await page.keyboard.type('\n\n./')

    // 验证补全列表出现
    const completionList = page.locator('.cm-tooltip-autocomplete')
    await expect(completionList).toBeVisible({ timeout: 5000 })

    // 验证列表中包含 other.md
    await expect(
      page.locator('.cm-completionLabel', { hasText: 'other.md' }).first(),
    ).toBeVisible({ timeout: 3000 })

    ws.cleanup()
  })

  test('typing ![]( shows image file completion', async ({ page }) => {
    const ws = createTestWorkspace({
      'note.md': '# Note\n\nContent.',
      'diagram.png': 'fake image content',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await openFileInEditMode(page, 'note.md')

    // 输入 ![](
    await page.keyboard.type('\n\n![](')

    // 验证补全列表出现
    const completionList = page.locator('.cm-tooltip-autocomplete')
    await expect(completionList).toBeVisible({ timeout: 5000 })

    // 验证列表中包含图片文件
    await expect(
      page.locator('.cm-completionLabel', { hasText: 'diagram.png' }).first(),
    ).toBeVisible({ timeout: 3000 })

    ws.cleanup()
  })

  test('selecting a file from [[ completion inserts link', async ({ page }) => {
    const ws = createTestWorkspace({
      'intro.md': '# Intro\n\nWelcome.',
      'api.md': '# API\n\nAPI docs.',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await openFileInEditMode(page, 'intro.md')

    // 输入 [[
    await page.keyboard.type('\n\n[[')

    // 等待补全列表
    const completionList = page.locator('.cm-tooltip-autocomplete')
    await expect(completionList).toBeVisible({ timeout: 5000 })

    // 点击补全列表中的第一个候选项
    const firstOption = page.locator('.cm-completionLabel').first()
    await firstOption.click()
    await page.waitForTimeout(500)

    // 验证插入的文本包含 markdown 链接格式
    const editorContent = await page.locator('.cm-content').textContent()
    expect(editorContent).toContain('[api](')
    expect(editorContent).toContain('api.md)')

    ws.cleanup()
  })
})
