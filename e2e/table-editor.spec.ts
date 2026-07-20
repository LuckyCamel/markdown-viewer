import { test, expect } from '@playwright/test'
import { createTestWorkspace, launchApp, openWorkspace } from './utils'

/**
 * 表格编辑器 E2E 测试
 *
 * 覆盖：工具栏弹窗插入、Tab 跳转与扩行、Enter 新增行、Backspace 删除空行。
 */
test.describe('Table Editor', () => {
  /**
   * 辅助函数：打开文件并切换到编辑模式，聚焦编辑器末尾
   */
  async function openFileInEditMode(page: import('@playwright/test').Page, fileName: string) {
    await page.getByText(fileName).first().click()
    await expect(
      page.getByRole('tab', { name: new RegExp(fileName.replace('.', '\\.')) }),
    ).toBeVisible({
      timeout: 10000,
    })

    await page.getByTitle(/编辑视图|Edit view/i).click()
    await expect(page.locator('.cm-editor')).toBeVisible({ timeout: 5000 })

    await page.locator('.cm-content').click()
    await page.keyboard.press('End')
  }

  /**
   * 辅助函数：通过工具栏弹窗插入指定大小的表格
   */
  async function insertTableViaToolbar(
    page: import('@playwright/test').Page,
    rows: number,
    cols: number,
  ) {
    await page.getByTitle('Table').click()

    const dialog = page.getByRole('dialog', { name: '插入表格' })
    await expect(dialog).toBeVisible({ timeout: 5000 })

    const rowsInput = dialog.locator('#table-rows')
    const colsInput = dialog.locator('#table-cols')

    await rowsInput.fill(rows.toString())
    await colsInput.fill(cols.toString())

    await dialog.getByRole('button', { name: '确认' }).click()
    await expect(dialog).not.toBeVisible({ timeout: 5000 })
  }

  test('工具栏插入 4×4 表格', async ({ page }) => {
    const ws = createTestWorkspace({
      'note.md': '# Note',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await openFileInEditMode(page, 'note.md')

    await insertTableViaToolbar(page, 4, 4)

    const content = await page.locator('.cm-content').textContent()
    expect(content).toContain('Column 1')
    expect(content).toContain('Column 4')
    // 表头 + 分隔线 + 4 行数据
    const tableRows = await page.locator('.cm-line').count()
    expect(tableRows).toBeGreaterThanOrEqual(6)

    ws.cleanup()
  })

  test('Tab 在单元格间跳转并在末尾新增行', async ({ page }) => {
    const ws = createTestWorkspace({
      'note.md': '# Note',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await openFileInEditMode(page, 'note.md')

    // 插入 1 行数据，便于 Tab 走到末尾后扩行
    await insertTableViaToolbar(page, 1, 2)

    // 默认在 Column 1，按 Tab 跳到 Column 2
    await page.keyboard.press('Tab')
    await page.waitForTimeout(200)

    // 再按 Tab 跳到第一行数据首单元格
    await page.keyboard.press('Tab')
    await page.waitForTimeout(200)

    // 输入标记以验证位置
    await page.keyboard.type('row1col1')
    let content = await page.locator('.cm-content').textContent()
    expect(content).toContain('row1col1')

    // 跳到第一行第二个单元格并输入
    await page.keyboard.press('Tab')
    await page.waitForTimeout(200)
    await page.keyboard.type('row1col2')
    content = await page.locator('.cm-content').textContent()
    expect(content).toContain('row1col2')

    // 再次 Tab，到表格末尾应自动新增一行
    await page.keyboard.press('Tab')
    await page.waitForTimeout(200)

    // 新增一行后应包含两个数据行（不含表头）
    const dataRows =
      (await page
        .locator('.cm-line')
        .filter({ hasText: /^\|.*\|.*\|$/ })
        .count()) - 2
    expect(dataRows).toBe(2)

    ws.cleanup()
  })

  test('Enter 在当前行下方新增行', async ({ page }) => {
    const ws = createTestWorkspace({
      'note.md': '# Note',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await openFileInEditMode(page, 'note.md')

    // 插入 1 行数据，按 Enter 后应变为 2 行
    await insertTableViaToolbar(page, 1, 2)

    // 跳到第一行数据（默认在表头 Column 1，按两次 Tab 到第一行首单元格）
    await page.keyboard.press('Tab')
    await page.waitForTimeout(100)
    await page.keyboard.press('Tab')
    await page.waitForTimeout(100)
    await page.keyboard.type('data1')

    // 在当前行下方新增一行
    await page.keyboard.press('Enter')
    await page.waitForTimeout(200)

    const content = await page.locator('.cm-content').textContent()
    expect(content).toContain('data1')
    // 数据行数量应增加为 2
    const dataRows =
      (await page
        .locator('.cm-line')
        .filter({ hasText: /^\|.*\|.*\|$/ })
        .count()) - 2
    expect(dataRows).toBe(2)

    ws.cleanup()
  })

  test('Backspace 删除空数据行', async ({ page }) => {
    const ws = createTestWorkspace({
      'note.md': '# Note',
    })

    await launchApp(page, ws)
    await openWorkspace(page, ws.dirPath)
    await openFileInEditMode(page, 'note.md')

    // 插入 1 行数据的表格
    await insertTableViaToolbar(page, 1, 2)

    // 跳到第一行数据首单元格
    await page.keyboard.press('Tab')
    await page.waitForTimeout(100)
    await page.keyboard.press('Tab')
    await page.waitForTimeout(100)

    // 确保当前数据行为空，按 Backspace 删除
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(200)

    const content = await page.locator('.cm-content').textContent()
    // 删除整表后不应再包含表格分隔线
    expect(content).not.toContain('|---')

    ws.cleanup()
  })
})
