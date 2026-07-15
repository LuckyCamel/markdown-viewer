import type { FileEntry } from './types'

/**
 * 排序模式
 */
export type SortMode = 'name' | 'modified' | 'size'

/**
 * 排序方向
 */
export type SortDirection = 'asc' | 'desc'

/**
 * 对文件条目列表进行排序
 *
 * 排序规则：
 * - 目录始终排在文件前面
 * - 同类型（目录/文件）内按指定字段排序
 * - 缺少排序字段的条目排在最后
 *
 * @param entries - 文件条目列表
 * @param mode - 排序模式
 * @param direction - 排序方向
 * @returns 排序后的新数组（不修改原数组）
 */
export function sortFileEntries(
  entries: FileEntry[],
  mode: SortMode,
  direction: SortDirection,
): FileEntry[] {
  const result = [...entries]

  result.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1
    }

    let comparison = 0

    switch (mode) {
      case 'name':
        comparison = a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: 'base',
        })
        break

      case 'modified': {
        const aMod = a.modified ?? -Infinity
        const bMod = b.modified ?? -Infinity
        comparison = aMod - bMod
        break
      }

      case 'size': {
        const aSize = a.size ?? -1
        const bSize = b.size ?? -1
        comparison = aSize - bSize
        break
      }
    }

    return direction === 'asc' ? comparison : -comparison
  })

  return result
}
