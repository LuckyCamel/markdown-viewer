import { useEffect, useState } from 'react'
import { ipc } from '../../lib/ipc'
import { logError } from '../../logger'
import { t } from '../../../shared/i18n'
import type { RecentEntry } from '../../../shared/types'

interface WelcomePageProps {
  onFolderOpen?: (path: string) => void
  onAddToWorkspace?: (path: string) => void
  onFileOpen?: (path: string) => void
}

export function WelcomePage({ onFolderOpen, onAddToWorkspace, onFileOpen }: WelcomePageProps) {
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
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Markdown-Viewer</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">打开文件夹读文档、顺带看源码</p>
        <p className="text-sm text-gray-400 mt-1">{t('welcome.hint')}</p>
      </div>
      <div className="flex gap-4">
        <button
          onClick={handleOpenFolder}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {t('menu.openFolder')}
        </button>
        <button
          onClick={handleOpenFile}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {t('menu.openFile')}
        </button>
      </div>
      {(recentFiles.length > 0 || recentDirs.length > 0) && (
        <div className="w-full max-w-md space-y-4">
          {recentFiles.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-500 mb-2">{t('menu.recentFiles')}</h2>
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
              <h2 className="text-sm font-medium text-gray-500 mb-2">
                {t('welcome.recentWorkspaces')}
              </h2>
              <ul className="space-y-1">
                {recentDirs.map((dir) => (
                  <li key={dir.path} className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        ipc.store
                          .set('lastWorkspace', dir.path)
                          .catch((err) => logError('WelcomePage:setLastWorkspace', err))
                        onFolderOpen?.(dir.path)
                      }}
                      className="flex-1 text-sm text-blue-600 dark:text-blue-400 hover:underline truncate text-left"
                      title={dir.path}
                    >
                      {dir.name}
                    </button>
                    {onAddToWorkspace && (
                      <button
                        onClick={() => onAddToWorkspace(dir.path)}
                        title={t('welcome.addToWorkspace')}
                        className="text-xs px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        +
                      </button>
                    )}
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
