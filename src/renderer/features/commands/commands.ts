/**
 * 命令注册中心
 *
 * 用于集中管理应用命令，命令面板可模糊匹配执行。
 */

import type { ReactNode } from 'react'

/** 命令分类 */
export type CommandCategory = 'file' | 'view' | 'search' | 'settings' | 'workspace'

/** 命令定义 */
export interface Command {
  /** 命令唯一标识 */
  id: string
  /** 命令显示名称 */
  name: string
  /** 命令英文别名（用于搜索） */
  alias?: string
  /** 命令分类 */
  category: CommandCategory
  /** 命令图标 */
  icon?: ReactNode
  /** 执行回调 */
  execute: () => void | Promise<void>
  /** 是否当前可用 */
  isAvailable?: () => boolean
}

/**
 * 命令注册中心（单例）
 */
class CommandRegistry {
  private commands: Map<string, Command> = new Map()

  /** 注册命令（已存在则覆盖） */
  register(command: Command): void {
    this.commands.set(command.id, command)
  }

  /** 注销命令 */
  unregister(id: string): void {
    this.commands.delete(id)
  }

  /** 获取所有已注册命令 */
  getAll(): Command[] {
    return Array.from(this.commands.values())
  }

  /** 获取指定分类的命令 */
  getByCategory(category: CommandCategory): Command[] {
    return this.getAll().filter((c) => c.category === category)
  }

  /** 根据 ID 获取命令 */
  getById(id: string): Command | undefined {
    return this.commands.get(id)
  }

  /** 清理所有命令 */
  clear(): void {
    this.commands.clear()
  }
}

/** 全局命令注册中心实例 */
export const commandRegistry = new CommandRegistry()
