import { useEffect, useMemo, useRef, useState } from 'react'
import { useUIStore } from './stores/useUIStore'
import { useEditorStore } from './features/markdown-viewer/useEditorStore'
import { useTabStore } from './features/tabs/useTabStore'
import { useFileStore } from './features/file-tree/useFileStore'
import { ThemeProvider } from './components/ThemeProvider'
import { Layout } from './components/Layout'
import { AboutDialog } from './components/AboutDialog'
import { WelcomePage } from './features/welcome/WelcomePage'
import { FileTree } from './features/file-tree/FileTree'
import { TabBar } from './features/tabs/TabBar'
import { MarkdownViewer } from './features/markdown-viewer/MarkdownViewer'
import { SourceViewer } from './features/markdown-viewer/SourceViewer'
import { Outline } from './features/outline/Outline'
import { FileSearch } from './features/search/FileSearch'
import { ContentSearch } from './features/search/ContentSearch'
import { RecentFiles } from './features/search/RecentFiles'
import { SettingsPanel } from './features/settings/SettingsPanel'
import { ipc } from './lib/ipc'
import { logError } from './logger'
import { useWorkspaceInit } from './hooks/useWorkspaceInit'
import { useFileWatcher } from './hooks/useFileWatcher'
import { useScrollRestore } from './hooks/useScrollRestore'
import { EditorLoadError } from './features/markdown-viewer/EditorLoadError'
import { useContentJump } from './hooks/useContentJump'
import { useAnchorJump } from './hooks/useAnchorJump'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useMenuEvents } from './hooks/useMenuEvents'
import { useReadingStats } from './hooks/useReadingStats'
import { useSearchHighlight } from './hooks/useSearchHighlight'
import { StatusBar } from './components/StatusBar'
import { SearchHighlightBar } from './components/SearchHighlightBar'
import { isVisibleFileEntry } from '../shared/settingsDefaults'
import { isMarkdownFile } from '../shared/fileTypes'
import type { RecentEntry } from '../shared/types'

function App() {
  const [showAbout, setShowAbout] = useState(false)

  const {
    initialized,
    workspacePath,
    showSettings,
    setShowSettings,
    handleOpenFolder,
    handleOpenFile,
  } = useWorkspaceInit()

  const sidebarVisible = useUIStore((s) => s.sidebarVisible)
  const outlineVisible = useUIStore((s) => s.outlineVisible)
  const searchPanel = useUIStore((s) => s.searchPanel)
  const viewMode = useUIStore((s) => s.viewMode)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const toggleOutline = useUIStore((s) => s.toggleOutline)
  const openSearch = useUIStore((s) => s.openSearch)
  const closeSearch = useUIStore((s) => s.closeSearch)
  const setPendingContentJump = useUIStore((s) => s.setPendingContentJump)
  const searchHighlight = useUIStore((s) => s.searchHighlight)
  const setSearchHighlight = useUIStore((s) => s.setSearchHighlight)

  // 最近文件列表，在打开 recent 面板时从持久化存储加载
  const [recentFiles, setRecentFiles] = useState<RecentEntry[]>([])

  const openFiles = useTabStore((s) => s.openFiles)
  const activeFile = useTabStore((s) => s.activeFile)

  // 滚动容器元素，用 callback ref 在挂载时设置以触发 useSearchHighlight 重新计算
  const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(null)
  // 标记是否正在从内容搜索跳转，避免文件切换时清除高亮
  const isJumpingRef = useRef(false)

  const content = useEditorStore((s) => (activeFile ? s.contents[activeFile] : undefined))
  const loadError = useEditorStore((s) => (activeFile ? s.errors[activeFile] : undefined))
  const loading = useEditorStore((s) => (activeFile ? s.loading[activeFile] : false))
  const loadContent = useEditorStore((s) => s.loadContent)

  const { matchCount, currentIndex, next, prev } = useSearchHighlight(
    scrollContainer,
    searchHighlight?.query ?? null,
  )

  const entries = useFileStore((s) => s.entries)
  const allFiles = useMemo(() => {
    const files: { path: string; name: string }[] = []
    for (const dir of Object.values(entries)) {
      for (const entry of dir) {
        if (entry.isDirectory) continue
        if (entry.isTextFile !== undefined ? entry.isTextFile : entry.isMarkdown) {
          files.push({ path: entry.path, name: entry.name })
        }
      }
    }
    return files
  }, [entries])

  useEffect(() => {
    if (activeFile) {
      loadContent(activeFile)
    }
  }, [activeFile, loadContent])

  // 文件切换时清除搜索高亮（从内容搜索跳转时跳过清除）
  useEffect(() => {
    if (isJumpingRef.current) {
      isJumpingRef.current = false
      return
    }
    setSearchHighlight(null)
  }, [activeFile, setSearchHighlight])

  useEffect(() => {
    if (initialized && activeFile) {
      ipc.store.set('activeFile', activeFile)
    }
  }, [initialized, activeFile])

  useEffect(() => {
    if (initialized) {
      ipc.store.set('openFiles', openFiles)
    }
  }, [initialized, openFiles])

  useEffect(() => {
    if (!showSettings) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowSettings(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showSettings, setShowSettings])

  useEffect(() => {
    ipc.store.get<number>('sidebarWidth').then((w) => {
      if (typeof w === 'number') useUIStore.getState().setSidebarWidth(w)
    })
    ipc.store.get<number>('outlineWidth').then((w) => {
      if (typeof w === 'number') useUIStore.getState().setOutlineWidth(w)
    })
  }, [])

  // 打开最近文件面板时加载持久化的最近文件列表
  useEffect(() => {
    if (searchPanel !== 'recent') return
    ipc.store
      .get<RecentEntry[]>('recentFiles')
      .then((entries) => {
        if (Array.isArray(entries)) setRecentFiles(entries)
      })
      .catch((err) => logError('App:loadRecentFiles', err))
  }, [searchPanel])

  useFileWatcher(openFiles, initialized)
  useScrollRestore(activeFile, content, viewMode)
  useContentJump(activeFile, content)
  useAnchorJump(activeFile, content)
  const readingStats = useReadingStats(content)
  useKeyboardShortcuts({
    onOpenFolder: async () => {
      const path = await ipc.dialog.openDirectory()
      if (path) handleOpenFolder(path)
    },
    onToggleSidebar: toggleSidebar,
    onToggleOutline: toggleOutline,
    onOpenFileSearch: () => openSearch('file'),
    onOpenContentSearch: () => openSearch('content'),
    onOpenRecentFiles: () => openSearch('recent'),
    onToggleSettings: () => setShowSettings((v) => !v),
    onToggleViewMode: () => useUIStore.getState().toggleViewMode(),
  })

  useMenuEvents({
    onOpenFolder: async () => {
      const path = await ipc.dialog.openDirectory()
      if (path) handleOpenFolder(path)
    },
    onOpenFile: async () => {
      const path = await ipc.dialog.openFile()
      if (path) handleOpenFile(path)
    },
    onToggleSidebar: toggleSidebar,
    onToggleOutline: toggleOutline,
    onOpenFileSearch: () => openSearch('file'),
    onOpenContentSearch: () => openSearch('content'),
    onToggleSettings: () => setShowSettings((v) => !v),
    onShowAbout: () => setShowAbout(true),
    onToggleViewMode: () => useUIStore.getState().toggleViewMode(),
  })

  return (
    <ThemeProvider>
      <AboutDialog isOpen={showAbout} onClose={() => setShowAbout(false)} />
      <Layout
        sidebar={
          <div>
            {workspacePath ? (
              <>
                <FileTree rootPath={workspacePath} />
                <div className="border-t border-gray-200 dark:border-gray-700">
                  {searchPanel === 'file' && (
                    <FileSearch
                      files={allFiles}
                      onSelect={(p) => {
                        handleOpenFile(p)
                        closeSearch()
                      }}
                    />
                  )}
                  {searchPanel === 'content' && (
                    <ContentSearch
                      workspacePath={workspacePath}
                      onSelect={(match) => {
                        // 仅当目标文件与当前文件不同时设置跳转标志，
                        // 避免文件切换 useEffect 清除 searchHighlight。
                        // 若点击的是当前文件，activeFile 不变，effect 不运行，无需标志。
                        if (useTabStore.getState().activeFile !== match.path) {
                          isJumpingRef.current = true
                        }
                        setPendingContentJump({
                          path: match.path,
                          line: match.line,
                          lineContent: match.lineContent,
                        })
                        setSearchHighlight(match.matchText)
                        handleOpenFile(match.path)
                        closeSearch()
                      }}
                    />
                  )}
                  {searchPanel === 'recent' && (
                    <RecentFiles
                      files={recentFiles}
                      onSelect={(path) => {
                        handleOpenFile(path)
                        closeSearch()
                      }}
                      onClose={closeSearch}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="p-3">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-2 py-1">
                  Explorer
                </div>
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-400 dark:text-gray-500 text-xs">No folder opened</p>
                </div>
              </div>
            )}
          </div>
        }
        main={
          showSettings ? (
            <SettingsPanel onClose={() => setShowSettings(false)} />
          ) : openFiles.length > 0 ? (
            <div className="h-full flex flex-col">
              <TabBar />
              {searchHighlight && (
                <SearchHighlightBar
                  matchCount={matchCount}
                  currentIndex={currentIndex}
                  onNext={next}
                  onPrev={prev}
                  onClose={() => setSearchHighlight(null)}
                />
              )}
              <div
                ref={setScrollContainer}
                className="flex-1 overflow-y-auto"
                data-scroll-container
              >
                {loadError ? (
                  <EditorLoadError
                    message={loadError}
                    onRetry={() => activeFile && loadContent(activeFile)}
                  />
                ) : content !== undefined ? (
                  activeFile && isMarkdownFile(activeFile) ? (
                    viewMode === 'source' ? (
                      <SourceViewer content={content} filePath={activeFile} />
                    ) : (
                      <MarkdownViewer content={content} filePath={activeFile} />
                    )
                  ) : (
                    <SourceViewer content={content} filePath={activeFile ?? undefined} />
                  )
                ) : loading ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Loading...
                  </div>
                ) : null}
              </div>
              <StatusBar stats={readingStats} />
            </div>
          ) : (
            <WelcomePage onFolderOpen={handleOpenFolder} onFileOpen={handleOpenFile} />
          )
        }
        outline={
          activeFile && content && isMarkdownFile(activeFile) ? <Outline content={content} /> : null
        }
        sidebarVisible={sidebarVisible}
        outlineVisible={outlineVisible}
      />
    </ThemeProvider>
  )
}

export default App
