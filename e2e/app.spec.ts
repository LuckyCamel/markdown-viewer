import { test, expect } from '@playwright/test'
import { launchApp } from './utils'

test.describe('Application launch', () => {
  test('should display main window with correct title', async () => {
    const { page, cleanup } = await launchApp()
    await expect(page).toHaveTitle(/Markdown Viewer/)
    await cleanup()
  })

  test('should show welcome page when no workspace is open', async () => {
    const { page, cleanup } = await launchApp()
    await expect(page.getByText(/打开文件夹|Open Folder/i).first()).toBeVisible({ timeout: 10000 })
    await cleanup()
  })

  test('should display welcome page content', async () => {
    const { page, cleanup } = await launchApp()
    await expect(page.getByRole('heading', { name: /Markdown Viewer/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /Open Folder/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Open File/i })).toBeVisible()
    await cleanup()
  })
})
