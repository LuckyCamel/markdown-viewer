import { useEffect, useMemo } from 'react'
import { useUIStore } from './stores/useUIStore'
import { useEditorStore } from './features/markdown-viewer/useEditorStore'
import { useTabStore } from './features/tabs/useTabStore'
import { useFileStore } from './features/file-tree/useFileStore'
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
import { ipc } from './lib/ipc'
import { useWorkspaceInit } from './hooks/useWorkspaceInit'
import { useFileWatcher } from './hooks/useFileWatcher'
import { useScrollRestore } from './hooks/useScrollRestore'
import { useMenuIpc } from './hooks/useMenuIpc'

function App() {
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
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const toggleOutline = useUIStore((s) => s.toggleOutline)
  const openSearch = useUIStore((s) => s.openSearch)
  const closeSearch = useUIStore((s) => s.closeSearch)

  const openFiles = useTabStore((s) => s.openFiles)
  const activeFile = useTabStore((s) => s.activeFile)

  const content = useEditorStore((s) => (activeFile ? s.contents[activeFile] : undefined))
  const loadContent = useEditorStore((s) => s.loadContent)

  // Fix: compute allFiles from live entries (was useMemo with empty deps bug)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized])

  useEffect(() => {
    if (activeFile) {
      loadContent(activeFile)
    }
  }, [activeFile, loadContent])

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

  useFileWatcher(openFiles, initialized)
  useScrollRestore(activeFile, content)
  useMenuIpc({
    onOpenFolder: handleOpenFolder,
    onToggleSidebar: toggleSidebar,
    onToggleOutline: toggleOutline,
    onOpenFileSearch: () => openSearch('file'),
    onOpenContentSearch: () => openSearch('content'),
    onToggleSettings: () => setShowSettings((v) => !v),
  })

  return (
    <ThemeProvider>
      {!workspacePath ? (
        <WelcomePage onFolderOpen={handleOpenFolder} />
      ) : (
        <Layout
          sidebar={
            <div>
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
                    onSelect={(p) => {
                      handleOpenFile(p)
                      closeSearch()
                    }}
                  />
                )}
              </div>
            </div>
          }
          main={
            showSettings ? (
              <SettingsPanel />
            ) : openFiles.length > 0 ? (
              <div className="h-full flex flex-col">
                <TabBar />
                <div className="flex-1 overflow-y-auto">
                  {content !== undefined ? (
                    <MarkdownViewer content={content} filePath={activeFile ?? undefined} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      Loading...
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <WelcomePage onFolderOpen={handleOpenFolder} />
            )
          }
          outline={content ? <Outline content={content} /> : null}
          sidebarVisible={sidebarVisible}
          outlineVisible={outlineVisible}
        />
      )}
    </ThemeProvider>
  )
}

export default App
