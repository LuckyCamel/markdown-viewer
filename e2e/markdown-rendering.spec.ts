import { test, expect } from '@playwright/test'
import { createTestWorkspace, launchApp, openWorkspace } from './utils'

test.describe('Markdown Rendering', () => {
  test('should render GFM tables', async ({ page }) => {
    const ws = createTestWorkspace({
      'test.md': '| Col1 | Col2 |\n|------|------|\n| A    | B    |',
    })
    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await page.getByText('test.md').first().click()
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('table')).toContainText('Col1')
    await expect(page.locator('table')).toContainText('A')
    ws.cleanup()
  })

  test('should render code blocks with syntax highlighting', async ({ page }) => {
    const ws = createTestWorkspace({
      'code.md': '```javascript\nconst x = 1;\n```',
    })
    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await page.getByText('code.md').first().click()
    await expect(page.locator('pre code')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('pre code')).toContainText('const x = 1')
    ws.cleanup()
  })

  test('should render math formulas', async ({ page }) => {
    const ws = createTestWorkspace({
      'math.md': 'Inline: $E = mc^2$',
    })
    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await page.getByText('math.md').first().click()
    await expect(page.locator('.katex')).toBeVisible({ timeout: 10000 })
    ws.cleanup()
  })

  test('should render mermaid diagrams', async ({ page }) => {
    const ws = createTestWorkspace({
      'mermaid.md': '```mermaid\ngraph TD\n    A[Start] --> B[End]\n```',
    })
    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await page.getByText('mermaid.md').first().click()
    await expect(page.locator('svg')).toBeVisible({ timeout: 15000 })
    ws.cleanup()
  })

  test('should render strikethrough and task lists', async ({ page }) => {
    const ws = createTestWorkspace({
      'tasks.md': '~~Strike~~\n\n- [ ] Todo\n- [x] Done',
    })
    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await page.getByText('tasks.md').first().click()
    await expect(page.locator('del')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('input[type="checkbox"]')).toHaveCount(2)
    ws.cleanup()
  })

  test('should render headings at all levels', async ({ page }) => {
    const ws = createTestWorkspace({
      'headings.md': '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6',
    })
    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await page.getByText('headings.md').first().click()
    await expect(page.locator('h1')).toContainText('H1')
    await expect(page.locator('h2')).toContainText('H2')
    await expect(page.locator('h3')).toContainText('H3')
    await expect(page.locator('h4')).toContainText('H4')
    await expect(page.locator('h5')).toContainText('H5')
    await expect(page.locator('h6')).toContainText('H6')
    ws.cleanup()
  })

  test('should render bold and italic', async ({ page }) => {
    const ws = createTestWorkspace({
      'format.md': '**bold** *italic* ***bold+italic***',
    })
    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await page.getByText('format.md').first().click()
    await expect(page.locator('strong')).toHaveCount(2)
    await expect(page.locator('em')).toHaveCount(2)
    ws.cleanup()
  })

  test('should render ordered and unordered lists', async ({ page }) => {
    const ws = createTestWorkspace({
      'lists.md': '- Item A\n- Item B\n\n1. First\n2. Second',
    })
    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await page.getByText('lists.md').first().click()
    await expect(page.locator('ul')).toBeVisible()
    await expect(page.locator('ul li')).toHaveCount(2)
    await expect(page.locator('ol')).toBeVisible()
    await expect(page.locator('ol li')).toHaveCount(2)
    ws.cleanup()
  })

  test('should render inline code', async ({ page }) => {
    const ws = createTestWorkspace({
      'inline-code.md': 'Use `code` inline',
    })
    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await page.getByText('inline-code.md').first().click()
    await expect(page.locator('p > code')).toContainText('code')
    ws.cleanup()
  })

  test('should render blockquotes', async ({ page }) => {
    const ws = createTestWorkspace({
      'quote.md': '> Blockquote text',
    })
    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await page.getByText('quote.md').first().click()
    await expect(page.locator('blockquote')).toContainText('Blockquote text')
    ws.cleanup()
  })

  test('should render horizontal rules', async ({ page }) => {
    const ws = createTestWorkspace({
      'hr.md': 'Above\n\n---\n\nBelow',
    })
    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await page.getByText('hr.md').first().click()
    await expect(page.locator('hr')).toBeVisible()
    ws.cleanup()
  })

  test('should render inline HTML with rehype-raw', async ({ page }) => {
    const ws = createTestWorkspace({
      'html.md': '<u>underline</u>\n<kbd>Ctrl+S</kbd>',
    })
    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await page.getByText('html.md').first().click()
    await expect(page.locator('u')).toContainText('underline')
    await expect(page.locator('kbd')).toContainText('Ctrl+S')
    ws.cleanup()
  })
})
