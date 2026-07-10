export interface ShortcutConfig {
  id: string
  label: string
  key: string
  ctrl: boolean
  shift: boolean
  alt: boolean
}

export type ShortcutAction =
  | 'openFolder'
  | 'toggleSidebar'
  | 'toggleOutline'
  | 'openFileSearch'
  | 'openContentSearch'
  | 'toggleSettings'
  | 'toggleViewMode'
  | 'closeTab'
  | 'nextTab'
  | 'prevTab'

export const DEFAULT_SHORTCUTS: Record<ShortcutAction, ShortcutConfig> = {
  openFolder: {
    id: 'openFolder',
    label: '打开文件夹',
    key: 'o',
    ctrl: true,
    shift: true,
    alt: false,
  },
  toggleSidebar: {
    id: 'toggleSidebar',
    label: '切换侧边栏',
    key: 'b',
    ctrl: true,
    shift: false,
    alt: false,
  },
  toggleOutline: {
    id: 'toggleOutline',
    label: '切换大纲面板',
    key: 'l',
    ctrl: true,
    shift: true,
    alt: false,
  },
  openFileSearch: {
    id: 'openFileSearch',
    label: '文件搜索',
    key: 'p',
    ctrl: true,
    shift: false,
    alt: false,
  },
  openContentSearch: {
    id: 'openContentSearch',
    label: '全局内容搜索',
    key: 'f',
    ctrl: true,
    shift: true,
    alt: false,
  },
  toggleSettings: {
    id: 'toggleSettings',
    label: '打开设置',
    key: ',',
    ctrl: true,
    shift: false,
    alt: false,
  },
  toggleViewMode: {
    id: 'toggleViewMode',
    label: '切换源码/渲染视图',
    key: 's',
    ctrl: true,
    shift: true,
    alt: false,
  },
  closeTab: {
    id: 'closeTab',
    label: '关闭当前标签',
    key: 'w',
    ctrl: true,
    shift: false,
    alt: false,
  },
  nextTab: {
    id: 'nextTab',
    label: '下一个标签',
    key: 'Tab',
    ctrl: true,
    shift: false,
    alt: false,
  },
  prevTab: {
    id: 'prevTab',
    label: '上一个标签',
    key: 'Tab',
    ctrl: true,
    shift: true,
    alt: false,
  },
}

/**
 * 将快捷键配置序列化为显示字符串
 */
export function formatShortcut(config: ShortcutConfig): string {
  const parts: string[] = []
  if (config.ctrl) parts.push('Ctrl')
  if (config.alt) parts.push('Alt')
  if (config.shift) parts.push('Shift')
  const key = config.key
  if (key === ' ') {
    parts.push('Space')
  } else if (key.length === 1) {
    parts.push(key.toUpperCase())
  } else {
    parts.push(key)
  }
  return parts.join('+')
}

/**
 * 检测两个快捷键配置是否冲突
 */
export function checkShortcutConflict(a: ShortcutConfig, b: ShortcutConfig): boolean {
  if (a.id === b.id) return false
  return (
    a.key.toLowerCase() === b.key.toLowerCase() &&
    a.ctrl === b.ctrl &&
    a.shift === b.shift &&
    a.alt === b.alt
  )
}

const STORAGE_KEY = 'keyboardShortcuts'

/**
 * 从 localStorage 加载快捷键配置，未配置时使用默认值
 */
export async function loadShortcuts(): Promise<Record<ShortcutAction, ShortcutConfig>> {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    return { ...DEFAULT_SHORTCUTS }
  }
  try {
    const parsed = JSON.parse(stored) as Record<string, ShortcutConfig>
    const result = { ...DEFAULT_SHORTCUTS }
    for (const [key, value] of Object.entries(parsed)) {
      if (key in result) {
        result[key as ShortcutAction] = value
      }
    }
    return result
  } catch {
    return { ...DEFAULT_SHORTCUTS }
  }
}

/**
 * 保存快捷键配置到 localStorage
 */
export async function saveShortcuts(
  shortcuts: Record<ShortcutAction, ShortcutConfig>,
): Promise<void> {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts))
}
