import { describe, it, expect, beforeEach } from 'vitest'
import { commandRegistry, type Command } from './commands'

describe('commandRegistry', () => {
  beforeEach(() => {
    // 清理所有注册的命令
    commandRegistry.getAll().forEach((c) => commandRegistry.unregister(c.id))
  })

  it('should register a command', () => {
    const cmd: Command = {
      id: 'test.cmd',
      name: '测试命令',
      category: 'file',
      execute: () => {},
    }
    commandRegistry.register(cmd)
    expect(commandRegistry.getAll()).toHaveLength(1)
    expect(commandRegistry.getAll()[0].id).toBe('test.cmd')
  })

  it('should overwrite command with same id', () => {
    const cmd1: Command = {
      id: 'test.cmd',
      name: '原命令',
      category: 'file',
      execute: () => {},
    }
    const cmd2: Command = {
      id: 'test.cmd',
      name: '新命令',
      category: 'file',
      execute: () => {},
    }
    commandRegistry.register(cmd1)
    commandRegistry.register(cmd2)
    expect(commandRegistry.getAll()).toHaveLength(1)
    expect(commandRegistry.getAll()[0].name).toBe('新命令')
  })

  it('should unregister a command', () => {
    const cmd: Command = {
      id: 'test.cmd',
      name: '测试命令',
      category: 'file',
      execute: () => {},
    }
    commandRegistry.register(cmd)
    commandRegistry.unregister('test.cmd')
    expect(commandRegistry.getAll()).toHaveLength(0)
  })

  it('should execute a command', () => {
    let executed = false
    const cmd: Command = {
      id: 'test.cmd',
      name: '测试命令',
      category: 'file',
      execute: () => {
        executed = true
      },
    }
    commandRegistry.register(cmd)
    commandRegistry.getAll()[0].execute()
    expect(executed).toBe(true)
  })
})
