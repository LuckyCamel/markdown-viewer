import { useState, useEffect, useCallback } from 'react'
import { useUIStore } from '../stores/useUIStore'
import { useSettingsStore } from '../features/settings/useSettingsStore'
import { useTabStore } from '../features/tabs/useTabStore'
import { useFileStore } from '../features/file-tree/useFileStore'
import { useSearchStore } from '../features/search/useSearchStore'
import { ipc } from '../lib/ipc'

export function useWorkspaceInit() {
  const [workspacePath, setWorkspacePath] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const setTheme = useUIStore((s) => s.setTheme)

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
      setWorkspacePath(path)
      useFileStore.getState().setRoot(path)
      useTabStore.getState().closeAll()
      useSearchStore.getState().reset()
      ipc.store.set('lastWorkspace', path)
      trackRecent(path, true)
    },
    [trackRecent],
  )

  const handleOpenFile = useCallback(
    (path: string) => {
      useTabStore.getState().openFile(path)
      trackRecent(path, false)
    },
    [trackRecent],
  )

  useEffect(() => {
    async function init() {
      const [savedTheme, savedWorkspace, savedOpenFiles, savedActiveFile, savedIgnoreList] =
        await Promise.all([
          ipc.store.get<ReturnType<typeof useUIStore.getState>['theme']>('theme'),
          ipc.store.get<string | null>('lastWorkspace'),
          ipc.store.get<string[]>('openFiles'),
          ipc.store.get<string | null>('activeFile'),
          ipc.store.get<string[]>('ignoreList'),
        ])

      if (savedTheme) setTheme(savedTheme)
      if (savedIgnoreList) useSettingsStore.getState().setIgnoreList(savedIgnoreList)
      if (savedWorkspace) {
        setWorkspacePath(savedWorkspace)
        useFileStore.getState().setRoot(savedWorkspace)
      }
      if (savedOpenFiles && savedOpenFiles.length > 0) {
        for (const f of savedOpenFiles) useTabStore.getState().openFile(f)
        if (savedActiveFile) useTabStore.getState().setActive(savedActiveFile)
      }
      setInitialized(true)
    }
    init()
  }, [setTheme])

  return {
    initialized,
    workspacePath,
    showSettings,
    setShowSettings,
    handleOpenFolder,
    handleOpenFile,
  }
}
