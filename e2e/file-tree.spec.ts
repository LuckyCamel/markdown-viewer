import { test, expect } from '@playwright/test'
import { launchApp, createTestDir, writeFixture, openWorkspace } from './utils'

test.describe('File Tree', () => {
  test('should show .md files in the file tree when workspace is opened', async () => {
    const { electronApp, page, cleanup } = await launchApp()
    const dir = createTestDir()
    writeFixture(dir.path, 'readme.md', '# Readme')
    writeFixture(dir.path, 'guide.md', '# Guide')

    await openWorkspace(electronApp, page, dir.path)

    await expect(page.getByText('readme.md')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('guide.md')).toBeVisible()

    dir.cleanup()
    await cleanup()
  })

  test('should open a tab when clicking a .md file in the tree', async () => {
    const { electronApp, page, cleanup } = await launchApp()
    const dir = createTestDir()
    writeFixture(dir.path, 'test.md', '# Hello')

    await openWorkspace(electronApp, page, dir.path)

    await page.getByText('test.md').first().click()

    await expect(page.getByRole('tab', { name: /test\.md/ })).toBeVisible({ timeout: 10000 })

    dir.cleanup()
    await cleanup()
  })
})
