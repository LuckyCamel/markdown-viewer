import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TabBar } from './TabBar'
import { useTabStore } from './useTabStore'

describe('TabBar', () => {
  beforeEach(() => {
    useTabStore.getState().closeAll()
  })

  it('should render nothing when no files are open', () => {
    render(<TabBar />)
    expect(screen.queryByRole('tab')).toBeNull()
  })

  it('should render tabs for open files', () => {
    useTabStore.getState().openFile('/test/file.md')
    render(<TabBar />)
    expect(screen.getByText('file.md')).toBeDefined()
    useTabStore.getState().closeAll()
  })

  it('MD 文件编辑模式下显示预览切换按钮', () => {
    useTabStore.getState().openFile('/test/doc.md')
    useTabStore.getState().setViewMode('/test/doc.md', 'edit')
    render(<TabBar />)
    const previewBtn = screen.getByTitle('切换预览面板')
    expect(previewBtn).toBeDefined()
  })

  it('MD 文件阅读模式下不显示预览切换按钮', () => {
    useTabStore.getState().openFile('/test/doc.md')
    useTabStore.getState().setViewMode('/test/doc.md', 'read')
    render(<TabBar />)
    expect(screen.queryByTitle('切换预览面板')).toBeNull()
  })

  it('非 MD 文件不显示预览切换按钮', () => {
    useTabStore.getState().openFile('/test/app.ts')
    render(<TabBar />)
    expect(screen.queryByTitle('切换预览面板')).toBeNull()
  })

  it('点击预览按钮切换 previewEnabled 状态', () => {
    useTabStore.getState().openFile('/test/doc.md')
    useTabStore.getState().setViewMode('/test/doc.md', 'edit')
    render(<TabBar />)
    const previewBtn = screen.getByTitle('切换预览面板')
    expect(useTabStore.getState().isPreviewEnabled('/test/doc.md')).toBe(false)
    fireEvent.click(previewBtn)
    expect(useTabStore.getState().isPreviewEnabled('/test/doc.md')).toBe(true)
    fireEvent.click(previewBtn)
    expect(useTabStore.getState().isPreviewEnabled('/test/doc.md')).toBe(false)
  })
})
