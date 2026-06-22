import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'

export const create: (typeof import('zustand'))['create'] = ((createState: any) => {
  const api = createStore(createState)
  api.getInitialState = api.getState
  const useBoundStore = (selector: any) => useStore(api, selector)
  Object.assign(useBoundStore, api)
  return useBoundStore
}) as any
