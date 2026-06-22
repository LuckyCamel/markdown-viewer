import { test, expect } from '@playwright/test'
import { launchApp, createTestDir, writeFixture, openWorkspace } from './utils'

test.describe('Markdown Rendering', () => {
  test('should render GFM tables', async () => {
    const { electronApp, page, cleanup } = await launchApp()
    const dir = createTestDir()
    writeFixture(dir.path, 'test.md', '| Col1 | Col2 |\n|------|------|\n| A    | B    |')
    await openWorkspace(electronApp, page, dir.path)
    await page.getByText('test.md').first().click()
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('table')).toContainText('Col1')
    await expect(page.locator('table')).toContainText('A')
    dir.cleanup()
    await cleanup()
  })

  test('should render code blocks with syntax highlighting', async () => {
    const { electronApp, page, cleanup } = await launchApp()
    const dir = createTestDir()
    writeFixture(dir.path, 'code.md', '```javascript\nconst x = 1;\n```')
    await openWorkspace(electronApp, page, dir.path)
    await page.getByText('code.md').first().click()
    await expect(page.locator('pre code')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('pre code')).toContainText('const x = 1')
    dir.cleanup()
    await cleanup()
  })

  test('should render math formulas', async () => {
    const { electronApp, page, cleanup } = await launchApp()
    const dir = createTestDir()
    writeFixture(dir.path, 'math.md', 'Inline: $E = mc^2$')
    await openWorkspace(electronApp, page, dir.path)
    await page.getByText('math.md').first().click()
    await expect(page.locator('.katex')).toBeVisible({ timeout: 10000 })
    dir.cleanup()
    await cleanup()
  })

  test('should render mermaid diagrams', async () => {
    const { electronApp, page, cleanup } = await launchApp()
    const dir = createTestDir()
    writeFixture(dir.path, 'mermaid.md', '```mermaid\ngraph TD\n    A[Start] --> B[End]\n```')
    await openWorkspace(electronApp, page, dir.path)
    await page.getByText('mermaid.md').first().click()
    await expect(page.locator('svg')).toBeVisible({ timeout: 15000 })
    dir.cleanup()
    await cleanup()
  })

  test('should render strikethrough and task lists', async () => {
    const { electronApp, page, cleanup } = await launchApp()
    const dir = createTestDir()
    writeFixture(dir.path, 'tasks.md', '~~Strike~~\n\n- [ ] Todo\n- [x] Done')
    await openWorkspace(electronApp, page, dir.path)
    await page.getByText('tasks.md').first().click()
    await expect(page.locator('del')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('input[type="checkbox"]')).toHaveCount(2)
    dir.cleanup()
    await cleanup()
  })
})
