import { useUIStore } from '../../stores/useUIStore'
import { useSettingsStore } from './useSettingsStore'
import { useFileStore } from '../file-tree/useFileStore'
import { ShortcutEditor } from './ShortcutEditor'
import { useEffect, useState } from 'react'
import { ipc } from '../../lib/ipc'
import { logError } from '../../logger'
import type { ThemeMode } from '../../../shared/types'
import { CODE_THEMES } from '../../lib/codeThemes'
import { t, setLocale, getLocale, type Locale } from '../../../shared/i18n'
import { THEMES, getThemesByVariant, getThemeVariant, type ThemeId } from '../../lib/themes'
import { COMMON_PROPORTIONAL_FONTS, COMMON_MONOSPACE_FONTS } from '../../lib/fonts'

import { parseExtensionLines, formatExtensionLines } from '../../../shared/parseExtensionLines'

type SettingsTab = 'general' | 'shortcuts'

function parseLines(value: string): string[] {
  return value
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

interface SettingsPanelProps {
  onClose?: () => void
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)
  const themeId = useUIStore((s) => s.themeId)
  const setThemeId = useUIStore((s) => s.setThemeId)
  const codeTheme = useUIStore((s) => s.codeTheme)
  const setCodeTheme = useUIStore((s) => s.setCodeTheme)
  const ignoreList = useSettingsStore((s) => s.ignoreList)
  const setIgnoreList = useSettingsStore((s) => s.setIgnoreList)
  const markdownExtensions = useSettingsStore((s) => s.markdownExtensions)
  const setMarkdownExtensions = useSettingsStore((s) => s.setMarkdownExtensions)
  const loadFromDisk = useSettingsStore((s) => s.loadFromDisk)
  const saveToDisk = useSettingsStore((s) => s.saveToDisk)
  const rootPath = useFileStore((s) => s.rootPath)
  // 阅读设置
  const fontSize = useSettingsStore((s) => s.fontSize)
  const lineHeight = useSettingsStore((s) => s.lineHeight)
  const contentMaxWidth = useSettingsStore((s) => s.contentMaxWidth)
  const fontFamily = useSettingsStore((s) => s.fontFamily)
  const codeFontFamily = useSettingsStore((s) => s.codeFontFamily)
  const setFontSize = useSettingsStore((s) => s.setFontSize)
  const setLineHeight = useSettingsStore((s) => s.setLineHeight)
  const setContentMaxWidth = useSettingsStore((s) => s.setContentMaxWidth)
  const setFontFamily = useSettingsStore((s) => s.setFontFamily)
  const setCodeFontFamily = useSettingsStore((s) => s.setCodeFontFamily)
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  // 语言切换后强制刷新面板，使 t() 文案立即生效
  const [, setLocaleTick] = useState(0)

  useEffect(() => {
    loadFromDisk().catch((err) => logError('SettingsPanel:loadFromDisk', err))
  }, [loadFromDisk])

  /**
   * 切换界面语言：更新 i18n 当前语言、持久化到 store 并触发面板重渲染
   */
  const handleLocaleChange = async (locale: Locale) => {
    setLocale(locale)
    await ipc.store.set('locale', locale).catch((err) => logError('SettingsPanel:setLocale', err))
    setLocaleTick((n) => n + 1)
  }

  /**
   * 根据主题模式返回本地化标签
   */
  const themeModeLabel = (mode: ThemeMode): string => {
    switch (mode) {
      case 'system':
        return t('settings.themeSystem')
      case 'light':
        return t('settings.themeLight')
      case 'dark':
        return t('settings.themeDark')
    }
  }

  const handleThemeChange = async (newTheme: ThemeMode) => {
    setTheme(newTheme)
    await ipc.store.set('theme', newTheme).catch((err) => logError('SettingsPanel:setTheme', err))
  }

  const handleCodeThemeChange = async (newCodeTheme: string) => {
    setCodeTheme(newCodeTheme)
    await ipc.store
      .set('codeTheme', newCodeTheme)
      .catch((err) => logError('SettingsPanel:setCodeTheme', err))
  }

  const handleSettingsChange = async (type: 'ignoreList' | 'extensions', value: string) => {
    const list = type === 'ignoreList' ? parseLines(value) : parseExtensionLines(value)
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

  /**
   * 处理字体大小变更
   */
  const handleFontSizeChange = async (value: number) => {
    setFontSize(value)
    await ipc.store
      .set('fontSize', value)
      .catch((err) => logError('SettingsPanel:setFontSize', err))
  }

  /**
   * 处理行高变更
   */
  const handleLineHeightChange = async (value: number) => {
    setLineHeight(value)
    await ipc.store
      .set('lineHeight', value)
      .catch((err) => logError('SettingsPanel:setLineHeight', err))
  }

  /**
   * 处理内容宽度变更
   */
  const handleContentWidthChange = async (value: number | null) => {
    setContentMaxWidth(value)
    await ipc.store
      .set('contentMaxWidth', value)
      .catch((err) => logError('SettingsPanel:setContentMaxWidth', err))
  }

  /**
   * 处理正文字体变更
   */
  const handleFontFamilyChange = async (value: string) => {
    setFontFamily(value)
    await ipc.store
      .set('fontFamily', value)
      .catch((err) => logError('SettingsPanel:setFontFamily', err))
  }

  /**
   * 处理代码字体变更
   */
  const handleCodeFontFamilyChange = async (value: string) => {
    setCodeFontFamily(value)
    await ipc.store
      .set('codeFontFamily', value)
      .catch((err) => logError('SettingsPanel:setCodeFontFamily', err))
  }

  /**
   * 处理主题风格变更
   */
  const handleThemeIdChange = async (value: ThemeId) => {
    setThemeId(value)
    await ipc.store.set('themeId', value).catch((err) => logError('SettingsPanel:setThemeId', err))
  }

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'general', label: t('settings.general') },
    { id: 'shortcuts', label: t('settings.shortcuts') },
  ]

  return (
    <div className="p-6 max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{t('settings.title')}</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            aria-label={t('settings.close')}
            title={t('settings.closeShortcut')}
          >
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

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
          <div className="setting-item">
            <label className="setting-label block text-sm font-medium mb-2">
              {t('settings.language')}
            </label>
            <select
              value={getLocale()}
              onChange={(e) => handleLocaleChange(e.target.value as Locale)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
            >
              <option value="zh-CN">中文</option>
              <option value="en-US">English</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('settings.theme')}</label>
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
                  {themeModeLabel(mode)}
                </button>
              ))}
            </div>
          </div>

          {/* 主题风格选择 */}
          <div>
            <label className="block text-sm font-medium mb-2">{t('settings.themeStyle')}</label>
            <select
              value={themeId ?? ''}
              onChange={(e) => handleThemeIdChange(e.target.value as ThemeId)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
            >
              <optgroup label={t('settings.themeGroupLight')}>
                {getThemesByVariant('light').map((t) => (
                  <option key={t.id} value={t.id}>
                    {getLocale() === 'zh-CN' ? t.name : t.nameEn}
                  </option>
                ))}
              </optgroup>
              <optgroup label={t('settings.themeGroupDark')}>
                {getThemesByVariant('dark').map((t) => (
                  <option key={t.id} value={t.id}>
                    {getLocale() === 'zh-CN' ? t.name : t.nameEn}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('settings.codeTheme')}</label>
            <select
              value={codeTheme}
              onChange={(e) => handleCodeThemeChange(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
            >
              <option value="auto">{t('settings.codeThemeAuto')}</option>
              <optgroup label={t('settings.codeThemeDark')}>
                {CODE_THEMES.filter((c) => c.variant === 'dark').map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label={t('settings.codeThemeLight')}>
                {CODE_THEMES.filter((c) => c.variant === 'light').map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* 阅读设置 */}
          <div>
            <label className="block text-sm font-medium mb-2">{t('settings.fontSize')}</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={12}
                max={24}
                step={1}
                value={fontSize}
                onChange={(e) => handleFontSizeChange(Number(e.target.value))}
                className="w-32"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400 w-12">{fontSize}px</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('settings.lineHeight')}</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1.0}
                max={2.5}
                step={0.1}
                value={lineHeight}
                onChange={(e) => handleLineHeightChange(Number(e.target.value))}
                className="w-32"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400 w-12">{lineHeight}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('settings.contentWidth')}</label>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={contentMaxWidth !== null}
                onChange={(e) => handleContentWidthChange(e.target.checked ? 800 : null)}
                className="w-4 h-4"
              />
              <input
                type="range"
                min={600}
                max={1200}
                step={50}
                value={contentMaxWidth ?? 800}
                onChange={(e) => handleContentWidthChange(Number(e.target.value))}
                disabled={contentMaxWidth === null}
                className="w-32 disabled:opacity-50"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400 w-16">
                {contentMaxWidth ? `${contentMaxWidth}px` : t('settings.contentWidthUnlimited')}
              </span>
            </div>
          </div>

          {/* 字体选择 */}
          <div>
            <label className="block text-sm font-medium mb-2">{t('settings.fontFamily')}</label>
            <select
              value={fontFamily}
              onChange={(e) => handleFontFamilyChange(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
            >
              {COMMON_PROPORTIONAL_FONTS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('settings.codeFontFamily')}</label>
            <select
              value={codeFontFamily}
              onChange={(e) => handleCodeFontFamilyChange(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
            >
              {COMMON_MONOSPACE_FONTS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('settings.markdownExtensions')}
            </label>
            <textarea
              value={formatExtensionLines(markdownExtensions)}
              onChange={(e) => handleSettingsChange('extensions', e.target.value)}
              rows={3}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
              placeholder={'.md\n.markdown'}
            />
            <p className="text-xs text-gray-500 mt-1">{t('settings.markdownExtensionsHint')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('settings.ignoreList')}</label>
            <textarea
              value={ignoreList.join('\n')}
              onChange={(e) => handleSettingsChange('ignoreList', e.target.value)}
              rows={4}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
              placeholder={t('settings.ignoreListPlaceholder')}
            />
            <p className="text-xs text-gray-500 mt-1">{t('settings.ignoreListHint')}</p>
          </div>
        </div>
      )}

      {activeTab === 'shortcuts' && <ShortcutEditor />}
    </div>
  )
}
