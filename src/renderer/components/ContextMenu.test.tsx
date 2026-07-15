import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { ContextMenu } from './ContextMenu'

describe('ContextMenu', () => {
  it('应渲染菜单项', () => {
    render(
      <ContextMenu
        x={100}
        y={100}
        items={[{ label: '测试项', onClick: () => {} }]}
        onClose={() => {}}
      />,
    )
    expect(screen.getByText('测试项')).toBeDefined()
  })

  it('点击菜单项应调用 onClick', () => {
    const onClick = vi.fn()
    render(
      <ContextMenu x={100} y={100} items={[{ label: '测试项', onClick }]} onClose={() => {}} />,
    )
    screen.getByText('测试项').click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('点击菜单项后应调用 onClose', () => {
    const onClose = vi.fn()
    render(
      <ContextMenu
        x={100}
        y={100}
        items={[{ label: '测试项', onClick: () => {} }]}
        onClose={onClose}
      />,
    )
    screen.getByText('测试项').click()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('应渲染分隔符', () => {
    render(
      <ContextMenu
        x={100}
        y={100}
        items={[{ label: '项1', onClick: () => {} }, {}, { label: '项2', onClick: () => {} }]}
        onClose={() => {}}
      />,
    )
    expect(screen.getByText('项1')).toBeDefined()
    expect(screen.getByText('项2')).toBeDefined()
  })

  it('禁用项应显示禁用样式', () => {
    render(
      <ContextMenu
        x={100}
        y={100}
        items={[{ label: '禁用项', onClick: () => {}, disabled: true }]}
        onClose={() => {}}
      />,
    )
    const button = screen.getByText('禁用项') as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('按 Escape 应调用 onClose', () => {
    const onClose = vi.fn()
    render(
      <ContextMenu
        x={100}
        y={100}
        items={[{ label: '测试项', onClick: () => {} }]}
        onClose={onClose}
      />,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('点击外部应调用 onClose', () => {
    const onClose = vi.fn()
    render(
      <ContextMenu
        x={100}
        y={100}
        items={[{ label: '测试项', onClick: () => {} }]}
        onClose={onClose}
      />,
    )
    fireEvent.mouseDown(document.body)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('菜单应使用 fixed 定位', () => {
    render(
      <ContextMenu
        x={100}
        y={200}
        items={[{ label: '测试项', onClick: () => {} }]}
        onClose={() => {}}
      />,
    )
    const menu = screen.getByRole('menu') as HTMLElement
    expect(menu.className).toContain('fixed')
    expect(menu.style.left).toBe('100px')
    expect(menu.style.top).toBe('200px')
  })
})
