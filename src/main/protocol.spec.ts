import { describe, it, expect } from 'vitest'

describe('registerFileProtocol', () => {
  it('should register protocol without throwing', async () => {
    const { registerFileProtocol } = await import('./protocol')
    expect(() => registerFileProtocol()).not.toThrow()
  })

  it('should call protocol.handle with local-file', async () => {
    const electron = await import('electron')
    const { registerFileProtocol } = await import('./protocol')
    registerFileProtocol()
    expect(electron.protocol.handle).toHaveBeenCalledWith('local-file', expect.any(Function))
  })
})
