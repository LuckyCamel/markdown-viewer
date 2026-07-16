/**
 * 每日笔记工具
 *
 * 打开或创建当天的笔记文件 `notes/YYYY-MM-DD.md`：
 * - 优先使用工作区根目录（多工作区取第一个）
 * - 若无工作区则提示用户选择目录
 * - 文件不存在时自动创建并写入模板
 */

import { invoke } from '@tauri-apps/api/core'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { useFileStore } from '../features/file-tree/useFileStore'
import { useTabStore } from '../features/tabs/useTabStore'
import { ipc } from './ipc'
import { joinPaths } from '../../shared/utils'

/**
 * 格式化日期为 YYYY-MM-DD（本地时区）
 */
function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 获取工作区根目录
 */
function getWorkspaceRoot(): string | null {
  const rootPaths = useFileStore.getState().rootPaths
  if (rootPaths.length > 0) return rootPaths[0]
  const single = useFileStore.getState().rootPath
  return single ?? null
}

/**
 * 默认笔记模板
 */
function buildTemplate(date: string): string {
  return `# ${date}\n\n## 计划\n\n- [ ] \n\n## 笔记\n\n`
}

/**
 * 打开今日笔记
 *
 * - 找到或创建当天的 Markdown 文件
 * - 将其加入打开的标签页并设为活动
 */
export async function openTodaysNote(): Promise<string | null> {
  const today = formatDate(new Date())
  let root = getWorkspaceRoot()
  if (!root) {
    const picked = await openDialog({ directory: true })
    if (!picked) return null
    root = picked
  }
  const notesDir = joinPaths(root, 'notes')
  const filePath = joinPaths(notesDir, `${today}.md`)

  // 若目录/文件不存在则创建
  const exists = await ipc.files.checkExists([filePath])
  if (!exists[0]) {
    try {
      await invoke('create_directory', { dirPath: root, name: 'notes' })
    } catch {
      // 目录可能已存在，忽略
    }
    try {
      await invoke('create_file', {
        dirPath: notesDir,
        name: `${today}.md`,
      })
    } catch {
      // 文件可能已存在，忽略
    }
    // 写入模板
    await invoke('save_text_file', {
      path: filePath,
      content: buildTemplate(today),
    })
  }

  useTabStore.getState().openFile(filePath)
  return filePath
}
