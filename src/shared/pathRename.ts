/**
 * 将 Record 中的旧路径键名迁移到新路径
 *
 * 用于重命名文件时，同步更新 readingPositions、outlineCollapsed 等以路径为键的存储。
 *
 * @param record - 以路径为键的记录对象
 * @param oldPath - 旧路径
 * @param newPath - 新路径
 * @returns 新的 Record 对象（不修改原对象）
 */
export function renamePathInRecord<T>(
  record: Record<string, T>,
  oldPath: string,
  newPath: string,
): Record<string, T> {
  if (!(oldPath in record)) {
    return record
  }

  const next: Record<string, T> = {}
  for (const [key, value] of Object.entries(record)) {
    if (key === oldPath) {
      next[newPath] = value
    } else {
      next[key] = value
    }
  }
  return next
}

/**
 * 将数组中的旧路径替换为新路径
 *
 * 用于重命名文件时，同步更新 openFiles、recentFiles 等路径数组。
 *
 * @param arr - 路径数组
 * @param oldPath - 旧路径
 * @param newPath - 新路径
 * @returns 新的数组（不修改原数组）
 */
export function renamePathInArray(arr: string[], oldPath: string, newPath: string): string[] {
  if (!arr.includes(oldPath)) {
    return arr
  }
  return arr.map((p) => (p === oldPath ? newPath : p))
}
