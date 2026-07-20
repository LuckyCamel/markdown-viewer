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
 *
 * @param files 文件相对路径 → 文件内容
 * @param options.sizeOverride 可选：按文件相对路径覆盖 size（字节）
 *   未提供覆盖时，size 字段省略（mock IPC 不传 size，FileSizeGuard 跳过检查）
 */
export function createTestWorkspace(
  files: Record<string, string>,
  options?: { sizeOverride?: Record<string, number> },
): {
  dirPath: string
  cleanup: () => void
  fileContents: Record<string, string>
  entries: FileEntry[]
  /** 所有层级的目录条目（用于 mock IPC listDirectory） */
  directoryTree: Map<string, FileEntry[]>
} {
  const tmpDir = mkdtempSync(join(tmpdir(), 'mde2e-'))
  const dirPath = tmpDir.replace(/\\/g, '/')

  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = join(tmpDir, relPath)
    const parentDir = join(tmpDir, ...relPath.split(/[\\/]/).slice(0, -1))
    mkdirSync(parentDir, { recursive: true })
    writeFileSync(fullPath, content, 'utf-8')
  }

  // 收集所有 size 覆盖（绝对路径 → size）
  const sizeOverrideMap = new Map<string, number>()
  if (options?.sizeOverride) {
    for (const [name, size] of Object.entries(options.sizeOverride)) {
      const fullPath = join(tmpDir, name).replace(/\\/g, '/')
      sizeOverrideMap.set(fullPath, size)
    }
  }

  // 递归扫描，构建 directoryTree map（每个目录的 entries）
  const directoryTree = new Map<string, FileEntry[]>()
  function scanDir(absDir: string) {
    const dirPathNorm = absDir.replace(/\\/g, '/')
    const items: FileEntry[] = []
    try {
      const names = readdirSync(absDir)
      for (const name of names) {
        const fullPath = join(absDir, name)
        try {
          const stat = statSync(fullPath)
          const fullPathNorm = fullPath.replace(/\\/g, '/')
          const entry: FileEntry = {
            name,
            path: fullPathNorm,
            isDirectory: stat.isDirectory(),
            isHidden: name.startsWith('.'),
            isMarkdown: !stat.isDirectory() && isMarkdownFileName(name),
          }
          const overrideSize = sizeOverrideMap.get(fullPathNorm)
          if (overrideSize !== undefined) {
            entry.size = overrideSize
          }
          items.push(entry)
          if (stat.isDirectory()) {
            scanDir(fullPath)
          }
        } catch {
          // skip
        }
      }
    } catch {
      // dir not found
    }
    directoryTree.set(dirPathNorm, items)
  }
  scanDir(tmpDir)

  // 根 entries（保持向后兼容字段）
  const entries = directoryTree.get(dirPath) ?? []

  const fileContents: Record<string, string> = {}
  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = join(tmpDir, relPath).replace(/\\/g, '/')
    fileContents[fullPath] = content
  }

  const cleanup = () => rmSync(tmpDir, { recursive: true, force: true })
  return { dirPath, cleanup, fileContents, entries, directoryTree }
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
    directoryTree?: Map<string, FileEntry[]>
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
    // 优先使用完整 directoryTree（含子目录）；否则回退到只有根目录的 map
    const tree = workspace.directoryTree ?? new Map([[workspace.dirPath, workspace.entries]])
    const treeObj = Object.fromEntries(tree)

    await page.addInitScript(
      ({ dirPath, fileContents, treeObj }) => {
        localStorage.clear()
        localStorage.setItem('locale', 'en-US')
        window.__E2E__ = {
          files: new Map(Object.entries(fileContents)),
          directoryTree: new Map(Object.entries(treeObj)),
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
        dirPath: workspace.dirPath,
        fileContents: workspace.fileContents,
        treeObj,
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
        revealPathCalls: [],
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
