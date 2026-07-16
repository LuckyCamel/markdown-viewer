import { useCallback } from 'react'
import { EditorView } from '@codemirror/view'
import {
  toggleBold,
  toggleItalic,
  toggleStrikethrough,
  toggleInlineCode,
  setHeading,
  toggleUnorderedList,
  toggleOrderedList,
  toggleTaskList,
  toggleBlockquote,
  insertLink,
  insertImage,
  insertHorizontalRule,
  insertTable,
  insertCodeBlock,
  undo,
  redo,
} from '../../lib/codemirror/markdownCommands'

interface EditorToolbarProps {
  view: EditorView | null
}

interface ToolbarButtonProps {
  onClick: () => void
  title: string
  icon: React.ReactNode
  shortcut?: string
}

function ToolbarButton({ onClick, title, icon, shortcut }: ToolbarButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        onClick()
      }}
      title={shortcut ? `${title} (${shortcut})` : title}
      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {icon}
      </svg>
    </button>
  )
}

export function EditorToolbar({ view }: EditorToolbarProps) {
  const handleAction = useCallback(
    (action: (v: EditorView) => void) => {
      if (!view) return
      action(view)
      view.focus()
    },
    [view],
  )

  if (!view) return null

  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-wrap">
      <div className="flex items-center gap-1 border-r border-gray-200 dark:border-gray-700 pr-3 mr-3">
        <ToolbarButton
          onClick={() => handleAction((v) => setHeading(v, 1))}
          title="Heading 1"
          icon={<path d="M4 4h16v3H8l-4 4v10H4V4z" />}
          shortcut="Ctrl+1"
        />
        <ToolbarButton
          onClick={() => handleAction((v) => setHeading(v, 2))}
          title="Heading 2"
          icon={<path d="M4 4h16v3H8l-4 4v8H4V4z" />}
          shortcut="Ctrl+2"
        />
        <ToolbarButton
          onClick={() => handleAction((v) => setHeading(v, 3))}
          title="Heading 3"
          icon={<path d="M4 4h16v3H8l-4 4v4H4V4z" />}
          shortcut="Ctrl+3"
        />
      </div>

      <div className="flex items-center gap-1 border-r border-gray-200 dark:border-gray-700 pr-3 mr-3">
        <ToolbarButton
          onClick={() => handleAction(toggleBold)}
          title="Bold"
          icon={<path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H8" />}
          shortcut="Ctrl+B"
        />
        <ToolbarButton
          onClick={() => handleAction(toggleItalic)}
          title="Italic"
          icon={<path d="M14 4h6v6" />}
          shortcut="Ctrl+I"
        />
        <ToolbarButton
          onClick={() => handleAction(toggleStrikethrough)}
          title="Strikethrough"
          icon={<path d="M18 4H6l6 8-6 8h12l-6-8z" />}
          shortcut="Ctrl+S"
        />
        <ToolbarButton
          onClick={() => handleAction(toggleInlineCode)}
          title="Inline Code"
          icon={<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />}
          shortcut="Ctrl+`"
        />
      </div>

      <div className="flex items-center gap-1 border-r border-gray-200 dark:border-gray-700 pr-3 mr-3">
        <ToolbarButton
          onClick={() => handleAction(toggleUnorderedList)}
          title="Unordered List"
          icon={<path d="M6 4h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H6" />}
          shortcut="Ctrl+U"
        />
        <ToolbarButton
          onClick={() => handleAction(toggleOrderedList)}
          title="Ordered List"
          icon={<path d="M3 6h18" />}
          shortcut="Ctrl+O"
        />
        <ToolbarButton
          onClick={() => handleAction(toggleTaskList)}
          title="Task List"
          icon={<path d="M3 6h18" />}
        />
        <ToolbarButton
          onClick={() => handleAction(toggleBlockquote)}
          title="Quote"
          icon={<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />}
        />
      </div>

      <div className="flex items-center gap-1 border-r border-gray-200 dark:border-gray-700 pr-3 mr-3">
        <ToolbarButton
          onClick={() => handleAction(insertLink)}
          title="Link"
          icon={<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />}
          shortcut="Ctrl+K"
        />
        <ToolbarButton
          onClick={() => handleAction(insertImage)}
          title="Image"
          icon={<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />}
        />
        <ToolbarButton
          onClick={() => handleAction(insertTable)}
          title="Table"
          icon={<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />}
        />
        <ToolbarButton
          onClick={() => handleAction(insertCodeBlock)}
          title="Code Block"
          icon={<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />}
        />
        <ToolbarButton
          onClick={() => handleAction(insertHorizontalRule)}
          title="Horizontal Rule"
          icon={<path d="M4 12h16" />}
        />
      </div>

      <div className="flex items-center gap-1">
        <ToolbarButton
          onClick={() => handleAction(undo)}
          title="Undo"
          icon={<path d="M3 7v6h6" />}
          shortcut="Ctrl+Z"
        />
        <ToolbarButton
          onClick={() => handleAction(redo)}
          title="Redo"
          icon={<path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />}
          shortcut="Ctrl+Y"
        />
      </div>
    </div>
  )
}
