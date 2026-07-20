import type { ViewMode } from '../../shared/types'
import { getFileKind, allowsEdit, allowsPreview } from '../../shared/fileTypes'

export type SurfaceKind = 'markdown-read' | 'markdown-edit' | 'source'

export interface DocumentSurface {
  kind: SurfaceKind
  capabilities: {
    hasSession: boolean
    hasOutline: boolean
    allowsEditMode: boolean
    allowsPreview: boolean
  }
}

export interface LoadState {
  isLoading: boolean
  hasError: boolean
}

export function getDocumentSurface(
  path: string,
  viewMode: ViewMode,
  _loadState: LoadState,
): DocumentSurface {
  const kind = getFileKind(path)

  if (kind === 'markdown') {
    return {
      kind: viewMode === 'edit' ? 'markdown-edit' : 'markdown-read',
      capabilities: {
        hasSession: true,
        hasOutline: true,
        allowsEditMode: true,
        allowsPreview: true,
      },
    }
  }

  return {
    kind: 'source',
    capabilities: {
      hasSession: false,
      hasOutline: false,
      allowsEditMode: allowsEdit(path),
      allowsPreview: allowsPreview(path),
    },
  }
}

export function isSurfaceKindMarkdown(kind: SurfaceKind): boolean {
  return kind === 'markdown-read' || kind === 'markdown-edit'
}
