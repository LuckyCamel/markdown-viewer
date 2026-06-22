import { useEffect, useState } from 'react'
import { ipc } from '../../lib/ipc'

interface WelcomePageProps {
  onFolderOpen?: (path: string) => void
}

export function WelcomePage({ onFolderOpen }: WelcomePageProps) {
  const [recentFiles, setRecentFiles] = useState<{ path: string; name: string }[]>([])
  const [recentDirs, setRecentDirs] = useState<{ path: string; name: string }[]>([])

  useEffect(() => {
    ipc.store.get<any[]>('recentFiles').then((files) => {
      if (files) setRecentFiles(files.slice(0, 10))
    })
    ipc.store.get<any[]>('recentDirs').then((dirs) => {
      if (dirs) setRecentDirs(dirs.slice(0, 10))
    })
  }, [])

  const handleOpenFolder = async () => {
    const dir = await ipc.dialog.openDirectory()
    if (dir) {
      ipc.store.set('lastWorkspace', dir)
      onFolderOpen?.(dir)
    }
  }

  const handleOpenFile = async () => {
    await ipc.dialog.openFile()
  }

  return (
    <div className="h-full flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">Markdown Viewer</h1>
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
      {recentDirs.length > 0 && (
        <div className="w-full max-w-md">
          <h2 className="text-sm font-medium text-gray-500 mb-2">Recent Folders</h2>
          <ul className="space-y-1">
            {recentDirs.map((dir) => (
              <li key={dir.path}>
                <button
                  onClick={() => {
                    ipc.store.set('lastWorkspace', dir.path)
                    onFolderOpen?.(dir.path)
                  }}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {dir.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
