import { useEffect, useState } from 'react'
import { ipc } from '../../lib/ipc'
import { logError } from '../../logger'
import type { RecentEntry } from '../../../shared/types'

interface WelcomePageProps {
  onFolderOpen?: (path: string) => void
  onFileOpen?: (path: string) => void
}

export function WelcomePage({ onFolderOpen, onFileOpen }: WelcomePageProps) {
  const [recentFiles, setRecentFiles] = useState<RecentEntry[]>([])
  const [recentDirs, setRecentDirs] = useState<RecentEntry[]>([])

  useEffect(() => {
    ipc.store
      .get<RecentEntry[]>('recentFiles')
      .then((files) => {
        if (files) setRecentFiles(files.slice(0, 10))
      })
      .catch((err) => logError('WelcomePage:loadRecentFiles', err))
    ipc.store
      .get<RecentEntry[]>('recentDirs')
      .then((dirs) => {
        if (dirs) setRecentDirs(dirs.slice(0, 10))
      })
      .catch((err) => logError('WelcomePage:loadRecentDirs', err))
  }, [])

  const handleOpenFolder = async () => {
    const dir = await ipc.dialog.openDirectory()
    if (dir) {
      ipc.store
        .set('lastWorkspace', dir)
        .catch((err) => logError('WelcomePage:setLastWorkspace', err))
      onFolderOpen?.(dir)
    }
  }

  const handleOpenFile = async () => {
    const file = await ipc.dialog.openFile().catch((err) => logError('WelcomePage:openFile', err))
    if (file) {
      onFileOpen?.(file)
    }
  }

  return (
    <div className="h-full flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">Markdown-Viewer</h1>
      <p className="text-gray-500 dark:text-gray-400">
        Open a folder to browse and preview markdown files
      </p>
      <div className="flex gap-4">
        <button
          onClick={handleOpenFolder}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Open Folder
        </button>
        <button
          onClick={handleOpenFile}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Open File
        </button>
      </div>
      {(recentFiles.length > 0 || recentDirs.length > 0) && (
        <div className="w-full max-w-md space-y-4">
          {recentFiles.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-500 mb-2">Recent Files</h2>
              <ul className="space-y-1">
                {recentFiles.map((file) => (
                  <li key={file.path}>
                    <button
                      onClick={() => onFileOpen?.(file.path)}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate max-w-full block text-left"
                      title={file.path}
                    >
                      {file.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {recentDirs.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-500 mb-2">Recent Folders</h2>
              <ul className="space-y-1">
                {recentDirs.map((dir) => (
                  <li key={dir.path}>
                    <button
                      onClick={() => {
                        ipc.store
                          .set('lastWorkspace', dir.path)
                          .catch((err) => logError('WelcomePage:setLastWorkspace', err))
                        onFolderOpen?.(dir.path)
                      }}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate max-w-full block text-left"
                      title={dir.path}
                    >
                      {dir.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
