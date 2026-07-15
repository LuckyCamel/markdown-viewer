import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { InlineRenameInput } from './InlineRenameInput'

describe('InlineRenameInput', () => {
  it('应渲染输入框并自动聚焦', () => {
    render(<InlineRenameInput initialValue="test.md" onSubmit={() => {}} onCancel={() => {}} />)
    const input = screen.getByDisplayValue('test.md')
    expect(input).toBeDefined()
    expect(document.activeElement).toBe(input)
  })

  it('初始值应被全选', () => {
    render(<InlineRenameInput initialValue="test.md" onSubmit={() => {}} onCancel={() => {}} />)
    const input = screen.getByDisplayValue('test.md') as HTMLInputElement
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe(7)
  })

  it('按 Enter 应调用 onSubmit 并传入当前值', () => {
    const onSubmit = vi.fn()
    render(<InlineRenameInput initialValue="old.md" onSubmit={onSubmit} onCancel={() => {}} />)
    const input = screen.getByDisplayValue('old.md')
    fireEvent.change(input, { target: { value: 'new.md' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSubmit).toHaveBeenCalledWith('new.md')
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('按 Escape 应调用 onCancel', () => {
    const onCancel = vi.fn()
    render(<InlineRenameInput initialValue="test.md" onSubmit={() => {}} onCancel={onCancel} />)
    const input = screen.getByDisplayValue('test.md')
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('验证失败时按 Enter 不调用 onSubmit', () => {
    const onSubmit = vi.fn()
    const validate = () => '名称不能为空'
    render(
      <InlineRenameInput
        initialValue="test.md"
        onSubmit={onSubmit}
        onCancel={() => {}}
        validate={validate}
      />,
    )
    const input = screen.getByDisplayValue('test.md')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('验证失败时应显示错误信息', () => {
    const validate = () => '名称不能为空'
    render(
      <InlineRenameInput
        initialValue="  "
        onSubmit={() => {}}
        onCancel={() => {}}
        validate={validate}
        initialValidation={true}
      />,
    )
    expect(screen.getByText('名称不能为空')).toBeDefined()
  })

  it('应显示 placeholder', () => {
    render(
      <InlineRenameInput
        initialValue=""
        placeholder="请输入文件名"
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(screen.getByPlaceholderText('请输入文件名')).toBeDefined()
  })

  it('失去焦点时默认不提交', () => {
    const onSubmit = vi.fn()
    render(<InlineRenameInput initialValue="test.md" onSubmit={onSubmit} onCancel={() => {}} />)
    const input = screen.getByDisplayValue('test.md')
    fireEvent.blur(input)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submitOnBlur 为 true 时失去焦点应提交', () => {
    const onSubmit = vi.fn()
    render(
      <InlineRenameInput
        initialValue="test.md"
        onSubmit={onSubmit}
        onCancel={() => {}}
        submitOnBlur={true}
      />,
    )
    const input = screen.getByDisplayValue('test.md')
    fireEvent.change(input, { target: { value: 'new.md' } })
    fireEvent.blur(input)
    expect(onSubmit).toHaveBeenCalledWith('new.md')
  })
})
