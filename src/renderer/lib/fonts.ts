/**
 * 系统字体选择工具
 *
 * 提供常用跨平台字体列表，用户也可手动输入字体名称。
 * 不使用 Rust 端枚举（避免引入新依赖）。
 */

export interface FontOption {
  /** 字体显示名称 */
  name: string
  /** CSS font-family 值 */
  value: string
}

/**
 * 常用正文字体（无衬线）
 */
export const COMMON_PROPORTIONAL_FONTS: FontOption[] = [
  { name: '系统默认', value: '' },
  { name: 'Segoe UI (Windows)', value: 'Segoe UI' },
  { name: 'Microsoft YaHei (微软雅黑)', value: 'Microsoft YaHei' },
  { name: 'PingFang SC (苹方)', value: 'PingFang SC' },
  { name: 'Helvetica Neue', value: 'Helvetica Neue' },
  { name: 'Arial', value: 'Arial' },
  { name: 'Georgia', value: 'Georgia' },
  { name: 'Times New Roman', value: 'Times New Roman' },
  { name: 'Songti SC (宋体)', value: 'Songti SC' },
]

/**
 * 常用等宽字体（代码）
 */
export const COMMON_MONOSPACE_FONTS: FontOption[] = [
  { name: '系统默认', value: '' },
  { name: 'Consolas', value: 'Consolas' },
  { name: 'JetBrains Mono', value: 'JetBrains Mono' },
  { name: 'Fira Code', value: 'Fira Code' },
  { name: 'Source Code Pro', value: 'Source Code Pro' },
  { name: 'Menlo', value: 'Menlo' },
  { name: 'Monaco', value: 'Monaco' },
  { name: 'Courier New', value: 'Courier New' },
]

/**
 * 获取字体显示名称
 */
export function getFontDisplayName(value: string, fonts: FontOption[]): string {
  const found = fonts.find((f) => f.value === value)
  return found?.name ?? (value || '系统默认')
}
