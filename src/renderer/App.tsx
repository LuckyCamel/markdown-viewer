import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLayoutStore } from './stores/useLayoutStore'
import { useNavigationStore } from './stores/useNavigationStore'
import { useEditorStore } from './features/markdown-viewer/useEditorStore'
import { useTabStore } from './features/tabs/useTabStore'
import { useFileStore } from './features/file-tree/useFileStore'
import { ThemeProvider } from './components/ThemeProvider'
import { Layout } from './components/Layout'
import { AboutDialog } from './components/AboutDialog'
import { CommandPalette } from './components/CommandPalette'
import { useRegisterCommands } from './features/commands/useRegisterCommands'
import { useCommandStore } from './stores/useCommandStore'
import { WelcomePage } from './features/welcome/WelcomePage'
import { FileTree } from './features/file-tree/FileTree'
import { Favorites } from './features/file-tree/Favorites'
import { useFavoritesStore } from './features/file-tree/useFavoritesStore'
import { TabBar } from './features/tabs/TabBar'
import { MarkdownViewer } from './features/markdown-viewer/MarkdownViewer'
import { SourceViewer } from './features/markdown-viewer/SourceViewer'
import { EditorPane } from './features/markdown-viewer/EditorPane'
import { useEditorDocument } from './features/markdown-viewer/useEditorDocument'
import { Outline } from './features/outline/Outline'
import { FileSearch } from './features/search/FileSearch'
import { ContentSearch } from './features/search/ContentSearch'
import { RecentFiles } from './features/search/RecentFiles'
import { useSearchStore } from './features/search/useSearchStore'
import { SettingsPanel } from './features/settings/SettingsPanel'
import { ipc } from './lib/ipc'
import { exportAsHtml, exportAsPdf } from './lib/exporter'
import { openTodaysNote } from './lib/dailyNote'
import { logError } from './logger'
import { useWorkspaceStore, validateRecentEntries } from './stores/useWorkspaceStore'
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
import { getDocumentSurface } from './lib/surface'
import type { RecentEntry } from '../shared/types'

function App() {
  const [showAbout, setShowAbout] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // 启动 init：在挂载时调用一次
  useEffect(() => {
    useWorkspaceStore
      .getState()
      .init()
      .catch((err) => logError('App:init', err))
    useFavoritesStore.getState().loadFavorites()
  }, [])

  const initialized = useWorkspaceStore((s) => s.initialized)
  const workspacePath = useWorkspaceStore((s) => s.workspacePath)
  const handleOpenFolder = useWorkspaceStore((s) => s.openFolder)
  const handleAddFolderToWorkspace = useWorkspaceStore((s) => s.addFolderToWorkspace)
  const handleOpenFile = useWorkspaceStore((s) => s.openFile)

  const sidebarVisible = useLayoutStore((s) => s.sidebarVisible)
  const outlineVisible = useLayoutStore((s) => s.outlineVisible)
  const searchPanel = useLayoutStore((s) => s.searchPanel)
  const closeSearch = useLayoutStore((s) => s.closeSearch)
  const setPendingContentJump = useNavigationStore((s) => s.setPendingContentJump)
  const searchHighlight = useNavigationStore((s) => s.searchHighlight)
  const setSearchHighlight = useNavigationStore((s) => s.setSearchHighlight)

  // 最近文件列表，在打开 recent 面板时从持久化存储加载
  const [recentFiles, setRecentFiles] = useState<RecentEntry[]>([])

  const openFiles = useTabStore((s) => s.openFiles)
  const activeFile = useTabStore((s) => s.activeFile)
  const viewModes = useTabStore((s) => s.viewModes)
  const viewMode = activeFile ? (viewModes[activeFile] ?? 'read') : 'read'

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

  // 打开最近文件面板时加载持久化的最近文件列表，并校验失效条目
  useEffect(() => {
    if (searchPanel !== 'recent') return
    ipc.store
      .get<RecentEntry[]>('recentFiles')
      .then((entries) =>
        validateRecentEntries(Array.isArray(entries) ? entries : [], 'recentFiles'),
      )
      .then((valid) => setRecentFiles(valid))
      .catch((err) => logError('App:loadRecentFiles', err))
  }, [searchPanel])

  // 活动文件的表面信息，用于决定渲染策略
  const surface = useMemo(() => {
    if (!activeFile) return null
    return getDocumentSurface(activeFile, viewMode, { isLoading: loading, hasError: !!loadError })
  }, [activeFile, viewMode, loading, loadError])

  // 活动 Markdown 的编辑会话（任意视图模式均挂载，保证 StatusBar / Ctrl+S 可用）
  const sessionFilePath = surface?.capabilities.hasSession ? activeFile : null
  const { saveStatus, forceSave, loadDisk, keepMine, setContent, handleExternalChange } =
    useEditorDocument(sessionFilePath)

  const handleExternalFileChange = useCallback(
    (path: string, content: string, mtime: number) => {
      if (path === sessionFilePath) {
        handleExternalChange(content, mtime)
      }
    },
    [sessionFilePath, handleExternalChange],
  )

  useFileWatcher(openFiles, initialized, { onExternalChange: handleExternalFileChange })
  useScrollRestore(activeFile, content, viewMode)
  useContentJump(activeFile, content)
  useAnchorJump(activeFile, content)
  const readingStats = useReadingStats(content)
  const showCommandPalette = useCommandStore((s) => s.show)
  const toggleSettingsPanel = useCallback(() => setShowSettings((v) => !v), [])

  // 稳定的 handler 引用，避免 useRegisterCommands 频繁重新注册
  const handleOpenFolderViaDialog = useCallback(async () => {
    const path = await ipc.dialog.openDirectory()
    if (path) handleOpenFolder(path)
  }, [handleOpenFolder])
  const handleExportPdf = useCallback(() => {
    if (!activeFile || content === undefined) return
    exportAsPdf()
  }, [activeFile, content])
  const handleExportHtml = useCallback(async () => {
    if (!activeFile || content === undefined) return
    try {
      await exportAsHtml(content, activeFile)
    } catch (err) {
      logError('App:exportHtml', err)
    }
  }, [activeFile, content])
  const handleOpenDailyNote = useCallback(async () => {
    try {
      await openTodaysNote()
    } catch (err) {
      logError('App:openTodaysNote', err)
    }
  }, [])

  const handleAddFolderViaDialog = useCallback(async () => {
    const path = await ipc.dialog.openDirectory()
    if (path) handleAddFolderToWorkspace(path)
  }, [handleAddFolderToWorkspace])

  const handleOpenFileViaDialog = useCallback(async () => {
    const path = await ipc.dialog.openFile()
    if (path) handleOpenFile(path)
  }, [handleOpenFile])

  const handleShowAbout = useCallback(() => setShowAbout(true), [])

  /**
   * 保存并返回阅读模式：先强制保存，再切换到阅读视图
   */
  const handleSaveAndReturnToRead = useCallback(async () => {
    if (!activeFile) return
    await forceSave()
    useTabStore.getState().setViewMode(activeFile, 'read')
  }, [activeFile, forceSave])

  useRegisterCommands({
    openFolder: handleOpenFolderViaDialog,
    addFolderToWorkspace: handleAddFolderViaDialog,
    openFile: handleOpenFileViaDialog,
    showAbout: handleShowAbout,
    toggleSettings: toggleSettingsPanel,
    exportPdf: handleExportPdf,
    exportHtml: handleExportHtml,
    openDailyNote: handleOpenDailyNote,
    saveAndReturnToRead: handleSaveAndReturnToRead,
  })
  useKeyboardShortcuts({
    onOpenCommandPalette: showCommandPalette,
    onSearchHighlightNext: next,
    onSearchHighlightPrev: prev,
    onSearchHighlightClose: () => setSearchHighlight(null),
    onSave: () => {
      void forceSave()
    },
  })

  useMenuEvents()

  return (
    <ThemeProvider>
      <AboutDialog isOpen={showAbout} onClose={() => setShowAbout(false)} />
      <CommandPalette />
      <Layout
        sidebar={
          <div>
            {workspacePath ? (
              <>
                <Favorites />
                <FileTree />
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
                      rootPaths={useFileStore.getState().rootPaths}
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
                        setSearchHighlight(match.matchText, useSearchStore.getState().isRegex)
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
                ) : content !== undefined && surface && activeFile ? (
                  surface.kind === 'markdown-edit' ? (
                    <EditorPane
                      filePath={activeFile}
                      content={content}
                      saveStatus={saveStatus}
                      onLoadDisk={() => {
                        void loadDisk()
                      }}
                      onKeepMine={() => {
                        void keepMine()
                      }}
                      onChange={setContent}
                      previewEnabled={useTabStore.getState().isPreviewEnabled(activeFile)}
                    />
                  ) : surface.kind === 'markdown-read' ? (
                    <MarkdownViewer content={content} filePath={activeFile} />
                  ) : (
                    <SourceViewer content={content} filePath={activeFile} />
                  )
                ) : loading ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Loading...
                  </div>
                ) : null}
              </div>
              <StatusBar
                stats={readingStats}
                saveStatus={saveStatus}
                viewMode={viewMode}
                filePath={activeFile}
              />
            </div>
          ) : (
            <WelcomePage
              onFolderOpen={handleOpenFolder}
              onAddToWorkspace={handleAddFolderToWorkspace}
              onFileOpen={handleOpenFile}
            />
          )
        }
        outline={surface?.capabilities.hasOutline && content ? <Outline content={content} /> : null}
        sidebarVisible={sidebarVisible}
        outlineVisible={outlineVisible}
      />
    </ThemeProvider>
  )
}

export default App
