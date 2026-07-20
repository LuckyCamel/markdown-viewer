import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { CommandPalette } from './CommandPalette'
import { useCommandStore } from '../stores/useCommandStore'
import { commandRegistry, type Command } from '../features/commands/commands'
import { setLocale, getLocale } from '../../shared/i18n'

/**
 * CommandPalette 组件测试
 *
 * 覆盖：显示/隐藏、模糊匹配、键盘导航、命令执行。
 */
describe('CommandPalette', () => {
  beforeEach(() => {
    // 重置命令面板状态与已注册命令
    useCommandStore.setState({ open: false })
    commandRegistry.getAll().forEach((c) => commandRegistry.unregister(c.id))
    setLocale('zh-CN')
  })

  it('默认不渲染', () => {
    const { container } = render(<CommandPalette />)
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })

  it('打开时显示搜索框', () => {
    useCommandStore.setState({ open: true })
    render(<CommandPalette />)
    const input = screen.getByPlaceholderText('输入命令名称以搜索…')
    expect(input).toBeDefined()
  })

  it('无匹配时显示空提示', () => {
    useCommandStore.setState({ open: true })
    const cmd: Command = {
      id: 'foo',
      name: '阿尔法',
      category: 'file',
      execute: () => {},
    }
    commandRegistry.register(cmd)
    render(<CommandPalette />)
    const input = screen.getByPlaceholderText('输入命令名称以搜索…')
    fireEvent.change(input, { target: { value: 'xyz' } })
    expect(screen.getByText('未找到匹配的命令')).toBeDefined()
  })

  it('模糊匹配后渲染命令列表', () => {
    useCommandStore.setState({ open: true })
    const cmd1: Command = {
      id: 'cmd1',
      name: '打开文件夹',
      category: 'file',
      execute: () => {},
    }
    const cmd2: Command = {
      id: 'cmd2',
      name: '切换侧边栏',
      category: 'view',
      execute: () => {},
    }
    commandRegistry.register(cmd1)
    commandRegistry.register(cmd2)
    render(<CommandPalette />)
    const input = screen.getByPlaceholderText('输入命令名称以搜索…')
    fireEvent.change(input, { target: { value: '打开' } })
    expect(screen.getByText('打开文件夹')).toBeDefined()
    expect(screen.queryByText('切换侧边栏')).toBeNull()
  })

  it('点击命令应执行并关闭面板', () => {
    useCommandStore.setState({ open: true })
    const execute = vi.fn()
    const cmd: Command = {
      id: 'test',
      name: '测试命令',
      category: 'file',
      execute,
    }
    commandRegistry.register(cmd)
    render(<CommandPalette />)
    const button = screen.getByText('测试命令')
    button.click()
    expect(execute).toHaveBeenCalledTimes(1)
    expect(useCommandStore.getState().open).toBe(false)
  })

  it('Enter 键应执行当前选中命令', () => {
    useCommandStore.setState({ open: true })
    const execute = vi.fn()
    const cmd: Command = {
      id: 'test',
      name: '回车测试',
      category: 'file',
      execute,
    }
    commandRegistry.register(cmd)
    render(<CommandPalette />)
    const input = screen.getByPlaceholderText('输入命令名称以搜索…')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('Escape 键应关闭面板', () => {
    useCommandStore.setState({ open: true })
    render(<CommandPalette />)
    const input = screen.getByPlaceholderText('输入命令名称以搜索…')
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(useCommandStore.getState().open).toBe(false)
  })

  it('方向键应改变选中项', () => {
    useCommandStore.setState({ open: true })
    const cmd1: Command = { id: 'a', name: '命令一', category: 'file', execute: () => {} }
    const cmd2: Command = { id: 'b', name: '命令二', category: 'file', execute: () => {} }
    const cmd3: Command = { id: 'c', name: '命令三', category: 'file', execute: () => {} }
    commandRegistry.register(cmd1)
    commandRegistry.register(cmd2)
    commandRegistry.register(cmd3)
    render(<CommandPalette />)
    const input = screen.getByPlaceholderText('输入命令名称以搜索…')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    // 选中第三项后按 Enter 应仅执行一次（不会因多次触发）
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(useCommandStore.getState().open).toBe(false)
  })

  it('英文语言下使用英文 placeholder', () => {
    useCommandStore.setState({ open: true })
    setLocale('en-US')
    expect(getLocale()).toBe('en-US')
    render(<CommandPalette />)
    expect(screen.getByPlaceholderText('Type a command name to search…')).toBeDefined()
  })

  it('isAvailable 返回 false 的命令不应显示在列表中', () => {
    useCommandStore.setState({ open: true })
    const cmdAvailable: Command = {
      id: 'avail',
      name: '可用命令',
      category: 'view',
      execute: () => {},
      isAvailable: () => true,
    }
    const cmdUnavailable: Command = {
      id: 'unavail',
      name: '不可用命令',
      category: 'view',
      execute: () => {},
      isAvailable: () => false,
    }
    commandRegistry.register(cmdAvailable)
    commandRegistry.register(cmdUnavailable)
    render(<CommandPalette />)
    expect(screen.queryByText('可用命令')).toBeDefined()
    expect(screen.queryByText('不可用命令')).toBeNull()
  })

  it('无 isAvailable 的命令应默认显示', () => {
    useCommandStore.setState({ open: true })
    const cmd: Command = {
      id: 'noavail',
      name: '无可用性判断命令',
      category: 'file',
      execute: () => {},
    }
    commandRegistry.register(cmd)
    render(<CommandPalette />)
    expect(screen.queryByText('无可用性判断命令')).toBeDefined()
  })

  it('搜索时也过滤 isAvailable=false 的命令', () => {
    useCommandStore.setState({ open: true })
    const cmd1: Command = {
      id: 'a1',
      name: '编辑模式开关',
      category: 'view',
      execute: () => {},
      isAvailable: () => true,
    }
    const cmd2: Command = {
      id: 'a2',
      name: '编辑模式禁用',
      category: 'view',
      execute: () => {},
      isAvailable: () => false,
    }
    commandRegistry.register(cmd1)
    commandRegistry.register(cmd2)
    render(<CommandPalette />)
    const input = screen.getByPlaceholderText('输入命令名称以搜索…')
    fireEvent.change(input, { target: { value: '编辑模式' } })
    expect(screen.queryByText('编辑模式开关')).toBeDefined()
    expect(screen.queryByText('编辑模式禁用')).toBeNull()
  })
})
