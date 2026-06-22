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

  test('should render headings at all levels', async () => {
    const { electronApp, page, cleanup } = await launchApp()
    const dir = createTestDir()
    writeFixture(
      dir.path,
      'headings.md',
      '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6',
    )
    await openWorkspace(electronApp, page, dir.path)
    await page.getByText('headings.md').first().click()
    await expect(page.locator('h1')).toContainText('H1')
    await expect(page.locator('h2')).toContainText('H2')
    await expect(page.locator('h3')).toContainText('H3')
    await expect(page.locator('h4')).toContainText('H4')
    await expect(page.locator('h5')).toContainText('H5')
    await expect(page.locator('h6')).toContainText('H6')
    dir.cleanup()
    await cleanup()
  })

  test('should render bold and italic', async () => {
    const { electronApp, page, cleanup } = await launchApp()
    const dir = createTestDir()
    writeFixture(dir.path, 'format.md', '**bold** *italic* ***bold+italic***')
    await openWorkspace(electronApp, page, dir.path)
    await page.getByText('format.md').first().click()
    await expect(page.locator('strong')).toHaveCount(2)
    await expect(page.locator('em')).toHaveCount(2)
    dir.cleanup()
    await cleanup()
  })

  test('should render ordered and unordered lists', async () => {
    const { electronApp, page, cleanup } = await launchApp()
    const dir = createTestDir()
    writeFixture(
      dir.path,
      'lists.md',
      '- Item A\n- Item B\n\n1. First\n2. Second',
    )
    await openWorkspace(electronApp, page, dir.path)
    await page.getByText('lists.md').first().click()
    await expect(page.locator('ul')).toBeVisible()
    await expect(page.locator('ul li')).toHaveCount(2)
    await expect(page.locator('ol')).toBeVisible()
    await expect(page.locator('ol li')).toHaveCount(2)
    dir.cleanup()
    await cleanup()
  })

  test('should render inline code', async () => {
    const { electronApp, page, cleanup } = await launchApp()
    const dir = createTestDir()
    writeFixture(dir.path, 'inline-code.md', 'Use `code` inline')
    await openWorkspace(electronApp, page, dir.path)
    await page.getByText('inline-code.md').first().click()
    await expect(page.locator('p > code')).toContainText('code')
    dir.cleanup()
    await cleanup()
  })

  test('should render blockquotes', async () => {
    const { electronApp, page, cleanup } = await launchApp()
    const dir = createTestDir()
    writeFixture(dir.path, 'quote.md', '> Blockquote text')
    await openWorkspace(electronApp, page, dir.path)
    await page.getByText('quote.md').first().click()
    await expect(page.locator('blockquote')).toContainText('Blockquote text')
    dir.cleanup()
    await cleanup()
  })

  test('should render horizontal rules', async () => {
    const { electronApp, page, cleanup } = await launchApp()
    const dir = createTestDir()
    writeFixture(dir.path, 'hr.md', 'Above\n\n---\n\nBelow')
    await openWorkspace(electronApp, page, dir.path)
    await page.getByText('hr.md').first().click()
    await expect(page.locator('hr')).toBeVisible()
    dir.cleanup()
    await cleanup()
  })

  test('should render inline HTML with rehype-raw', async () => {
    const { electronApp, page, cleanup } = await launchApp()
    const dir = createTestDir()
    writeFixture(dir.path, 'html.md', '<u>underline</u>\n<kbd>Ctrl+S</kbd>')
    await openWorkspace(electronApp, page, dir.path)
    await page.getByText('html.md').first().click()
    await expect(page.locator('u')).toContainText('underline')
    await expect(page.locator('kbd')).toContainText('Ctrl+S')
    dir.cleanup()
    await cleanup()
  })
})
