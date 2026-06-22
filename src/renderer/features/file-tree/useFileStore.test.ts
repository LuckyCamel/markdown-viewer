import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useFileStore } from './useFileStore'
import type { FileEntry } from '../../../shared/types'

const mockListDirectory = vi.fn()

vi.mock('../../lib/ipc', () => ({
  ipc: { files: { listDirectory: (...args: unknown[]) => mockListDirectory(...args) } },
}))

function entry(name: string, isDir = false): FileEntry {
  return { name, path: `/root/${name}`, isDirectory: isDir, isHidden: name.startsWith('.') }
}

describe('useFileStore', () => {
  beforeEach(() => {
    useFileStore.setState({ entries: {}, expanded: {}, loading: {}, rootPath: null })
    vi.clearAllMocks()
  })

  describe('setRoot', () => {
    it('设置 rootPath 并自动 loadChildren', async () => {
      mockListDirectory.mockResolvedValue([entry('a.md'), entry('sub', true)])
      useFileStore.getState().setRoot('/root')
      expect(useFileStore.getState().rootPath).toBe('/root')
      await vi.waitFor(() => {
        expect(useFileStore.getState().entries['/root']).toHaveLength(2)
      })
    })
  })

  describe('loadChildren', () => {
    it('加载条目并写入 entries', async () => {
      mockListDirectory.mockResolvedValue([entry('readme.md')])
      await useFileStore.getState().loadChildren('/root')
      expect(useFileStore.getState().entries['/root']).toHaveLength(1)
    })

    it('加载完成后清除 loading 标记', async () => {
      mockListDirectory.mockResolvedValue([])
      await useFileStore.getState().loadChildren('/root')
      expect(useFileStore.getState().loading['/root']).toBeUndefined()
    })

    it('正在加载时重复调用不触发第二次 fetch', async () => {
      let resolve!: (v: FileEntry[]) => void
      mockListDirectory.mockReturnValue(
        new Promise((r) => {
          resolve = r
        }),
      )

      useFileStore.getState().loadChildren('/root')
      useFileStore.getState().loadChildren('/root')
      resolve([])

      await vi.waitFor(() => {
        expect(useFileStore.getState().loading['/root']).toBeUndefined()
      })
      expect(mockListDirectory).toHaveBeenCalledTimes(1)
    })
  })

  describe('toggleExpand', () => {
    it('未展开 → loadChildren → 标记 expanded', async () => {
      mockListDirectory.mockResolvedValue([entry('a.md')])
      await useFileStore.getState().toggleExpand('/sub')
      expect(useFileStore.getState().expanded['/sub']).toBe(true)
    })

    it('已展开 → 移除 expanded 标记，不加载', async () => {
      useFileStore.setState({ expanded: { '/sub': true } })
      await useFileStore.getState().toggleExpand('/sub')
      expect(useFileStore.getState().expanded['/sub']).toBeUndefined()
      expect(mockListDirectory).not.toHaveBeenCalled()
    })
  })
})
