import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useEditorStore } from './useEditorStore'

const mockReadFile = vi.fn()

vi.mock('../../lib/ipc', () => ({
  ipc: {
    files: {
      readFile: (...args: unknown[]) => mockReadFile(...args),
    },
  },
}))

describe('useEditorStore', () => {
  beforeEach(() => {
    useEditorStore.setState({ contents: {}, loading: {}, errors: {} })
    vi.clearAllMocks()
  })

  it('should set loading then content on successful load', async () => {
    mockReadFile.mockResolvedValue({ path: '/a.md', content: '# hello' })

    const loadPromise = useEditorStore.getState().loadContent('/a.md')

    expect(useEditorStore.getState().loading['/a.md']).toBe(true)

    await loadPromise

    expect(useEditorStore.getState().loading['/a.md']).toBe(false)
    expect(useEditorStore.getState().contents['/a.md']).toBe('# hello')
    expect(useEditorStore.getState().errors['/a.md']).toBeUndefined()
  })

  it('should set error on failed load', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'))

    const loadPromise = useEditorStore.getState().loadContent('/missing.md')

    expect(useEditorStore.getState().loading['/missing.md']).toBe(true)

    await loadPromise

    expect(useEditorStore.getState().loading['/missing.md']).toBe(false)
    expect(useEditorStore.getState().errors['/missing.md']).toBe('Error: ENOENT')
    expect(useEditorStore.getState().contents['/missing.md']).toBeUndefined()
  })

  it('should remove content from all maps', () => {
    useEditorStore.setState({
      contents: { '/a.md': 'hello' },
      loading: { '/a.md': false },
      errors: { '/a.md': 'some error' },
    })

    useEditorStore.getState().removeContent('/a.md')

    expect(useEditorStore.getState().contents).not.toHaveProperty('/a.md')
    expect(useEditorStore.getState().loading).not.toHaveProperty('/a.md')
    expect(useEditorStore.getState().errors).not.toHaveProperty('/a.md')
  })

  it('should set content directly', () => {
    useEditorStore.getState().setContent('/a.md', 'direct')

    expect(useEditorStore.getState().contents['/a.md']).toBe('direct')
  })
})
