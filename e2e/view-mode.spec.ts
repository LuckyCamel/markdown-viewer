import { test, expect } from '@playwright/test'
import { createTestWorkspace, launchApp, openWorkspace } from './utils'

/**
 * 阶段一功能验证：编辑可发现性 & 按标签视图 & 统一动作分发
 *
 * 验证内容：
 * 1. TabBar 显示阅读/编辑按钮，点击可切换视图模式
 * 2. 多标签视图模式独立，切换标签时保持各自模式
 * 3. 快捷键 Ctrl+Shift+S 切换视图模式（与按钮行为一致）
 */
test.describe('View Mode & Edit Discoverability', () => {
  test('TabBar shows Read/Edit buttons and toggles view mode', async ({ page }) => {
    const ws = createTestWorkspace({
      'hello.md': '# Hello World\n\nThis is a test.',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    await page.getByText('hello.md').first().click()
    const tab = page.getByRole('tab', { name: /hello\.md/ })
    await expect(tab).toBeVisible({ timeout: 10000 })

    // 验证阅读/编辑按钮存在（通过 title 属性或 aria-label）
    const readBtn = page.getByTitle(/阅读视图|Read view/i)
    const editBtn = page.getByTitle(/编辑视图|Edit view/i)
    await expect(readBtn).toBeVisible()
    await expect(editBtn).toBeVisible()

    // 默认是阅读模式（Markdown 渲染，有 prose class）
    const proseContent = page.locator('.prose')
    await expect(proseContent).toBeVisible({ timeout: 10000 })

    // 点击编辑按钮，切换到编辑模式
    await editBtn.click()

    // 验证 CodeMirror 编辑器出现
    const editor = page.locator('.cm-editor')
    await expect(editor).toBeVisible({ timeout: 5000 })

    // 点击阅读按钮，切换回阅读模式
    await readBtn.click()
    await expect(proseContent).toBeVisible()

    ws.cleanup()
  })

  test('view mode is per-tab, switching tabs preserves each mode', async ({ page }) => {
    const ws = createTestWorkspace({
      'readme.md': '# README\n\nFor reading.',
      'draft.md': '# Draft\n\nFor editing.',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    // 打开两个文件
    await page.getByText('readme.md').first().click()
    const tabReadme = page.getByRole('tab', { name: /readme\.md/ })
    await expect(tabReadme).toBeVisible({ timeout: 10000 })

    await page.getByText('draft.md').first().click()
    const tabDraft = page.getByRole('tab', { name: /draft\.md/ })
    await expect(tabDraft).toBeVisible()

    // 在 draft.md 切换到编辑模式
    const editBtn = page.getByTitle(/编辑视图|Edit view/i)
    await editBtn.click()
    const editor = page.locator('.cm-editor')
    await expect(editor).toBeVisible({ timeout: 5000 })

    // 切回 readme.md，应该仍是阅读模式
    await tabReadme.click()
    const proseContent = page.locator('.prose')
    await expect(proseContent).toBeVisible()

    // 再切回 draft.md，应该仍是编辑模式
    await tabDraft.click()
    await expect(editor).toBeVisible()

    ws.cleanup()
  })

  test('keyboard shortcut toggles view mode (same as button)', async ({ page }) => {
    const ws = createTestWorkspace({
      'note.md': '# Note\n\nShortcut test.',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    await page.getByText('note.md').first().click()
    const tab = page.getByRole('tab', { name: /note\.md/ })
    await expect(tab).toBeVisible({ timeout: 10000 })

    // 默认阅读模式
    const proseContent = page.locator('.prose')
    await expect(proseContent).toBeVisible()

    // 用快捷键切换到编辑模式（Ctrl+Shift+S）
    await page.keyboard.press('Control+Shift+s')

    // 验证切换到编辑器
    const editor = page.locator('.cm-editor')
    await expect(editor).toBeVisible({ timeout: 5000 })

    // 再按一次切回阅读模式
    await page.keyboard.press('Control+Shift+s')
    await expect(proseContent).toBeVisible()

    ws.cleanup()
  })
})
