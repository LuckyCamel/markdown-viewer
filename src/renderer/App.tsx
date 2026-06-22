import { useEffect, useMemo, useState, useCallback } from 'react'
import { useUIStore } from './stores/useUIStore'
import { useEditorStore } from './stores/useEditorStore'
import { useSettingsStore } from './stores/useSettingsStore'
import { useTabStore } from './features/tabs/useTabStore'
import { useFileStore } from './features/file-tree/useFileStore'
import { useSearchStore } from './features/search/useSearchStore'
import { ThemeProvider } from './components/ThemeProvider'
import { Layout } from './components/Layout'
import { WelcomePage } from './features/welcome/WelcomePage'
import { FileTree } from './features/file-tree/FileTree'
import { TabBar } from './features/tabs/TabBar'
import { MarkdownViewer } from './features/markdown-viewer/MarkdownViewer'
import { Outline } from './features/outline/Outline'
import { FileSearch } from './features/search/FileSearch'
import { ContentSearch } from './features/search/ContentSearch'
import { SettingsPanel } from './features/settings/SettingsPanel'
import type { FileChangeEvent, FileEntry } from '../shared/types'

function App() {
  const [workspacePath, setWorkspacePath] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)
  const sidebarVisible = useUIStore((s) => s.sidebarVisible)
  const outlineVisible = useUIStore((s) => s.outlineVisible)
  const searchPanel = useUIStore((s) => s.searchPanel)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const toggleOutline = useUIStore((s) => s.toggleOutline)
  const openSearch = useUIStore((s) => s.openSearch)
  const closeSearch = useUIStore((s) => s.closeSearch)

  const openFiles = useTabStore((s) => s.openFiles)
  const activeFile = useTabStore((s) => s.activeFile)
  const openFile = useTabStore((s) => s.openFile)
  const closeFile = useTabStore((s) => s.closeFile)
  const setActive = useTabStore((s) => s.setActive)

  const content = useEditorStore((s) => activeFile ? s.contents[activeFile] : undefined)
  const loadContent = useEditorStore((s) => s.loadContent)

  const trackRecent = useCallback(async (path: string, isDir: boolean) => {
    const key = isDir ? 'recentDirs' : 'recentFiles'
    const items = (await window.api.store.get<{ path: string; name: string; timestamp: number }[]>(key)) || []
    const name = path.split(/[\\/]/).pop() || path
    const updated = [
      { path, name, timestamp: Date.now() },
      ...items.filter((i) => i.path !== path),
    ].slice(0, 20)
    await window.api.store.set(key, updated)
  }, [])

  const handleOpenFolder = useCallback((path: string) => {
    setWorkspacePath(path)
    useFileStore.getState().setRoot(path)
    useTabStore.getState().closeAll()
    useSearchStore.getState().reset()
    window.api.store.set('lastWorkspace', path)
    trackRecent(path, true)
  }, [trackRecent])

  const handleOpenFile = useCallback((path: string) => {
    useTabStore.getState().openFile(path)
    trackRecent(path, false)
  }, [trackRecent])

  useEffect(() => {
    async function init() {
      const [savedTheme, savedWorkspace, savedOpenFiles, savedActiveFile, savedIgnoreList] =
        await Promise.all([
          window.api.store.get<typeof theme>('theme'),
          window.api.store.get<string | null>('lastWorkspace'),
          window.api.store.get<string[]>('openFiles'),
          window.api.store.get<string | null>('activeFile'),
          window.api.store.get<string[]>('ignoreList'),
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

  useEffect(() => {
    if (activeFile) {
      loadContent(activeFile)
    }
  }, [activeFile, loadContent])

  useEffect(() => {
    openFiles.forEach((p) => window.api.watcher.watchFile(p))
    const onChange = (event: FileChangeEvent, fileContent: string | null) => {
      if (event.type === 'change' && fileContent !== null) {
        useEditorStore.getState().setContent(event.path, fileContent)
        useTabStore.getState().markDirty(event.path)
        setTimeout(() => useTabStore.getState().clearDirty(event.path), 2000)
      }
    }
    window.api.watcher.onChange(onChange)
    return () => {
      openFiles.forEach((p) => window.api.watcher.unwatchFile(p))
      window.api.watcher.offChange(onChange)
    }
  }, [openFiles])

  useEffect(() => {
    if (initialized && activeFile) {
      window.api.store.set('activeFile', activeFile)
    }
  }, [initialized, activeFile])

  useEffect(() => {
    if (initialized) {
      window.api.store.set('openFiles', openFiles)
    }
  }, [initialized, openFiles])

  useEffect(() => {
    if (!activeFile) return
    const container = document.querySelector('main > div:first-child')
    if (!container) return

    const handleScroll = () => {
      window.api.store.set('readingPositions', {
        [activeFile]: container.scrollTop,
      })
    }
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [activeFile])

  useEffect(() => {
    if (!activeFile || !content) return
    ;(async () => {
      const positions = await window.api.store.get<Record<string, number>>('readingPositions')
      if (positions?.[activeFile]) {
        const container = document.querySelector('main > div:first-child')
        if (container) {
          requestAnimationFrame(() => { container.scrollTop = positions[activeFile] })
        }
      }
    })()
  }, [activeFile, content])

  useEffect(() => {
    const handlers: Array<() => void> = []

    function onMenu(channel: string, cb: (...args: unknown[]) => void) {
      window.api.ipc.on(channel, cb)
      handlers.push(() => window.api.ipc.off(channel, cb))
    }

    onMenu('menu:openFolder', (path) => {
      handleOpenFolder(path as string)
    })
    onMenu('menu:toggleFileTree', () => toggleSidebar())
    onMenu('menu:toggleOutline', () => toggleOutline())
    onMenu('menu:fileSearch', () => openSearch('file'))
    onMenu('menu:contentSearch', () => openSearch('content'))
    onMenu('menu:openSettings', () => setShowSettings((v) => !v))
    onMenu('menu:closeTab', () => {
      const state = useTabStore.getState()
      if (state.activeFile) state.closeFile(state.activeFile)
    })
    onMenu('menu:nextTab', () => {
      const state = useTabStore.getState()
      if (state.openFiles.length < 2) return
      const idx = state.openFiles.indexOf(state.activeFile ?? '')
      const next = (idx + 1) % state.openFiles.length
      state.setActive(state.openFiles[next])
    })
    onMenu('menu:prevTab', () => {
      const state = useTabStore.getState()
      if (state.openFiles.length < 2) return
      const idx = state.openFiles.indexOf(state.activeFile ?? '')
      const prev = (idx - 1 + state.openFiles.length) % state.openFiles.length
      state.setActive(state.openFiles[prev])
    })

    return () => handlers.forEach((h) => h())
  }, [handleOpenFolder, toggleSidebar, toggleOutline, openSearch])

  const allFiles = useMemo(() => {
    const entries = useFileStore.getState().entries
    const files: { path: string; name: string }[] = []
    for (const dir of Object.values(entries)) {
      for (const entry of dir) {
        if (!entry.isDirectory) {
          files.push({ path: entry.path, name: entry.name })
        }
      }
    }
    return files
  }, [workspacePath])

  if (!workspacePath) {
    return (
      <ThemeProvider>
        <WelcomePage onFolderOpen={handleOpenFolder} />
      </ThemeProvider>
    )
  }

  const sidebarContent = (
    <div>
      <FileTree rootPath={workspacePath} />
      <div className="border-t border-gray-200 dark:border-gray-700">
        {searchPanel === 'file' && (
          <FileSearch files={allFiles} onSelect={(p) => { handleOpenFile(p); closeSearch() }} />
        )}
        {searchPanel === 'content' && (
          <ContentSearch workspacePath={workspacePath} onSelect={(p) => { handleOpenFile(p); closeSearch() }} />
        )}
      </div>
    </div>
  )

  const mainContent = showSettings ? (
    <SettingsPanel />
  ) : openFiles.length > 0 ? (
    <div className="h-full flex flex-col">
      <TabBar />
      <div className="flex-1 overflow-y-auto">
        {content !== undefined ? (
          <MarkdownViewer content={content} filePath={activeFile ?? undefined} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
        )}
      </div>
    </div>
  ) : (
    <WelcomePage onFolderOpen={handleOpenFolder} />
  )

  const outlineContent = content ? (
    <Outline content={content} />
  ) : null

  return (
    <ThemeProvider>
      <Layout
        sidebar={sidebarContent}
        main={mainContent}
        outline={outlineContent}
        sidebarVisible={sidebarVisible}
        outlineVisible={outlineVisible}
      />
    </ThemeProvider>
  )
}

export default App
