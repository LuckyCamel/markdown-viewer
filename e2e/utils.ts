import type { Page } from '@playwright/test'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import type { FileEntry } from '../src/shared/types'

/**
 * 判断 E2E fixture 文件名是否应视为 Markdown
 */
function isMarkdownFileName(name: string): boolean {
  if (/\.(md|markdown)$/i.test(name)) return true
  return !name.includes('.')
}

/**
 * 创建临时测试目录，并扫描内容生成 FileEntry 列表。
 * 返回目录路径、清理函数、文件内容映射和目录条目列表。
 */
export function createTestWorkspace(files: Record<string, string>): {
  dirPath: string
  cleanup: () => void
  fileContents: Record<string, string>
  entries: FileEntry[]
} {
  const tmpDir = mkdtempSync(join(tmpdir(), 'mde2e-'))
  const dirPath = tmpDir.replace(/\\/g, '/')

  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = join(tmpDir, relPath)
    const parentDir = join(tmpDir, ...relPath.split(/[\\/]/).slice(0, -1))
    mkdirSync(parentDir, { recursive: true })
    writeFileSync(fullPath, content, 'utf-8')
  }

  const entries: FileEntry[] = []
  try {
    const items = readdirSync(tmpDir)
    for (const name of items) {
      const fullPath = join(tmpDir, name)
      try {
        const stat = statSync(fullPath)
        entries.push({
          name,
          path: fullPath.replace(/\\/g, '/'),
          isDirectory: stat.isDirectory(),
          isHidden: name.startsWith('.'),
          isMarkdown: !stat.isDirectory() && isMarkdownFileName(name),
        })
      } catch {
        // skip
      }
    }
  } catch {
    // dir not found
  }

  const fileContents: Record<string, string> = {}
  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = join(tmpDir, relPath).replace(/\\/g, '/')
    fileContents[fullPath] = content
  }

  const cleanup = () => rmSync(tmpDir, { recursive: true, force: true })
  return { dirPath, cleanup, fileContents, entries }
}

/**
 * 启动应用（连接到 Vite dev server）。
 * 如果提供了 workspace 数据，会在页面加载前通过 addInitScript 注入 mock 数据。
 * 使用 page.route 拦截 ipc.ts 请求，重定向到 ipc.mock.ts 实现 mock。
 */
export async function launchApp(
  page: Page,
  workspace?: {
    dirPath: string
    fileContents: Record<string, string>
    entries: FileEntry[]
  },
): Promise<void> {
  // 拦截 ipc.ts 请求，重定向到 mock 版本
  await page.route('**/lib/ipc.ts', async (route) => {
    const url = route.request().url()
    const mockUrl = url.replace('/ipc.ts', '/ipc.mock.ts')
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: await (await fetch(mockUrl)).text(),
    })
  })

  if (workspace) {
    await page.addInitScript(
      ({ dirPath, fileContents, entries }) => {
        localStorage.clear()
        localStorage.setItem('locale', 'en-US')
        window.__E2E__ = {
          files: new Map(Object.entries(fileContents)),
          directoryTree: new Map([[dirPath, entries]]),
          dialogResult: dirPath,
          openExternalCalls: [],
          searchResults: null,
          fileChangeListeners: new Map(),
          searchResultListeners: new Set(),
          fileChangeCallbacks: new Set(),
          eventListeners: new Map(),
        }
      },
      {
        dirPath: workspace.dirPath,
        fileContents: workspace.fileContents,
        entries: workspace.entries,
      },
    )
  } else {
    await page.addInitScript(() => {
      localStorage.clear()
      localStorage.setItem('locale', 'en-US')
      window.__E2E__ = {
        files: new Map(),
        directoryTree: new Map(),
        dialogResult: null,
        openExternalCalls: [],
        searchResults: null,
        fileChangeListeners: new Map(),
        searchResultListeners: new Set(),
        fileChangeCallbacks: new Set(),
        eventListeners: new Map(),
      }
    })
  }

  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')
}

/**
 * 设置 dialog.openDirectory/openFile 的返回值并点击 Open Folder 按钮。
 * 注意：如果在 launchApp 时传了 workspace，dialogResult 已经预设，
 * 此函数仅用于后续更改或需要手动触发的场景。
 */
export async function openWorkspace(page: Page, dirPath: string): Promise<void> {
  await page.evaluate((dp: string) => {
    window.__E2E__.dialogResult = dp
  }, dirPath)

  const btn = page.getByRole('button', { name: /Open Folder/i })
  await btn.click()
}
