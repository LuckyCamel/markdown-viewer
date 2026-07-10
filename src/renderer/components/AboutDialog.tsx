import { useEffect } from 'react'

interface AboutDialogProps {
  isOpen: boolean
  onClose: () => void
}

const version = '1.2.3'

export function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-80 p-6 border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              viewBox="0 0 24 24"
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-1">Markdown-Viewer</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Version {version}</p>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
            A cross-platform Markdown viewer built with Tauri.
          </p>
          <div className="text-gray-500 dark:text-gray-400 text-xs space-y-1">
            <p>Built with React + Tailwind CSS</p>
            <p>© 2024 Markdown-Viewer Team</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
