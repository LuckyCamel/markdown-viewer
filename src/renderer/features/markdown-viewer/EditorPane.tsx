import { useEffect, useRef, useState } from 'react'
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
}

/**
 * 编辑 UI 聚合：工具栏 + 冲突条 + CodeMirror。
 * 会话/持久化由 useEditorSession 在上层处理。
 */
export function EditorPane({
  filePath,
  content,
  saveStatus,
  onLoadDisk,
  onKeepMine,
}: EditorPaneProps) {
  const editorRef = useRef<{ view: EditorView | null }>(null)
  const [conflictDismissed, setConflictDismissed] = useState(false)

  useEffect(() => {
    if (saveStatus !== 'conflict') {
      setConflictDismissed(false)
    }
  }, [saveStatus])

  return (
    <>
      <EditorToolbar view={editorRef.current?.view ?? null} />
      {saveStatus === 'conflict' && !conflictDismissed && (
        <ConflictBanner
          onLoadDisk={onLoadDisk}
          onKeepMine={onKeepMine}
          onLater={() => setConflictDismissed(true)}
        />
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
