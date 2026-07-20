import { test, expect } from '@playwright/test'
import { createTestWorkspace, launchApp, openWorkspace } from './utils'

/**
 * 批次 4 E2E：Workspace 初始化与多工作区
 *
 * 验证：
 * - 启动恢复持久化的 workspace + openFiles（来自 useWorkspaceStore.init）
 * - 无 workspace 时打开文件，自动以父目录初始化 workspace
 * - 通过命令面板将文件夹添加到当前工作区，FileTree 显示多根
 */
test.describe('Workspace Init', () => {
  test('startup restores workspace and open files from localStorage', async ({ page }) => {
    const ws = createTestWorkspace({
      'readme.md': '# Readme',
      'notes.md': '# Notes',
    })

    // 先正常打开 workspace（让 useWorkspaceStore.openFolder 写入 lastWorkspace/openFiles）
    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await expect(page.getByText('readme.md').first()).toBeVisible({ timeout: 10000 })

    // 点击 readme.md 打开标签，让 useTabStore.openFile 加入 openFiles
    await page.getByText('readme.md').first().click()
    await expect(page.getByRole('tab', { name: /readme\.md/ })).toBeVisible({ timeout: 10000 })

    // 注入新的 init script：在 launchApp 的 localStorage.clear() 之后恢复 lastWorkspace/openFiles
    // Playwright 的 addInitScript 按"添加顺序"执行，且每次 navigation 都会重新执行
    const readmePath = Object.keys(ws.fileContents).find((p) => p.endsWith('readme.md'))!
    await page.addInitScript(
      ({ dirPath, openFile }: { dirPath: string; openFile: string }) => {
        localStorage.setItem('lastWorkspace', JSON.stringify(dirPath))
        localStorage.setItem('openFiles', JSON.stringify([openFile]))
        localStorage.setItem('activeFile', JSON.stringify(openFile))
      },
      { dirPath: ws.dirPath, openFile: readmePath },
    )

    // 重新加载页面，验证 useWorkspaceStore.init 从 localStorage 恢复 workspace + openFiles
    await page.reload()
    await expect(page.getByText('readme.md').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('tab', { name: /readme\.md/ })).toBeVisible({ timeout: 10000 })

    ws.cleanup()
  })

  test('openFile without workspace uses parent directory as workspace', async ({ page }) => {
    const ws = createTestWorkspace({
      'doc.md': '# Doc',
    })

    await launchApp(page, ws)

    // 启动后无 workspace，应显示 WelcomePage
    await expect(page.getByRole('heading', { name: /Markdown-Viewer/i })).toBeVisible({
      timeout: 10000,
    })

    // 预设 dialog.openFile 返回文件路径，点击 "Open File" 按钮
    const filePath = Object.keys(ws.fileContents).find((p) => p.endsWith('doc.md'))!
    await page.evaluate((fp: string) => {
      window.__E2E__.dialogResult = fp
    }, filePath)

    await page.getByRole('button', { name: /Open File/i }).click()

    // 应自动以文件父目录初始化 workspace，并打开文件标签
    await expect(page.getByRole('tab', { name: /doc\.md/ })).toBeVisible({ timeout: 10000 })

    ws.cleanup()
  })

  test('addFolderToWorkspace adds second root to FileTree', async ({ page }) => {
    const ws1 = createTestWorkspace({
      'a.md': '# A',
    })
    const ws2 = createTestWorkspace({
      'b.md': '# B',
    })

    await launchApp(page, ws1)
    await openWorkspace(page, ws1.dirPath)
    await expect(page.getByText('a.md').first()).toBeVisible({ timeout: 10000 })

    // 预设 ws2 的 directoryTree 数据 + dialog.openDirectory 返回值
    await page.evaluate(
      ({ dirPath, entries }: { dirPath: string; entries: typeof ws2.entries }) => {
        window.__E2E__.directoryTree.set(dirPath, entries)
        window.__E2E__.dialogResult = dirPath
      },
      { dirPath: ws2.dirPath, entries: ws2.entries },
    )

    // 通过命令面板触发 "Add Folder to Workspace"
    await page.keyboard.press('Control+Shift+p')
    const input = page.locator('input[placeholder*="command" i]').first()
    await expect(input).toBeVisible({ timeout: 5000 })

    // 输入命令并执行（直接对 input 触发 Enter，确保事件发送到输入框）
    await input.fill('Add Folder to Workspace')
    await expect(
      page.getByRole('option', { name: /Add Folder to Workspace|添加文件夹到工作区/i }),
    ).toBeVisible({
      timeout: 5000,
    })
    await input.press('Enter')

    // FileTree 应显示两个根目录的文件（a.md 和 b.md）
    await expect(page.getByText('b.md').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('a.md').first()).toBeVisible({ timeout: 10000 })

    ws1.cleanup()
    ws2.cleanup()
  })
})
