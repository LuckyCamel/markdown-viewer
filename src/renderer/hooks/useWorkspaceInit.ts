import { useState, useEffect, useCallback } from 'react'
import { useUIStore } from '../stores/useUIStore'
import { useSettingsStore } from '../features/settings/useSettingsStore'
import { useTabStore } from '../features/tabs/useTabStore'
import { useFileStore } from '../features/file-tree/useFileStore'
import { useSearchStore } from '../features/search/useSearchStore'
import { ipc, ensureStoreMigrated } from '../lib/ipc'
import { logError } from '../logger'
import { dirname } from '../../shared/utils'
import { setLocale, type Locale } from '../../shared/i18n'
import type { RecentEntry } from '../../shared/types'

/**
 * 授权路径供 plugin-fs 读取；失败仅记录日志
 */
function grantPaths(paths: string[]): void {
  ipc.scope.grantFsScope(paths).catch((err) => logError('useWorkspaceInit:grantFsScope', err))
}

/**
 * 校验最近文件/目录条目是否存在，移除失效条目并回写存储
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

export function useWorkspaceInit() {
  const [workspacePath, setWorkspacePath] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const setTheme = useUIStore((s) => s.setTheme)
  const setCodeTheme = useUIStore((s) => s.setCodeTheme)

  const trackRecent = useCallback(async (path: string, isDir: boolean) => {
    const key = isDir ? 'recentDirs' : 'recentFiles'
    const items =
      (await ipc.store.get<{ path: string; name: string; timestamp: number }[]>(key)) || []
    const name = path.split(/[\\/]/).pop() || path
    const updated = [
      { path, name, timestamp: Date.now() },
      ...items.filter((i) => i.path !== path),
    ].slice(0, 20)
    await ipc.store.set(key, updated)
  }, [])

  const handleOpenFolder = useCallback(
    (path: string) => {
      grantPaths([path])
      setWorkspacePath(path)
      useFileStore.getState().setRoot(path)
      useTabStore.getState().closeAll()
      useSearchStore.getState().reset()
      ipc.store
        .set('lastWorkspace', path)
        .catch((err) => logError('useWorkspaceInit:setLastWorkspace', err))
      trackRecent(path, true).catch((err) => logError('useWorkspaceInit:trackRecent', err))
    },
    [trackRecent],
  )

  /**
   * 将文件夹添加到当前工作区（多工作区模式）
   */
  const handleAddFolderToWorkspace = useCallback(
    async (path: string) => {
      grantPaths([path])
      await useFileStore.getState().addRoot(path)
      if (!workspacePath) {
        setWorkspacePath(path)
        ipc.store
          .set('lastWorkspace', path)
          .catch((err) => logError('useWorkspaceInit:setLastWorkspace', err))
      }
      trackRecent(path, true).catch((err) => logError('useWorkspaceInit:trackRecent', err))
    },
    [trackRecent, workspacePath],
  )

  /**
   * 打开文件；若无 workspace 则以文件父目录作为工作区
   */
  const handleOpenFile = useCallback(
    (path: string) => {
      grantPaths([path])
      if (!workspacePath) {
        const parentDir = dirname(path)
        setWorkspacePath(parentDir)
        useFileStore.getState().setRoot(parentDir)
        ipc.store
          .set('lastWorkspace', parentDir)
          .catch((err) => logError('useWorkspaceInit:setLastWorkspace', err))
        trackRecent(parentDir, true).catch((err) => logError('useWorkspaceInit:trackRecent', err))
      }
      useTabStore.getState().openFile(path)
      trackRecent(path, false).catch((err) => logError('useWorkspaceInit:trackRecent', err))
    },
    [trackRecent, workspacePath],
  )

  useEffect(() => {
    async function init() {
      await ensureStoreMigrated().catch((err) => logError('useWorkspaceInit:migrateStore', err))

      const [
        savedTheme,
        savedCodeTheme,
        savedWorkspace,
        savedOpenFiles,
        savedActiveFile,
        savedIgnoreList,
        savedExtensions,
        launchPaths,
        savedRecentFiles,
        savedRecentDirs,
      ] = await Promise.all([
        ipc.store.get<ReturnType<typeof useUIStore.getState>['theme']>('theme'),
        ipc.store.get<string>('codeTheme'),
        ipc.store.get<string | null>('lastWorkspace'),
        ipc.store.get<string[]>('openFiles'),
        ipc.store.get<string | null>('activeFile'),
        ipc.store.get<string[]>('ignoreList'),
        ipc.store.get<string[]>('markdownExtensions'),
        ipc.app.getLaunchPaths(),
        ipc.store.get<RecentEntry[]>('recentFiles'),
        ipc.store.get<RecentEntry[]>('recentDirs'),
        ipc.store.get<string>('locale').then((locale) => {
          if (locale === 'en-US' || locale === 'zh-CN') {
            setLocale(locale as Locale)
          }
        }),
      ])

      if (savedTheme) setTheme(savedTheme)
      if (savedCodeTheme) setCodeTheme(savedCodeTheme)
      if (savedIgnoreList) useSettingsStore.getState().setIgnoreList(savedIgnoreList)
      if (savedExtensions) useSettingsStore.getState().setMarkdownExtensions(savedExtensions)

      // 加载文件排序设置
      await useFileStore.getState().loadSortSettings()

      const ignoreList = useSettingsStore.getState().ignoreList
      const markdownExtensions = useSettingsStore.getState().markdownExtensions
      ipc.files
        .updateSettings(ignoreList, markdownExtensions)
        .catch((err) => logError('useWorkspaceInit:updateSettings', err))

      if (launchPaths.length > 0) {
        for (const path of launchPaths) {
          try {
            const info = await ipc.files.getFileInfo(path)
            if (info.isDirectory) {
              grantPaths([path])
              setWorkspacePath(path)
              useFileStore.getState().setRoot(path)
              useTabStore.getState().closeAll()
              useSearchStore.getState().reset()
              ipc.store
                .set('lastWorkspace', path)
                .catch((err) => logError('useWorkspaceInit:setLastWorkspace', err))
              trackRecent(path, true).catch((err) => logError('useWorkspaceInit:trackRecent', err))
            } else {
              grantPaths([path])
              if (!useFileStore.getState().rootPath) {
                const parentDir = dirname(path)
                setWorkspacePath(parentDir)
                useFileStore.getState().setRoot(parentDir)
                ipc.store
                  .set('lastWorkspace', parentDir)
                  .catch((err) => logError('useWorkspaceInit:setLastWorkspace', err))
                trackRecent(parentDir, true).catch((err) =>
                  logError('useWorkspaceInit:trackRecent', err),
                )
              }
              useTabStore.getState().openFile(path)
              trackRecent(path, false).catch((err) => logError('useWorkspaceInit:trackRecent', err))
            }
          } catch (err) {
            logError('useWorkspaceInit:launchPath', err)
          }
        }
      } else {
        if (savedWorkspace) {
          grantPaths([savedWorkspace])
          setWorkspacePath(savedWorkspace)
          useFileStore.getState().setRoot(savedWorkspace)
        }
        if (savedOpenFiles && savedOpenFiles.length > 0) {
          grantPaths(savedOpenFiles)
          for (const f of savedOpenFiles) useTabStore.getState().openFile(f)
          if (savedActiveFile) useTabStore.getState().setActive(savedActiveFile)
        }
      }

      // 后台校验最近文件/目录，移除失效条目；不阻塞 UI 恢复
      validateRecentEntries(savedRecentFiles, 'recentFiles').catch((err) =>
        logError('useWorkspaceInit:validateRecentFiles', err),
      )
      validateRecentEntries(savedRecentDirs, 'recentDirs').catch((err) =>
        logError('useWorkspaceInit:validateRecentDirs', err),
      )

      setInitialized(true)
    }
    init().catch((err) => logError('useWorkspaceInit:init', err))
  }, [setTheme, setCodeTheme, trackRecent])

  return {
    initialized,
    workspacePath,
    showSettings,
    setShowSettings,
    handleOpenFolder,
    handleAddFolderToWorkspace,
    handleOpenFile,
  }
}
