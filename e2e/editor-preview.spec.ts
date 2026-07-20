import { test, expect } from '@playwright/test'
import { createTestWorkspace, launchApp, openWorkspace } from './utils'

test.describe('Editor Preview Panel', () => {
  test('toggle preview command works in edit mode', async ({ page }) => {
    const ws = createTestWorkspace({
      'note.md': '# Note\n\nContent here.',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    await page.getByText('note.md').first().click()
    await page.waitForSelector('.prose', { timeout: 5000 })

    const editBtn = page.getByTitle(/编辑视图|Edit view/i)
    await editBtn.click()

    await page.waitForSelector('.cm-editor', { timeout: 5000 })

    await page.keyboard.press('Control+Shift+p')
    const commandInput = page.locator('input[placeholder*="command" i]').first()
    await expect(commandInput).toBeVisible({ timeout: 5000 })

    await commandInput.fill('Toggle Preview')

    const commandItem = page.getByText('切换编辑预览面板')
    await expect(commandItem).toBeVisible({ timeout: 5000 })
    await commandItem.click()

    const previewPanel = page.locator('.border-l').first()
    await expect(previewPanel).toBeVisible({ timeout: 5000 })

    ws.cleanup()
  })

  test('toggle preview command is available in edit mode', async ({ page }) => {
    const ws = createTestWorkspace({
      'test.md': '# Heading\n\n**bold** text',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    await page.getByText('test.md').first().click()
    await page.waitForSelector('.prose', { timeout: 5000 })

    const editBtn = page.getByTitle(/编辑视图|Edit view/i)
    await editBtn.click()
    await page.waitForSelector('.cm-editor', { timeout: 5000 })

    await page.keyboard.press('Control+Shift+p')
    const commandInput = page.locator('input[placeholder*="command" i]').first()
    await expect(commandInput).toBeVisible({ timeout: 5000 })

    await commandInput.fill('Toggle Preview')

    const commandItem = page.getByText('切换编辑预览面板')
    await expect(commandItem).toBeVisible({ timeout: 5000 })

    ws.cleanup()
  })

  test('toggle preview command executes without error', async ({ page }) => {
    const ws = createTestWorkspace({
      'note.md': '# Note\n\nContent.',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)

    await page.getByText('note.md').first().click()
    await page.waitForSelector('.prose', { timeout: 5000 })

    const editBtn = page.getByTitle(/编辑视图|Edit view/i)
    await editBtn.click()
    await page.waitForSelector('.cm-editor', { timeout: 5000 })

    await page.keyboard.press('Control+Shift+p')
    const commandInput = page.locator('input[placeholder*="command" i]').first()
    await expect(commandInput).toBeVisible({ timeout: 5000 })

    await commandInput.fill('Toggle Preview')
    const commandItem = page.getByText('切换编辑预览面板')
    await expect(commandItem).toBeVisible({ timeout: 5000 })
    await commandItem.click()

    await page.waitForTimeout(500)

    ws.cleanup()
  })
})