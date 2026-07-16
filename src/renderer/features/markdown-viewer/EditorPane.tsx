import { useRef } from 'react'
import { EditorView } from '@codemirror/view'
import { Editor } from './Editor'
import { EditorToolbar } from './EditorToolbar'
import { ConflictBanner } from './ConflictBanner'
import { useEditorStore } from './useEditorStore'
import type { SaveStatus } from './useEditorPersistence'

interface EditorPaneProps {
  filePath: string
  content: string
  saveStatus: SaveStatus
  onLoadDisk: () => void
  onKeepMine: () => void
  onLater: () => void
}

export function EditorPane({
  filePath,
  content,
  saveStatus,
  onLoadDisk,
  onKeepMine,
  onLater,
}: EditorPaneProps) {
  const editorRef = useRef<{ view: EditorView | null }>(null)

  return (
    <>
      <EditorToolbar view={editorRef.current?.view as any} />
      {saveStatus === 'conflict' && (
        <ConflictBanner onLoadDisk={onLoadDisk} onKeepMine={onKeepMine} onLater={onLater} />
      )}
      <Editor
        ref={editorRef}
        key={filePath}
        value={content}
        onChange={(newContent) => useEditorStore.getState().setContent(filePath, newContent)}
      />
    </>
  )
}
