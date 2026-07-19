import { useEffect, useRef, useState } from 'react'
import { EditorView } from '@codemirror/view'
import { Editor } from './Editor'
import { EditorToolbar } from './EditorToolbar'
import { ConflictBanner } from './ConflictBanner'
import type { SaveStatus } from './useEditorDocument'

interface EditorPaneProps {
  filePath: string
  content: string
  saveStatus: SaveStatus
  onLoadDisk: () => void
  onKeepMine: () => void
  onChange: (content: string) => void
}

/**
 * 编辑 UI 聚合：工具栏 + 冲突条 + CodeMirror。
 * 会话/持久化由 useEditorDocument 在上层处理。
 */
export function EditorPane({
  filePath,
  content,
  saveStatus,
  onLoadDisk,
  onKeepMine,
  onChange,
}: EditorPaneProps) {
  const editorRef = useRef<{ view: EditorView | null }>(null)
  const [editorView, setEditorView] = useState<EditorView | null>(null)
  const [conflictDismissed, setConflictDismissed] = useState(false)

  useEffect(() => {
    if (saveStatus !== 'conflict') {
      setConflictDismissed(false)
    }
  }, [saveStatus])

  return (
    <>
      <EditorToolbar view={editorView} />
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
        onChange={onChange}
        filePath={filePath}
        onViewReady={setEditorView}
      />
    </>
  )
}
