import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {})

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getAppPath: vi.fn(() => '/fake/app'),
  },
}))

vi.mock('fs', () => ({
  readFileSync: vi.fn(() => JSON.stringify({ version: '1.2.3' })),
}))

vi.mock('./logger', () => ({
  logError: vi.fn(),
}))

describe('parseCliArgs', () => {
  let originalArgv: string[]

  beforeEach(() => {
    originalArgv = process.argv
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.argv = originalArgv
  })

  function setArgv(args: string[]): Promise<typeof import('./cli')> {
    process.argv = ['node', 'index.js', ...args]
    return import('./cli')
  }

  it('--version 打印版本号并退出', async () => {
    const { parseCliArgs } = await setArgv(['--version'])
    const result = parseCliArgs()
    expect(mockLog).toHaveBeenCalledWith('1.2.3')
    expect(mockExit).toHaveBeenCalledWith(0)
    expect(result).toEqual({ action: 'default' })
  })

  it('-v 打印版本号并退出', async () => {
    const { parseCliArgs } = await setArgv(['-v'])
    const result = parseCliArgs()
    expect(mockLog).toHaveBeenCalledWith('1.2.3')
    expect(mockExit).toHaveBeenCalledWith(0)
    expect(result).toEqual({ action: 'default' })
  })

  it('--help 打印帮助信息并退出', async () => {
    const { parseCliArgs } = await setArgv(['--help'])
    const result = parseCliArgs()
    expect(mockLog).toHaveBeenCalled()
    expect((mockLog.mock.calls[0]?.[0] as string).includes('Usage:')).toBe(true)
    expect(mockExit).toHaveBeenCalledWith(0)
    expect(result).toEqual({ action: 'default' })
  })

  it('-h 打印帮助信息并退出', async () => {
    const { parseCliArgs } = await setArgv(['-h'])
    const result = parseCliArgs()
    expect(mockLog).toHaveBeenCalled()
    expect(mockExit).toHaveBeenCalledWith(0)
    expect(result).toEqual({ action: 'default' })
  })

  it('无参数返回 default', async () => {
    const { parseCliArgs } = await setArgv([])
    expect(parseCliArgs()).toEqual({ action: 'default' })
  })

  it('未知参数不影响', async () => {
    const { parseCliArgs } = await setArgv(['--no-sandbox', '--enable-logging'])
    expect(parseCliArgs()).toEqual({ action: 'default' })
  })
})
