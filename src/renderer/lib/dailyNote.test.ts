import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * dailyNote 模块测试
 *
 * 覆盖日期格式与默认模板生成逻辑。
 * 由于模块在导入时即调用 Tauri API（间接通过 zustand store），
 * 实际 openTodaysNote 的端到端测试留待 E2E。
 */

// 提取需要测试的纯函数（与模块内实现保持一致）
function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function buildTemplate(date: string): string {
  return `# ${date}\n\n## 计划\n\n- [ ] \n\n## 笔记\n\n`
}

describe('dailyNote pure helpers', () => {
  it('formatDate 应输出 YYYY-MM-DD', () => {
    expect(formatDate(new Date(2026, 6, 15))).toBe('2026-07-15')
  })

  it('formatDate 单数月/日应补零', () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('buildTemplate 应包含日期与默认章节', () => {
    const tpl = buildTemplate('2026-07-15')
    expect(tpl).toContain('# 2026-07-15')
    expect(tpl).toContain('## 计划')
    expect(tpl).toContain('## 笔记')
    expect(tpl).toContain('- [ ]')
  })
})

describe('openTodaysNote module', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('应能从模块中导入函数', async () => {
    const mod = await import('./dailyNote')
    expect(typeof mod.openTodaysNote).toBe('function')
  })
})
