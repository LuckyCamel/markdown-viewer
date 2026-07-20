/**
 * Markdown 渲染性能度量脚本
 *
 * 度量 1000/5000/10000 行 Markdown 首屏渲染耗时。
 * 数据通过 mock IPC 注入，度量纯前端渲染性能（不含 Rust 读盘）。
 *
 * 运行：pnpm test:perf
 * 结果：追加到 .dev-process/20260720/15-scale-fluency/perf-baseline.md
 */

import { test, expect } from '@playwright/test'
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createTestWorkspace, launchApp, openWorkspace } from '../utils'
import { generateLargeMarkdown } from './fixtures/generate'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const RESULT_FILE = join(
  __dirname,
  '..',
  '..',
  '.dev-process',
  '20260720',
  '15-scale-fluency',
  'perf-baseline.md',
)

const TARGET_LINES = [1000, 5000, 10000]
const RUN_PER_CASE = 5

interface PerfResult {
  caseName: string
  lines: number
  runs: number[]
  median: number
  min: number
  max: number
}

/**
 * 计算中位数
 */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

test.describe.configure({ mode: 'serial' })

test.describe('Markdown Render Performance', () => {
  const results: PerfResult[] = []

  test.afterAll(() => {
    if (results.length === 0) return
    const sectionHeader = `## Markdown 渲染度量结果`
    const tableHeader = `\n| 用例 | 行数 | 中位数(ms) | 最小(ms) | 最大(ms) | 运行次数 |\n|------|------|-----------|---------|---------|----------|\n`
    const rows = results
      .map(
        (r) =>
          `| ${r.caseName} | ${r.lines} | ${r.median.toFixed(1)} | ${r.min.toFixed(1)} | ${r.max.toFixed(1)} | ${r.runs.length} |`,
      )
      .join('\n')

    const block = `\n${sectionHeader}\n${tableHeader}${rows}\n`

    if (!existsSync(RESULT_FILE)) {
      mkdirSync(dirname(RESULT_FILE), { recursive: true })
      writeFileSync(RESULT_FILE, `# 性能基线度量结果\n`)
    }

    let existing = readFileSync(RESULT_FILE, 'utf-8')
    // 覆盖同名 section（从 section 标题到下一个 ## 或文件末尾）
    const sectionRegex = new RegExp(
      `${sectionHeader.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?(?=\\n## |$)`,
    )
    if (sectionRegex.test(existing)) {
      existing = existing.replace(sectionRegex, block.trim())
      writeFileSync(RESULT_FILE, existing)
    } else {
      writeFileSync(RESULT_FILE, existing + block)
    }
  })

  for (const lines of TARGET_LINES) {
    test(`render ${lines}-line markdown`, async ({ page }) => {
      const content = generateLargeMarkdown(lines)
      const ws = createTestWorkspace({
        [`large-${lines}.md`]: content,
      })

      await launchApp(page, ws)
      await openWorkspace(page, ws.dirPath)

      // 等待文件树渲染完成
      await expect(page.getByText(`large-${lines}.md`).first()).toBeVisible({
        timeout: 10000,
      })

      const runs: number[] = []
      for (let i = 0; i < RUN_PER_CASE; i++) {
        // 点击前在浏览器内打点
        await page.evaluate(() => {
          const w = window as unknown as { __PERF_T0__?: number; performance: Performance }
          w.__PERF_T0__ = w.performance.now()
        })

        // 点击文件触发渲染
        await page.getByText(`large-${lines}.md`).first().click()

        // 等待 .prose 出现，且其内部 h2 数量 >= 1（表示渲染已开始）
        await page.waitForSelector('.prose h2', { timeout: 30000 })

        // 等待渲染稳定：连续 3 次 100ms 间隔查询 h2 数量不变
        let lastCount = -1
        let stable = false
        const deadline = Date.now() + 30000
        while (Date.now() < deadline && !stable) {
          const count = await page.evaluate(() => document.querySelectorAll('.prose h2').length)
          if (count === lastCount && count > 0) {
            stable = true
            break
          }
          lastCount = count
          await page.waitForTimeout(100)
        }

        // 记录结束时间
        const elapsed = await page.evaluate(() => {
          const w = window as unknown as { __PERF_T0__?: number; performance: Performance }
          if (typeof w.__PERF_T0__ !== 'number') return -1
          return w.performance.now() - w.__PERF_T0__
        })

        if (elapsed > 0) runs.push(elapsed)

        // 切回 welcome/空状态：关闭标签，便于下次点击触发完整渲染
        await page.keyboard.press('Escape').catch(() => {})
        // 关闭当前标签（若有关闭按钮）
        const closeBtn = page.locator('[role="tab"][aria-selected="true"] button').first()
        if (await closeBtn.count().catch(() => 0)) {
          await closeBtn.click().catch(() => {})
          await page.waitForTimeout(200)
        }
      }

      expect(runs.length).toBeGreaterThan(0)
      const result: PerfResult = {
        caseName: `large-${lines}.md`,
        lines,
        runs,
        median: median(runs),
        min: Math.min(...runs),
        max: Math.max(...runs),
      }
      results.push(result)

      console.log(
        `[perf] ${lines} 行 MD：中位数 ${result.median.toFixed(1)}ms（min=${result.min.toFixed(1)} max=${result.max.toFixed(1)} n=${runs.length}）`,
      )

      ws.cleanup()
    })
  }
})
