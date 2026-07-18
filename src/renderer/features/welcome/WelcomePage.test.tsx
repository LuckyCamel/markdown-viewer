import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WelcomePage } from './WelcomePage'

const mockStoreGet = vi.fn()
const mockStoreSet = vi.fn()

vi.mock('../../lib/ipc', () => ({
  ipc: {
    store: {
      get: (...args: unknown[]) => mockStoreGet(...args),
      set: (...args: unknown[]) => mockStoreSet(...args),
    },
    dialog: {
      openDirectory: vi.fn(),
      openFile: vi.fn(),
    },
  },
}))

describe('WelcomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStoreGet.mockImplementation((key: string) => {
      if (key === 'recentFiles') {
        return Promise.resolve([{ path: '/docs/readme.md', name: 'readme.md', timestamp: 1 }])
      }
      if (key === 'recentDirs') {
        return Promise.resolve([{ path: '/docs', name: 'docs', timestamp: 1 }])
      }
      return Promise.resolve(undefined)
    })
    mockStoreSet.mockResolvedValue(undefined)
  })

  it('should render welcome message', async () => {
    render(<WelcomePage />)
    expect(screen.getByText('Markdown-Viewer')).toBeDefined()
    expect(screen.getByText('打开文件夹就能流畅读、偶尔改')).toBeDefined()
  })

  it('should show open folder button', () => {
    render(<WelcomePage />)
    expect(screen.getByRole('button', { name: /打开文件夹/ })).toBeDefined()
  })

  it('应展示最近打开的文件并可点击', async () => {
    const onFileOpen = vi.fn()
    render(<WelcomePage onFileOpen={onFileOpen} />)

    const fileButton = await screen.findByRole('button', { name: 'readme.md' })
    fireEvent.click(fileButton)

    expect(onFileOpen).toHaveBeenCalledWith('/docs/readme.md')
  })

  it('应展示最近打开的工作区', async () => {
    render(<WelcomePage />)
    expect(await screen.findByText('最近的工作区')).toBeDefined()
    expect(await screen.findByRole('button', { name: 'docs' })).toBeDefined()
  })

  it('应支持将工作区添加到当前工作区', async () => {
    const onAddToWorkspace = vi.fn()
    render(<WelcomePage onAddToWorkspace={onAddToWorkspace} />)

    const addButton = await screen.findByRole('button', { name: '+' })
    fireEvent.click(addButton)

    expect(onAddToWorkspace).toHaveBeenCalledWith('/docs')
  })
})
