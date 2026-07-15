import { useEffect } from 'react'
import { commandRegistry, type Command } from './commands'
import { useCommandStore } from '../../stores/useCommandStore'
import { useUIStore } from '../../stores/useUIStore'
import { useTabStore } from '../tabs/useTabStore'

/**
 * 命令注册 hook 接收的命令定义工厂
 */
export interface CommandFactoryContext {
  /** 打开文件夹 */
  openFolder: () => Promise<void> | void
  /** 切换侧边栏 */
  toggleSidebar: () => void
  /** 切换大纲 */
  toggleOutline: () => void
  /** 切换设置 */
  toggleSettings: () => void
  /** 切换源码/渲染视图 */
  toggleViewMode: () => void
  /** 打开文件搜索 */
  openFileSearch: () => void
  /** 打开内容搜索 */
  openContentSearch: () => void
  /** 打开最近文件 */
  openRecentFiles: () => void
  /** 关闭当前标签 */
  closeActiveTab: () => void
  /** 打开命令面板 */
  openCommandPalette: () => void
  /** 打开每日笔记 */
  openDailyNote: () => Promise<void> | void
  /** 导出 PDF */
  exportPdf: () => Promise<void> | void
  /** 导出 HTML */
  exportHtml: () => Promise<void> | void
}

/**
 * 内部：根据上下文创建命令列表
 */
function buildCommands(ctx: CommandFactoryContext): Command[] {
  return [
    {
      id: 'commandPalette.open',
      name: '打开命令面板',
      alias: 'Open Command Palette',
      category: 'view',
      execute: ctx.openCommandPalette,
    },
    {
      id: 'file.openFolder',
      name: '打开文件夹',
      alias: 'Open Folder',
      category: 'file',
      execute: () => void ctx.openFolder(),
    },
    {
      id: 'view.toggleSidebar',
      name: '切换侧边栏',
      alias: 'Toggle Sidebar',
      category: 'view',
      execute: ctx.toggleSidebar,
    },
    {
      id: 'view.toggleOutline',
      name: '切换大纲',
      alias: 'Toggle Outline',
      category: 'view',
      execute: ctx.toggleOutline,
    },
    {
      id: 'settings.open',
      name: '打开设置',
      alias: 'Open Settings',
      category: 'settings',
      execute: ctx.toggleSettings,
    },
    {
      id: 'view.toggleViewMode',
      name: '切换源码/渲染视图',
      alias: 'Toggle View Mode',
      category: 'view',
      execute: ctx.toggleViewMode,
    },
    {
      id: 'search.openFile',
      name: '文件搜索',
      alias: 'Search File',
      category: 'search',
      execute: ctx.openFileSearch,
    },
    {
      id: 'search.openContent',
      name: '全局内容搜索',
      alias: 'Search Content',
      category: 'search',
      execute: ctx.openContentSearch,
    },
    {
      id: 'search.openRecent',
      name: '快速切换最近文件',
      alias: 'Recent Files',
      category: 'search',
      execute: ctx.openRecentFiles,
    },
    {
      id: 'tab.closeActive',
      name: '关闭当前标签',
      alias: 'Close Tab',
      category: 'workspace',
      execute: ctx.closeActiveTab,
      isAvailable: () => useTabStore.getState().activeFile !== null,
    },
    {
      id: 'dailyNote.open',
      name: '打开今日笔记',
      alias: "Today's Note",
      category: 'file',
      execute: () => void ctx.openDailyNote(),
    },
    {
      id: 'export.pdf',
      name: '导出为 PDF',
      alias: 'Export PDF',
      category: 'file',
      execute: () => void ctx.exportPdf(),
      isAvailable: () => useTabStore.getState().activeFile !== null,
    },
    {
      id: 'export.html',
      name: '导出为 HTML',
      alias: 'Export HTML',
      category: 'file',
      execute: () => void ctx.exportHtml(),
      isAvailable: () => useTabStore.getState().activeFile !== null,
    },
  ]
}

/**
 * 在 App 启动时注册一组命令
 *
 * 卸载时自动注销以避免重复注册。
 * 内部 commandStore 引用使用稳定闭包，避免每次渲染重建。
 */
export function useRegisterCommands(
  overrides?: Partial<{
    openFolder: CommandFactoryContext['openFolder']
    toggleSettings: CommandFactoryContext['toggleSettings']
    openDailyNote: CommandFactoryContext['openDailyNote']
    exportPdf: CommandFactoryContext['exportPdf']
    exportHtml: CommandFactoryContext['exportHtml']
  }>,
): void {
  useEffect(() => {
    const ctx: CommandFactoryContext = {
      openFolder: overrides?.openFolder ?? (() => undefined),
      toggleSidebar: () => useUIStore.getState().toggleSidebar(),
      toggleOutline: () => useUIStore.getState().toggleOutline(),
      toggleSettings: overrides?.toggleSettings ?? (() => undefined),
      toggleViewMode: () => useUIStore.getState().toggleViewMode(),
      openFileSearch: () => useUIStore.getState().openSearch('file'),
      openContentSearch: () => useUIStore.getState().openSearch('content'),
      openRecentFiles: () => useUIStore.getState().openSearch('recent'),
      closeActiveTab: () => {
        const s = useTabStore.getState()
        if (s.activeFile) s.closeFile(s.activeFile)
      },
      openCommandPalette: () => useCommandStore.getState().show(),
      openDailyNote: overrides?.openDailyNote ?? (() => undefined),
      exportPdf: overrides?.exportPdf ?? (() => undefined),
      exportHtml: overrides?.exportHtml ?? (() => undefined),
    }
    const commands = buildCommands(ctx)
    for (const cmd of commands) {
      commandRegistry.register(cmd)
    }
    return () => {
      for (const cmd of commands) {
        commandRegistry.unregister(cmd.id)
      }
    }
    // 仅在 overrides 引用变化时重新注册；避免每次渲染都重建
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrides])
}
