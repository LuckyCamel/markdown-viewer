/**
 * useTabStore.openFile 与 FileSizeGuard 集成测试
 *
 * 验证：
 * - 文件大小超阈值时弹 confirm，取消则不打开
 * - 二进制文件弹 alert，不打开
 * - 正常文件直接打开
 * - 未 list 过的目录不阻塞打开
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from '@testing-library/react'
import { useTabStore } from './useTabStore'
import { useFileStore } from '../file-tree/useFileStore'
import { DEFAULT_MAX_TEXT_FILE_SIZE, DEFAULT_MAX_MARKDOWN_SIZE } from '../../lib/fileSizeGuard'
import type { FileEntry } from '../../../shared/types'

function makeEntry(name: string, size: number, parent = '/test', isMarkdown = true): FileEntry {
  return {
    name,
    path: `${parent}/${name}`,
    isDirectory: false,
    isHidden: false,
    isMarkdown,
    isTextFile: !isMarkdown,
    size,
  }
}

describe('useTabStore + FileSizeGuard', () => {
  let confirmMock: ReturnType<typeof vi.fn>
  let alertMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    confirmMock = vi.fn().mockReturnValue(false)
    alertMock = vi.fn().mockReturnValue(undefined)
    vi.stubGlobal('confirm', confirmMock)
    vi.stubGlobal('alert', alertMock)

    act(() => {
      useTabStore.getState().closeAll()
      useFileStore.setState({
        entries: {},
        expanded: {},
        loading: {},
        rootPaths: ['/test'],
        rootPath: '/test',
      })
    })
  })

  it('未 list 过的目录：不阻塞打开', () => {
    // useFileStore.entries 为空，shouldAllowOpenFile 应返回 true
    act(() => {
      useTabStore.getState().openFile('/unknown/file.md')
    })
    expect(useTabStore.getState().activeFile).toBe('/unknown/file.md')
    expect(confirmMock).not.toHaveBeenCalled()
    expect(alertMock).not.toHaveBeenCalled()
  })

  it('文件大小未知的 entry：不阻塞打开', () => {
    useFileStore.setState({
      entries: {
        '/test': [
          {
            name: 'unknown-size.md',
            path: '/test/unknown-size.md',
            isDirectory: false,
            isHidden: false,
            isMarkdown: true,
            // 无 size 字段
          },
        ],
      },
    })
    act(() => {
      useTabStore.getState().openFile('/test/unknown-size.md')
    })
    expect(useTabStore.getState().activeFile).toBe('/test/unknown-size.md')
    expect(confirmMock).not.toHaveBeenCalled()
  })

  it('Markdown 文件小于阈值：直接打开', () => {
    useFileStore.setState({
      entries: {
        '/test': [makeEntry('small.md', 1024)],
      },
    })
    act(() => {
      useTabStore.getState().openFile('/test/small.md')
    })
    expect(useTabStore.getState().activeFile).toBe('/test/small.md')
    expect(confirmMock).not.toHaveBeenCalled()
    expect(alertMock).not.toHaveBeenCalled()
  })

  it('Markdown 文件超过阈值且用户取消：不打开', () => {
    useFileStore.setState({
      entries: {
        '/test': [makeEntry('large.md', DEFAULT_MAX_MARKDOWN_SIZE + 1)],
      },
    })
    confirmMock.mockReturnValue(false)
    act(() => {
      useTabStore.getState().openFile('/test/large.md')
    })
    expect(useTabStore.getState().activeFile).toBeNull()
    expect(confirmMock).toHaveBeenCalledTimes(1)
    expect(alertMock).not.toHaveBeenCalled()
  })

  it('Markdown 文件超过阈值且用户确认：打开', () => {
    useFileStore.setState({
      entries: {
        '/test': [makeEntry('large.md', DEFAULT_MAX_MARKDOWN_SIZE + 1)],
      },
    })
    confirmMock.mockReturnValue(true)
    act(() => {
      useTabStore.getState().openFile('/test/large.md')
    })
    expect(useTabStore.getState().activeFile).toBe('/test/large.md')
    expect(confirmMock).toHaveBeenCalledTimes(1)
  })

  it('代码文件超过文本阈值且用户取消：不打开', () => {
    useFileStore.setState({
      entries: {
        '/test': [makeEntry('large.ts', DEFAULT_MAX_TEXT_FILE_SIZE + 1, '/test', false)],
      },
    })
    confirmMock.mockReturnValue(false)
    act(() => {
      useTabStore.getState().openFile('/test/large.ts')
    })
    expect(useTabStore.getState().activeFile).toBeNull()
    expect(confirmMock).toHaveBeenCalledTimes(1)
  })

  it('二进制文件：alert 提示且不打开（不论用户是否确认）', () => {
    // getFileKind 对未知扩展名（如 .exe）返回 'binary'
    useFileStore.setState({
      entries: {
        '/test': [
          {
            name: 'binary.exe',
            path: '/test/binary.exe',
            isDirectory: false,
            isHidden: false,
            // isMarkdown / isTextFile 均未标记，getFileKind 会返回 'binary'
            size: 100 * 1024, // 100KB
          },
        ],
      },
    })
    act(() => {
      useTabStore.getState().openFile('/test/binary.exe')
    })
    expect(useTabStore.getState().activeFile).toBeNull()
    expect(alertMock).toHaveBeenCalledTimes(1)
    expect(confirmMock).not.toHaveBeenCalled()
  })

  it('边界：等于阈值的文件直接打开', () => {
    useFileStore.setState({
      entries: {
        '/test': [makeEntry('boundary.md', DEFAULT_MAX_MARKDOWN_SIZE)],
      },
    })
    act(() => {
      useTabStore.getState().openFile('/test/boundary.md')
    })
    expect(useTabStore.getState().activeFile).toBe('/test/boundary.md')
    expect(confirmMock).not.toHaveBeenCalled()
  })
})
