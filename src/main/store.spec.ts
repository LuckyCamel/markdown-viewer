import { describe, it, expect } from 'vitest'

describe('appStore', () => {
  async function getStore() {
    const { appStore } = await import('./store')
    return appStore
  }

  it('should return default theme as system', async () => {
    const store = await getStore()
    expect(store.get('theme')).toBe('system')
  })

  it('should store and retrieve a value', async () => {
    const store = await getStore()
    store.set('theme', 'dark')
    expect(store.get('theme')).toBe('dark')
  })

  it('should restore default after delete', async () => {
    const store = await getStore()
    store.set('theme', 'dark')
    store.delete('theme')
    expect(store.get('theme')).toBe('system')
  })

  it('should return default window bounds', async () => {
    const store = await getStore()
    expect(store.get('windowBounds')).toEqual({ width: 1200, height: 800 })
  })

  it('should clear all data', async () => {
    const store = await getStore()
    store.set('theme', 'dark')
    store.clear()
    expect(store.get('theme')).toBe('system')
  })
})
