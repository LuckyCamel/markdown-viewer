import { test, expect } from '@playwright/test'
import { launchApp } from './utils'

test.describe('Welcome Page', () => {
  test('should display value proposition', async ({ page }) => {
    await launchApp(page)
    await expect(page.getByText('打开文件夹就能流畅读、偶尔改')).toBeVisible({ timeout: 10000 })
  })

  test('should display application name', async ({ page }) => {
    await launchApp(page)
    await expect(page.getByRole('heading', { name: 'Markdown-Viewer' })).toBeVisible({ timeout: 10000 })
  })

  test('should have Open Folder button', async ({ page }) => {
    await launchApp(page)
    await expect(page.getByRole('button', { name: /Open Folder/i })).toBeVisible()
  })

  test('should have Open File button', async ({ page }) => {
    await launchApp(page)
    await expect(page.getByRole('button', { name: /Open File/i })).toBeVisible()
  })
})
