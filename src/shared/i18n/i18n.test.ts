import { describe, it, expect, beforeEach } from 'vitest'
import { t, setLocale, getLocale } from './index'

/**
 * i18n 模块测试：验证默认语言、语言切换及未知 key 回退行为
 */
describe('i18n', () => {
  beforeEach(() => {
    setLocale('zh-CN')
  })

  it('默认语言为中文', () => {
    expect(getLocale()).toBe('zh-CN')
    expect(t('fileTree.newFile')).toBe('新建文件')
  })

  it('切换到英文后返回英文翻译', () => {
    setLocale('en-US')
    expect(getLocale()).toBe('en-US')
    expect(t('fileTree.newFile')).toBe('New File')
  })

  it('切换回中文后恢复中文翻译', () => {
    setLocale('en-US')
    setLocale('zh-CN')
    expect(t('fileTree.rename')).toBe('重命名')
  })

  it('未知 key 返回 key 本身', () => {
    setLocale('zh-CN')
    expect(t('unknown.key' as never)).toBe('unknown.key')
  })
})
