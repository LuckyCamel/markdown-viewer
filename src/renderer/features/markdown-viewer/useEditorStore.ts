import { create } from 'zustand'
import { ipc } from '../../lib/ipc'

interface EditorState {
  contents: Record<string, string>
  loading: Record<string, boolean>
  errors: Record<string, string>
  loadContent: (filePath: string) => Promise<void>
  setContent: (filePath: string, content: string) => void
  removeContent: (filePath: string) => void
}

export const useEditorStore = create<EditorState>((set) => ({
  contents: {},
  loading: {},
  errors: {},
  loadContent: async (filePath) => {
    set((s) => {
      const { [filePath]: _err, ...restErrors } = s.errors
      return {
        loading: { ...s.loading, [filePath]: true },
        errors: restErrors,
      }
    })
    try {
      const result = await ipc.files.readFile(filePath)
      set((s) => ({
        contents: { ...s.contents, [filePath]: result.content },
        loading: { ...s.loading, [filePath]: false },
      }))
    } catch (e) {
      set((s) => ({
        errors: { ...s.errors, [filePath]: String(e) },
        loading: { ...s.loading, [filePath]: false },
      }))
    }
  },
  setContent: (filePath, content) =>
    set((s) => ({ contents: { ...s.contents, [filePath]: content } })),
  removeContent: (filePath) =>
    set((s) => {
      const { [filePath]: _c, ...rest } = s.contents
      const { [filePath]: _l, ...restLoading } = s.loading
      const { [filePath]: _e, ...restErrors } = s.errors
      return { contents: rest, loading: restLoading, errors: restErrors }
    }),
}))
