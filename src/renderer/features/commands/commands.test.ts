import { describe, it, expect, beforeEach, vi } from 'vitest'
import { commandRegistry, type Command } from './commands'

/**
 * commandRegistry.execute 方法测试
 *
 * 验证统一动作分发的核心入口行为：
 * - 命令存在且可执行时返回 true 并调用 execute
 * - 命令不存在时返回 false
 * - isAvailable 返回 false 时返回 false 且不调用 execute
 */
describe('commandRegistry.execute', () => {
  beforeEach(() => {
    commandRegistry.clear()
  })

  it('命令存在且无 isAvailable 时执行并返回 true', () => {
    const execute = vi.fn()
    const cmd: Command = {
      id: 'test.run',
      name: '测试命令',
      category: 'view',
      execute,
    }
    commandRegistry.register(cmd)

    expect(commandRegistry.execute('test.run')).toBe(true)
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('命令不存在时返回 false', () => {
    expect(commandRegistry.execute('not.exist')).toBe(false)
  })

  it('isAvailable 返回 false 时不执行且返回 false', () => {
    const execute = vi.fn()
    const cmd: Command = {
      id: 'test.disabled',
      name: '禁用命令',
      category: 'view',
      execute,
      isAvailable: () => false,
    }
    commandRegistry.register(cmd)

    expect(commandRegistry.execute('test.disabled')).toBe(false)
    expect(execute).not.toHaveBeenCalled()
  })

  it('isAvailable 返回 true 时执行并返回 true', () => {
    const execute = vi.fn()
    const cmd: Command = {
      id: 'test.enabled',
      name: '启用命令',
      category: 'view',
      execute,
      isAvailable: () => true,
    }
    commandRegistry.register(cmd)

    expect(commandRegistry.execute('test.enabled')).toBe(true)
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('异步 execute 命令也返回 true', () => {
    const execute = vi.fn().mockResolvedValue(undefined)
    const cmd: Command = {
      id: 'test.async',
      name: '异步命令',
      category: 'file',
      execute,
    }
    commandRegistry.register(cmd)

    expect(commandRegistry.execute('test.async')).toBe(true)
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('register 覆盖同名命令后 execute 调用新实现', () => {
    const first = vi.fn()
    const second = vi.fn()
    commandRegistry.register({
      id: 'test.override',
      name: '命令',
      category: 'view',
      execute: first,
    })
    commandRegistry.register({
      id: 'test.override',
      name: '命令',
      category: 'view',
      execute: second,
    })

    expect(commandRegistry.execute('test.override')).toBe(true)
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('unregister 后 execute 返回 false', () => {
    const execute = vi.fn()
    commandRegistry.register({
      id: 'test.removed',
      name: '已注销命令',
      category: 'view',
      execute,
    })

    commandRegistry.unregister('test.removed')
    expect(commandRegistry.execute('test.removed')).toBe(false)
    expect(execute).not.toHaveBeenCalled()
  })
})
