import { create } from 'zustand'
import { ipc, ensureStoreMigrated } from '../lib/ipc'
import { useFileStore } from '../features/file-tree/useFileStore'
import { useTabStore } from '../features/tabs/useTabStore'
import { useSearchStore } from '../features/search/useSearchStore'
import { useThemeStore } from './useThemeStore'
import { useLayoutStore } from './useLayoutStore'
import { logError } from '../logger'
import { dirname } from '../../shared/utils'
import { setLocale, type Locale } from '../../shared/i18n'
import type { RecentEntry, ThemeMode } from '../../shared/types'
import type { ThemeId } from '../lib/themes'

/**
 * Workspace 授权根 + 启动状态
 *
 * 统一管理 workspacePath / rootPaths / recentFiles / recentDirs / initialized。
 * 替代原 `useWorkspaceInit` hook 中的散乱 init 副作用与零散 IPC 调用。
 */
interface WorkspaceState {
  /** 当前 workspace 根路径（多工作区时为首个根） */
  workspacePath: string | null
  /** 已完成启动 init */
  initialized: boolean

  /**
   * 启动 init：迁移 → 读取所有持久化设置 → 恢复 workspace → 启动 watcher
   *
   * 替代原 `useWorkspaceInit` 的 init effect，由 App.tsx 在挂载时调用。
   */
  init: () => Promise<void>

  /** 打开文件夹：授权 + 设置根 + 关闭所有 tab + 记录最近目录 */
  openFolder: (path: string) => void

  /** 将文件夹添加到当前工作区（多工作区模式） */
  addFolderToWorkspace: (path: string) => Promise<void>

  /** 打开文件：若无 workspace 则以文件父目录作为工作区 */
  openFile: (path: string) => void
}

/**
 * 记录最近文件/目录条目，最多保留 20 项
 */
async function trackRecent(path: string, isDir: boolean): Promise<void> {
  const key = isDir ? 'recentDirs' : 'recentFiles'
  const items = (await ipc.store.get<RecentEntry[]>(key)) ?? []
  const name = path.split(/[\\/]/).pop() || path
  const updated = [
    { path, name, timestamp: Date.now() },
    ...items.filter((i) => i.path !== path),
  ].slice(0, 20)
  await ipc.store.set(key, updated)
}

/**
 * 校验最近条目是否存在，移除失效项并回写存储
 *
 * 同时被 useWorkspaceStore.init 与 App.tsx 中打开 recent 面板的 effect 复用。
 */
export async function validateRecentEntries(
  entries: RecentEntry[] | undefined,
  key: string,
): Promise<RecentEntry[]> {
  if (!entries || entries.length === 0) return []
  const exists = await ipc.files.checkExists(entries.map((e) => e.path))
  const valid = entries.filter((_, i) => exists[i])
  if (valid.length !== entries.length) {
    await ipc.store.set(key, valid)
  }
  return valid
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspacePath: null,
  initialized: false,

  init: async () => {
    await ensureStoreMigrated().catch((err) => logError('useWorkspaceStore:migrate', err))

    const [
      savedTheme,
      savedCodeTheme,
      savedWorkspace,
      savedOpenFiles,
      savedActiveFile,
      launchPaths,
      savedRecentFiles,
      savedRecentDirs,
    ] = await Promise.all([
      ipc.store.get<string>('theme'),
      ipc.store.get<string>('codeTheme'),
      ipc.store.get<string | null>('lastWorkspace'),
      ipc.store.get<string[]>('openFiles'),
      ipc.store.get<string | null>('activeFile'),
      ipc.app.getLaunchPaths(),
      ipc.store.get<RecentEntry[]>('recentFiles'),
      ipc.store.get<RecentEntry[]>('recentDirs'),
    ])

    // locale 同步设置
    const savedLocale = await ipc.store.get<string>('locale')
    if (savedLocale === 'en-US' || savedLocale === 'zh-CN') {
      setLocale(savedLocale as Locale)
    }

    if (savedTheme) useThemeStore.getState().setTheme(savedTheme as ThemeMode)
    if (savedCodeTheme) useThemeStore.getState().setCodeTheme(savedCodeTheme)

    // 加载 UI 布局设置
    const [sidebarWidth, outlineWidth, themeId] = await Promise.all([
      ipc.store.get<number>('sidebarWidth'),
      ipc.store.get<number>('outlineWidth'),
      ipc.store.get<string>('themeId'),
    ])
    if (typeof sidebarWidth === 'number') useLayoutStore.getState().setSidebarWidth(sidebarWidth)
    if (typeof outlineWidth === 'number') useLayoutStore.getState().setOutlineWidth(outlineWidth)
    if (themeId) useThemeStore.getState().setThemeId(themeId as ThemeId)

    // 加载文件排序设置
    await useFileStore.getState().loadSortSettings()

    // 启动路径优先于持久化 workspace
    if (launchPaths.length > 0) {
      for (const path of launchPaths) {
        try {
          const info = await ipc.files.getFileInfo(path)
          if (info.isDirectory) {
            await ipc.workspace.grant([path])
            set({ workspacePath: path })
            useFileStore.getState().setRoot(path)
            useTabStore.getState().closeAll()
            useSearchStore.getState().reset()
            await ipc.store.set('lastWorkspace', path)
            trackRecent(path, true).catch((err) => logError('useWorkspaceStore:trackRecent', err))
          } else {
            await ipc.workspace.grant([path])
            if (!useFileStore.getState().rootPath) {
              const parentDir = dirname(path)
              set({ workspacePath: parentDir })
              useFileStore.getState().setRoot(parentDir)
              await ipc.store.set('lastWorkspace', parentDir)
              trackRecent(parentDir, true).catch((err) =>
                logError('useWorkspaceStore:trackRecent', err),
              )
            }
            useTabStore.getState().openFile(path)
            trackRecent(path, false).catch((err) => logError('useWorkspaceStore:trackRecent', err))
          }
        } catch (err) {
          logError('useWorkspaceStore:launchPath', err)
        }
      }
    } else if (savedWorkspace) {
      await ipc.workspace.grant([savedWorkspace])
      set({ workspacePath: savedWorkspace })
      useFileStore.getState().setRoot(savedWorkspace)
      if (savedOpenFiles && savedOpenFiles.length > 0) {
        await ipc.workspace.grant(savedOpenFiles)
        for (const f of savedOpenFiles) useTabStore.getState().openFile(f)
        if (savedActiveFile) useTabStore.getState().setActive(savedActiveFile)
      }
    }

    // 后台校验最近文件/目录，不阻塞 UI 恢复
    validateRecentEntries(savedRecentFiles, 'recentFiles').catch((err) =>
      logError('useWorkspaceStore:validateRecentFiles', err),
    )
    validateRecentEntries(savedRecentDirs, 'recentDirs').catch((err) =>
      logError('useWorkspaceStore:validateRecentDirs', err),
    )

    set({ initialized: true })
  },

  openFolder: (path) => {
    ipc.workspace.grant([path]).catch((err) => logError('useWorkspaceStore:grant', err))
    set({ workspacePath: path })
    useFileStore.getState().setRoot(path)
    useTabStore.getState().closeAll()
    useSearchStore.getState().reset()
    ipc.store
      .set('lastWorkspace', path)
      .catch((err) => logError('useWorkspaceStore:setLastWorkspace', err))
    trackRecent(path, true).catch((err) => logError('useWorkspaceStore:trackRecent', err))
  },

  addFolderToWorkspace: async (path) => {
    await ipc.workspace.grant([path])
    await useFileStore.getState().addRoot(path)
    const { workspacePath } = get()
    if (!workspacePath) {
      set({ workspacePath: path })
      await ipc.store.set('lastWorkspace', path)
    }
    trackRecent(path, true).catch((err) => logError('useWorkspaceStore:trackRecent', err))
  },

  openFile: (path) => {
    ipc.workspace.grant([path]).catch((err) => logError('useWorkspaceStore:grant', err))
    const { workspacePath } = get()
    if (!workspacePath) {
      const parentDir = dirname(path)
      set({ workspacePath: parentDir })
      useFileStore.getState().setRoot(parentDir)
      ipc.store
        .set('lastWorkspace', parentDir)
        .catch((err) => logError('useWorkspaceStore:setLastWorkspace', err))
      trackRecent(parentDir, true).catch((err) => logError('useWorkspaceStore:trackRecent', err))
    }
    useTabStore.getState().openFile(path)
    trackRecent(path, false).catch((err) => logError('useWorkspaceStore:trackRecent', err))
  },
}))
