/**
 * 文件树性能度量脚本
 *
 * 度量：
 * - 1000/5000 文件扁平目录的根 list + 渲染耗时
 * - 100 文件子目录展开耗时
 *
 * 数据通过 mock IPC 注入，度量纯前端渲染性能（不含 Rust list）。
 *
 * 运行：pnpm test:perf
 * 结果：追加到 .dev-process/20260720/15-scale-fluency/perf-baseline.md
 */

import { test, expect } from '@playwright/test'
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { generateFlatDirectoryEntries } from './fixtures/generate'
import type { FileEntry } from '../../src/shared/types'

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

const ROOT_FILE_COUNTS = [1000, 5000]
const SUBDIR_FILE_COUNT = 100
const RUN_PER_CASE = 5

interface PerfResult {
  caseName: string
  metric: string
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

/**
 * 构造 perf 工作区数据
 */
function createPerfWorkspace(rootFileCount: number): {
  dirPath: string
  subdirPath: string
  rootEntries: FileEntry[]
  subdirEntries: FileEntry[]
  cleanup: () => void
} {
  const tmpDir = mkdtempSync(join(tmpdir(), 'mde2eperf-'))
  const dirPath = tmpDir.replace(/\\/g, '/')
  const subdirName = 'subdir-100'
  const subdirPath = `${dirPath}/${subdirName}`

  const rootEntries: FileEntry[] = [
    ...generateFlatDirectoryEntries(dirPath, rootFileCount),
    {
      name: subdirName,
      path: subdirPath,
      isDirectory: true,
      isHidden: false,
    },
  ]
  const subdirEntries = generateFlatDirectoryEntries(subdirPath, SUBDIR_FILE_COUNT)

  return {
    dirPath,
    subdirPath,
    rootEntries,
    subdirEntries,
    cleanup: () => rmSync(tmpDir, { recursive: true, force: true }),
  }
}

/**
 * 拦截 ipc.ts → ipc.mock.ts 并注入 mock 工作区数据
 */
async function launchPerfApp(
  page: import('@playwright/test').Page,
  ws: ReturnType<typeof createPerfWorkspace>,
): Promise<void> {
  await page.route('**/lib/ipc.ts', async (route) => {
    const url = route.request().url()
    const mockUrl = url.replace('/ipc.ts', '/ipc.mock.ts')
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: await (await fetch(mockUrl)).text(),
    })
  })

  await page.addInitScript(
    ({ dirPath, subdirPath, rootEntries, subdirEntries }) => {
      localStorage.clear()
      localStorage.setItem('locale', 'en-US')
      window.__E2E__ = {
        files: new Map(),
        directoryTree: new Map([
          [dirPath, rootEntries],
          [subdirPath, subdirEntries],
        ]),
        dialogResult: dirPath,
        openExternalCalls: [],
        revealPathCalls: [],
        searchResults: null,
        fileChangeListeners: new Map(),
        searchResultListeners: new Set(),
        fileChangeCallbacks: new Set(),
        eventListeners: new Map(),
      }
    },
    {
      dirPath: ws.dirPath,
      subdirPath: ws.subdirPath,
      rootEntries: ws.rootEntries,
      subdirEntries: ws.subdirEntries,
    },
  )

  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')
}

test.describe.configure({ mode: 'serial' })

test.describe('File Tree Performance', () => {
  const results: PerfResult[] = []

  test.afterAll(() => {
    if (results.length === 0) return
    const sectionHeader = `## 文件树度量结果`
    const tableHeader = `\n| 用例 | 指标 | 中位数(ms) | 最小(ms) | 最大(ms) | 运行次数 |\n|------|------|-----------|---------|---------|----------|\n`
    const rows = results
      .map(
        (r) =>
          `| ${r.caseName} | ${r.metric} | ${r.median.toFixed(1)} | ${r.min.toFixed(1)} | ${r.max.toFixed(1)} | ${r.runs.length} |`,
      )
      .join('\n')

    const block = `\n${sectionHeader}\n${tableHeader}${rows}\n`

    if (!existsSync(RESULT_FILE)) {
      mkdirSync(dirname(RESULT_FILE), { recursive: true })
      writeFileSync(RESULT_FILE, `# 性能基线度量结果\n`)
    }

    let existing = readFileSync(RESULT_FILE, 'utf-8')
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

  for (const count of ROOT_FILE_COUNTS) {
    test(`list ${count}-file root directory`, async ({ page }) => {
      const ws = createPerfWorkspace(count)
      await launchPerfApp(page, ws)

      const runs: number[] = []
      for (let i = 0; i < RUN_PER_CASE; i++) {
        // 在浏览器内打点
        await page.evaluate(() => {
          const w = window as unknown as { __PERF_T0__?: number; performance: Performance }
          w.__PERF_T0__ = w.performance.now()
        })

        // 触发工作区加载：点击 Open Folder，dialogResult 已预设
        await page.getByRole('button', { name: /Open Folder/i }).click()

        // 等待根目录的最后一个文件按钮可见（file-NNNN.md）
        const lastFileName = `file-${String(count).padStart(4, '0')}.md`
        await page.getByText(lastFileName).first().waitFor({ state: 'visible', timeout: 60000 })

        const elapsed = await page.evaluate(() => {
          const w = window as unknown as { __PERF_T0__?: number; performance: Performance }
          if (typeof w.__PERF_T0__ !== 'number') return -1
          return w.performance.now() - w.__PERF_T0__
        })

        if (elapsed > 0) runs.push(elapsed)

        // 重置以便下次：刷新页面（mock 数据通过 init script 持久化）
        await page.reload()
        await page.waitForLoadState('domcontentloaded')
      }

      expect(runs.length).toBeGreaterThan(0)
      const result: PerfResult = {
        caseName: `root-${count}-files`,
        metric: '根目录 list + 渲染',
        runs,
        median: median(runs),
        min: Math.min(...runs),
        max: Math.max(...runs),
      }
      results.push(result)

      console.log(
        `[perf] 根 ${count} 文件：中位数 ${result.median.toFixed(1)}ms（min=${result.min.toFixed(1)} max=${result.max.toFixed(1)} n=${runs.length}）`,
      )

      ws.cleanup()
    })

    test(`expand 100-file subdir under ${count}-file root`, async ({ page }) => {
      const ws = createPerfWorkspace(count)
      await launchPerfApp(page, ws)

      // 先触发工作区加载
      await page.getByRole('button', { name: /Open Folder/i }).click()

      // 等待根目录列表完成
      const lastRootFile = `file-${String(count).padStart(4, '0')}.md`
      await page.getByText(lastRootFile).first().waitFor({ state: 'visible', timeout: 60000 })

      const runs: number[] = []
      for (let i = 0; i < RUN_PER_CASE; i++) {
        // 折叠子目录（如果展开）
        const subdirButton = page.locator('button', { hasText: 'subdir-100' }).first()
        const isExpanded = await subdirButton
          .evaluate((el) => el.querySelector('span')?.textContent)
          .catch(() => null)
        if (isExpanded === '▼') {
          await subdirButton.click().catch(() => {})
          await page.waitForTimeout(100)
        }

        // 打点
        await page.evaluate(() => {
          const w = window as unknown as { __PERF_T0__?: number; performance: Performance }
          w.__PERF_T0__ = w.performance.now()
        })

        // 展开子目录
        await subdirButton.click()

        // 等待子目录最后一个文件可见
        const lastSubFile = `file-${String(SUBDIR_FILE_COUNT).padStart(4, '0')}.md`
        await page.getByText(lastSubFile).first().waitFor({ state: 'visible', timeout: 30000 })

        const elapsed = await page.evaluate(() => {
          const w = window as unknown as { __PERF_T0__?: number; performance: Performance }
          if (typeof w.__PERF_T0__ !== 'number') return -1
          return w.performance.now() - w.__PERF_T0__
        })

        if (elapsed > 0) runs.push(elapsed)
      }

      expect(runs.length).toBeGreaterThan(0)
      const result: PerfResult = {
        caseName: `expand-subdir-100-under-${count}`,
        metric: '展开 100 文件子目录',
        runs,
        median: median(runs),
        min: Math.min(...runs),
        max: Math.max(...runs),
      }
      results.push(result)

      console.log(
        `[perf] 展开 100 子目录（根 ${count}）：中位数 ${result.median.toFixed(1)}ms（min=${result.min.toFixed(1)} max=${result.max.toFixed(1)} n=${runs.length}）`,
      )

      ws.cleanup()
    })
  }
})
