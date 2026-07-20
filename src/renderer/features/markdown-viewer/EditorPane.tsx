import { useEffect, useRef, useState } from 'react'
import { EditorView } from '@codemirror/view'
import { Editor } from './Editor'
import { EditorToolbar } from './EditorToolbar'
import { ConflictBanner } from './ConflictBanner'
import { MarkdownViewer } from './MarkdownViewer'
import type { SaveStatus } from './useEditorDocument'

interface EditorPaneProps {
  filePath: string
  content: string
  saveStatus: SaveStatus
  onLoadDisk: () => void
  onKeepMine: () => void
  onChange: (content: string) => void
  previewEnabled?: boolean
}

/**
 * 编辑 UI 聚合：工具栏 + 冲突条 + CodeMirror。
 * 会话/持久化由 useEditorDocument 在上层处理。
 * 支持编辑时预览模式。
 */
export function EditorPane({
  filePath,
  content,
  saveStatus,
  onLoadDisk,
  onKeepMine,
  onChange,
  previewEnabled = false,
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
    <div className={`h-full flex flex-col ${previewEnabled ? 'flex-row' : ''}`}>
      <div className="flex-1 flex flex-col min-w-0">
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
      </div>
      {previewEnabled && (
        <div className="w-1/2 border-l border-gray-200 dark:border-gray-700 overflow-y-auto bg-white dark:bg-gray-900">
          <MarkdownViewer content={content} filePath={filePath} />
        </div>
      )}
    </div>
  )
}
