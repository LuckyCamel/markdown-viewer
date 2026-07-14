export interface ScrollPosition {
  render: number
  source: number
}

/**
 * 将旧版 readingPositions 格式（number）迁移到新版（{ render, source }）
 * @param raw - 从 store 读取的原始数据
 * @returns 迁移后的标准格式
 */
export function migrateReadingPositions(
  raw: Record<string, unknown> | null | undefined,
): Record<string, ScrollPosition> {
  if (!raw) return {}
  const result: Record<string, ScrollPosition> = {}
  for (const key of Object.keys(raw)) {
    const value = raw[key]
    // 旧格式：number 直接转为 { render: value, source: 0 }
    if (typeof value === 'number' && Number.isFinite(value)) {
      result[key] = { render: value, source: 0 }
      continue
    }
    // 新格式：对象（排除 null 和数组），补全缺失字段
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const obj = value as { render?: unknown; source?: unknown }
      const render = typeof obj.render === 'number' && Number.isFinite(obj.render) ? obj.render : 0
      const source = typeof obj.source === 'number' && Number.isFinite(obj.source) ? obj.source : 0
      result[key] = { render, source }
    }
    // 其他类型跳过
  }
  return result
}
