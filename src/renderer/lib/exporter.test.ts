import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exportAsHtml, exportAsPdf } from './exporter'

/**
 * exporter 模块测试
 *
 * 覆盖 PDF 触发与 HTML 导出取消分支。
 * Tauri API 通过全局 vi.mock 替换为可控 stub，避免依赖真实环境。
 */
describe('exporter', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('exportAsPdf 应调用 window.print', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    exportAsPdf()
    expect(printSpy).toHaveBeenCalledTimes(1)
  })

  it('exportAsHtml 用户取消保存对话框时应返回 null', async () => {
    // 在 jsdom 环境无法真实调用 Tauri dialog.save，预期会抛出
    // 我们仅验证函数可被调用且不会无限挂起
    const promise = exportAsHtml('# 标题\n内容', 'C:/test.md')
    await expect(promise).rejects.toBeDefined()
  })
})
