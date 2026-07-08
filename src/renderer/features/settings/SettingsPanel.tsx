import { useUIStore } from '../../stores/useUIStore'
import { useSettingsStore } from './useSettingsStore'
import { useFileStore } from '../file-tree/useFileStore'
import { ShortcutEditor } from './ShortcutEditor'
import { useEffect, useState } from 'react'
import { ipc } from '../../lib/ipc'
import { logError } from '../../logger'
import type { ThemeMode } from '../../../shared/types'

function parseLines(value: string): string[] {
  return value
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

type SettingsTab = 'general' | 'shortcuts'

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
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')

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
    const { ignoreList: currentIgnore, markdownExtensions: currentExts } =
      useSettingsStore.getState()
    await ipc.files
      .updateSettings(currentIgnore, currentExts)
      .catch((err) => logError('SettingsPanel:updateSettings', err))
    if (rootPath) {
      useFileStore.getState().setRoot(rootPath)
    }
  }

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'shortcuts', label: 'Shortcuts' },
  ]

  return (
    <div className="p-6 max-w-lg">
      <h2 className="text-lg font-semibold mb-4">Settings</h2>

      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-sm border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
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
              File extensions to show in the file tree. Use an empty line for no-extension text
              files (e.g., README, LICENSE).
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
      )}

      {activeTab === 'shortcuts' && <ShortcutEditor />}
    </div>
  )
}
