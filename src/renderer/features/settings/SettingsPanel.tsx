import { useUIStore } from '../../stores/useUIStore'
import { useSettingsStore } from './useSettingsStore'
import { useFileStore } from '../file-tree/useFileStore'
import { useEffect } from 'react'
import { ipc } from '../../lib/ipc'
import { logError } from '../../logger'
import type { ThemeMode } from '../../../shared/types'

function parseLines(value: string): string[] {
  return value
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function SettingsPanel() {
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)
  const ignoreList = useSettingsStore((s) => s.ignoreList)
  const setIgnoreList = useSettingsStore((s) => s.setIgnoreList)
  const markdownExtensions = useSettingsStore((s) => s.markdownExtensions)
  const setMarkdownExtensions = useSettingsStore((s) => s.setMarkdownExtensions)
  const loadFromDisk = useSettingsStore((s) => s.loadFromDisk)
  const saveToDisk = useSettingsStore((s) => s.saveToDisk)
  const rootPath = useFileStore((s) => s.rootPath)

  useEffect(() => {
    loadFromDisk().catch((err) => logError('SettingsPanel:loadFromDisk', err))
  }, [loadFromDisk])

  const handleThemeChange = async (newTheme: ThemeMode) => {
    setTheme(newTheme)
    await ipc.store.set('theme', newTheme).catch((err) => logError('SettingsPanel:setTheme', err))
  }

  const handleSettingsChange = async (type: 'ignoreList' | 'extensions', value: string) => {
    const list = parseLines(value)
    if (type === 'ignoreList') {
      setIgnoreList(list)
    } else {
      setMarkdownExtensions(list)
    }
    await saveToDisk().catch((err) => logError('SettingsPanel:saveToDisk', err))
    await ipc.files
      .invalidateFilter()
      .catch((err) => logError('SettingsPanel:invalidateFilter', err))
    if (rootPath) {
      useFileStore.getState().setRoot(rootPath)
    }
  }

  return (
    <div className="p-6 max-w-lg">
      <h2 className="text-lg font-semibold mb-4">Settings</h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Theme</label>
          <div className="flex gap-2">
            {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => handleThemeChange(mode)}
                className={`px-3 py-1.5 text-sm rounded border ${
                  theme === mode
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Markdown Extensions</label>
          <textarea
            value={markdownExtensions.join('\n')}
            onChange={(e) => handleSettingsChange('extensions', e.target.value)}
            rows={3}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
            placeholder={'.md\n.markdown'}
          />
          <p className="text-xs text-gray-500 mt-1">
            File extensions to show in the file tree. Use an empty line for no-extension text files
            (e.g., README, LICENSE).
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Ignore List</label>
          <textarea
            value={ignoreList.join('\n')}
            onChange={(e) => handleSettingsChange('ignoreList', e.target.value)}
            rows={4}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
            placeholder="Enter directory/file names to ignore (one per line)"
          />
          <p className="text-xs text-gray-500 mt-1">
            Directories and files matching these names will be hidden in the file tree.
          </p>
        </div>
      </div>
    </div>
  )
}
