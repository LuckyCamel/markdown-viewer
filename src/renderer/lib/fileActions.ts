import { ipc } from './ipc'
import { logError } from '../logger'

/**
 * 复制文件路径到剪贴板
 *
 * 优先使用 Web 标准 `navigator.clipboard`；在非安全上下文或测试环境（jsdom）
 * 中降级到 `document.execCommand('copy')`，确保功能可用。
 */
export async function copyPathToClipboard(path: string): Promise<void> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(path)
      return
    }
  } catch (err) {
    logError('fileActions:copyPathToClipboard', err)
  }

  // 降级方案：临时 textarea + execCommand
  try {
    const textarea = document.createElement('textarea')
    textarea.value = path
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  } catch (err) {
    logError('fileActions:copyPathFallback', err)
  }
}

/**
 * 在系统文件管理器中显示指定文件或目录所在位置
 */
export function revealPathInDir(path: string): void {
  ipc.shell.revealPathInDir(path).catch((err) => {
    logError('fileActions:revealPathInDir', err)
  })
}
