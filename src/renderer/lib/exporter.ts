/**
 * 导出工具
 *
 * 提供 Markdown 渲染结果到 HTML 与 PDF 的导出能力。
 *
 * - HTML：调用 ReactDOMServer 渲染 MarkdownViewer，将结果包裹在带主题样式的 HTML 文档中
 * - PDF：通过 window.print() 触发浏览器原生打印，由用户选择"另存为 PDF"
 */

import { renderToStaticMarkup } from 'react-dom/server'
import { invoke } from '@tauri-apps/api/core'
import { save as saveDialog } from '@tauri-apps/plugin-dialog'
import { MarkdownViewer } from '../features/markdown-viewer/MarkdownViewer'
import { basename } from '../../shared/utils'

/**
 * 构造可独立查看的 HTML 文档
 */
function buildHtmlDocument(title: string, body: string, themeCss: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
<style>
  :root {
    --font-size: 14px;
    --line-height: 1.6;
    --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
    --code-font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  }
  body {
    margin: 0;
    padding: 2rem;
    background: #ffffff;
    color: #1f2937;
    font-family: var(--font-family);
    font-size: var(--font-size);
    line-height: var(--line-height);
  }
  .prose { max-width: 800px; margin: 0 auto; }
  .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 { margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 600; }
  .prose h1 { font-size: 2em; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3em; }
  .prose h2 { font-size: 1.5em; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3em; }
  .prose p { margin: 1em 0; }
  .prose code { background: #f3f4f6; padding: 0.2em 0.4em; border-radius: 3px; font-family: var(--code-font-family); font-size: 0.9em; }
  .prose pre { background: #1f2937; color: #f3f4f6; padding: 1em; border-radius: 6px; overflow-x: auto; }
  .prose pre code { background: transparent; padding: 0; color: inherit; }
  .prose blockquote { border-left: 4px solid #e5e7eb; padding-left: 1em; color: #6b7280; margin: 1em 0; }
  .prose table { border-collapse: collapse; width: 100%; }
  .prose th, .prose td { border: 1px solid #e5e7eb; padding: 0.5em 0.75em; }
  .prose th { background: #f9fafb; font-weight: 600; }
  .prose a { color: #2563eb; text-decoration: underline; }
  .prose img { max-width: 100%; height: auto; }
  .prose ul, .prose ol { padding-left: 2em; }
  .prose hr { border: none; border-top: 1px solid #e5e7eb; margin: 2em 0; }
  ${themeCss}
  @media print {
    body { padding: 0; }
    .prose { max-width: none; }
  }
</style>
</head>
<body>
<div class="prose">${body}</div>
</body>
</html>`
}

/**
 * HTML 转义，防止标题中包含特殊字符破坏 HTML 结构
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * 读取当前主题的 CSS 变量定义
 *
 * 通过遍历 document.styleSheets 找到 themes.css 提取主题相关的 :root 规则。
 * 若无法获取（如测试环境），返回空字符串（HTML 文档将使用内联默认值）。
 */
function getActiveThemeCss(): string {
  if (typeof document === 'undefined') return ''
  const themeAttr = document.documentElement.getAttribute('data-theme') || ''
  if (!themeAttr) return ''
  for (let i = 0; i < document.styleSheets.length; i++) {
    const sheet = document.styleSheets[i]
    let rules: CSSRuleList | null = null
    try {
      rules = sheet.cssRules
    } catch {
      continue
    }
    if (!rules) continue
    for (let j = 0; j < rules.length; j++) {
      const rule = rules[j]
      if (!(rule instanceof CSSStyleRule)) continue
      if (
        rule.selectorText.includes(themeAttr) ||
        rule.selectorText.includes(`[data-theme="${themeAttr}"]`)
      ) {
        return rule.cssText
      }
    }
  }
  return ''
}

/**
 * 将 Markdown 内容导出为独立 HTML 文件
 *
 * @param content Markdown 源文本
 * @param filePath 源文件路径，用于生成默认文件名
 * @returns 已保存的文件路径，用户取消时返回 null
 */
export async function exportAsHtml(content: string, filePath: string): Promise<string | null> {
  const body = renderToStaticMarkup(MarkdownViewer({ content, filePath }) as React.ReactElement)
  const title = basename(filePath).replace(/\.[^.]+$/, '') || 'document'
  const themeCss = getActiveThemeCss()
  const html = buildHtmlDocument(title, body, themeCss)

  const defaultName = `${title}.html`
  const target = await saveDialog({
    defaultPath: defaultName,
    filters: [{ name: 'HTML', extensions: ['html', 'htm'] }],
  })
  if (!target) return null

  await invoke('save_text_file', { path: target, content: html })
  return target
}

/**
 * 通过 window.print() 触发浏览器打印对话框
 *
 * 用户在打印对话框中选择"另存为 PDF"完成 PDF 导出。
 * 直接调用即可，无返回值。
 */
export function exportAsPdf(): void {
  if (typeof window === 'undefined') return
  window.print()
}
