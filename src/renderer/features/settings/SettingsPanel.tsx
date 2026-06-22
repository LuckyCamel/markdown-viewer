import { useUIStore } from '../../stores/useUIStore'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { useEffect } from 'react'
import type { ThemeMode } from '../../../shared/types'

export function SettingsPanel() {
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)
  const ignoreList = useSettingsStore((s) => s.ignoreList)
  const setIgnoreList = useSettingsStore((s) => s.setIgnoreList)
  const loadFromDisk = useSettingsStore((s) => s.loadFromDisk)
  const saveToDisk = useSettingsStore((s) => s.saveToDisk)

  useEffect(() => {
    loadFromDisk()
  }, [loadFromDisk])

  const handleThemeChange = async (newTheme: ThemeMode) => {
    setTheme(newTheme)
    await window.api.store.set('theme', newTheme)
  }

  const handleIgnoreChange = async (value: string) => {
    const list = value
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    setIgnoreList(list)
    await saveToDisk()
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
          <label className="block text-sm font-medium mb-2">Ignore List</label>
          <textarea
            value={ignoreList.join('\n')}
            onChange={(e) => handleIgnoreChange(e.target.value)}
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
