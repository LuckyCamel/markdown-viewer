/**
 * FileSizeGuard — 大文件守护（纯函数模块）
 *
 * 打开文件前根据文件大小和类型给出处理建议：
 * - Markdown：超过 5MB 阈值 → 拒绝直接打开
 * - 文本/代码：超过 2MB 阈值 → 拒绝直接打开
 * - 二进制：无论大小都拒绝读取为文本
 *
 * 阈值可由调用方传入覆盖默认值；不引入依赖。
 */

import type { FileKind } from '../../shared/fileTypes'

/** 文本/代码文件大小上限（默认 2MB） */
export const DEFAULT_MAX_TEXT_FILE_SIZE = 2 * 1024 * 1024

/** Markdown 文件大小上限（默认 5MB） */
export const DEFAULT_MAX_MARKDOWN_SIZE = 5 * 1024 * 1024

/** 检查失败原因 */
export type FileSizeCheckReason = 'too_large' | 'binary'

export interface FileSizeCheckResult {
  /** 是否允许直接打开 */
  allowed: boolean
  /** 拒绝原因（仅当 allowed=false 时存在） */
  reason?: FileSizeCheckReason
  /** 文件字节数 */
  size: number
}

export interface FileSizeThresholds {
  /** 文本/代码文件阈值（字节） */
  maxTextFileSize?: number
  /** Markdown 文件阈值（字节） */
  maxMarkdownSize?: number
}

/**
 * 检查文件是否允许直接打开
 *
 * @param _path 文件路径（保留参数以便后续按扩展名做更细粒度判断）
 * @param size 文件字节数（来自 FileEntry.size 或 stat）
 * @param kind 文件类型（来自 getFileKind）
 * @param thresholds 可选阈值覆盖
 */
export function checkFileSize(
  _path: string,
  size: number,
  kind: FileKind,
  thresholds?: FileSizeThresholds,
): FileSizeCheckResult {
  const maxText = thresholds?.maxTextFileSize ?? DEFAULT_MAX_TEXT_FILE_SIZE
  const maxMd = thresholds?.maxMarkdownSize ?? DEFAULT_MAX_MARKDOWN_SIZE

  if (kind === 'binary') {
    return { allowed: false, reason: 'binary', size }
  }

  if (kind === 'markdown') {
    if (size > maxMd) {
      return { allowed: false, reason: 'too_large', size }
    }
    return { allowed: true, size }
  }

  // code / text 共用文本阈值
  if (size > maxText) {
    return { allowed: false, reason: 'too_large', size }
  }
  return { allowed: true, size }
}
