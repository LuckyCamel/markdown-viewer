import { EditorView } from '@codemirror/view'
import { Extension } from '@codemirror/state'

/**
 * CodeMirror 6 主题扩展
 *
 * 读取当前 CSS 变量（--font-size、--font-family、--code-font-family）注入到 CM6。
 * 与现有主题系统（data-theme 属性 + CSS 变量）保持一致。
 */
export const codemirrorTheme: Extension = EditorView.theme(
  {
    '&': {
      fontSize: 'var(--font-size, 14px)',
      fontFamily: 'var(--code-font-family, Consolas, Monaco, monospace)',
      backgroundColor: 'transparent',
      color: 'var(--text-primary, #1f2937)',
      height: '100%',
      outline: 'none',
    },
    '.cm-editor': {
      height: '100%',
    },
    '.cm-scroller': {
      overflow: 'auto',
      maxWidth: '100%',
    },
    '.cm-content': {
      caretColor: 'var(--text-primary, #1f2937)',
      padding: '1rem',
    },
    '.cm-line': {
      padding: '0 0.25rem',
      lineHeight: 'var(--line-height, 1.6)',
    },
    '.cm-focused': {
      outline: 'none',
    },
    '.cm-cursor': {
      borderLeftColor: 'var(--text-primary, #1f2937)',
    },
    '.cm-selectionBackground': {
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(0, 0, 0, 0.03)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgba(0, 0, 0, 0.03)',
    },
    '.cm-gutters': {
      backgroundColor: 'transparent',
      borderRight: 'none',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 0.75rem 0 0.25rem',
      minWidth: '2.5rem',
      textAlign: 'right',
      color: 'var(--text-muted, #9ca3af)',
      fontFamily: 'var(--code-font-family, monospace)',
    },
    '.cm-keyword': {
      color: '#7c3aed',
    },
    '.cm-string': {
      color: '#16a34a',
    },
    '.cm-comment': {
      color: '#9ca3af',
      fontStyle: 'italic',
    },
    '.cm-variable': {
      color: '#1f2937',
    },
    '.cm-variable-2': {
      color: '#2563eb',
    },
    '.cm-property': {
      color: '#ea580c',
    },
    '.cm-number': {
      color: '#059669',
    },
    '.cm-atom': {
      color: '#059669',
    },
    '.cm-meta': {
      color: '#9ca3af',
    },
    '.cm-qualifier': {
      color: '#7c3aed',
    },
    '.cm-builtin': {
      color: '#7c3aed',
    },
    '.cm-link': {
      color: '#2563eb',
      textDecoration: 'underline',
    },
  },
  { dark: false },
)

/**
 * 深色主题下的额外样式覆盖
 */
export const codemirrorDarkTheme: Extension = EditorView.theme(
  {
    '&': {
      color: 'var(--text-primary, #e5e7eb)',
    },
    '.cm-content': {
      caretColor: 'var(--text-primary, #e5e7eb)',
    },
    '.cm-cursor': {
      borderLeftColor: 'var(--text-primary, #e5e7eb)',
    },
    '.cm-selectionBackground': {
      backgroundColor: 'rgba(59, 130, 246, 0.3)',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      color: 'var(--text-muted, #6b7280)',
    },
    '.cm-variable': {
      color: '#e5e7eb',
    },
  },
  { dark: true },
)
