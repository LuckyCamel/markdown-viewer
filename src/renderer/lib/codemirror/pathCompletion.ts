import type { FileEntry } from '../../../shared/types'
import { fuzzyMatch } from '../../features/commands/fuzzyMatch'
import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import type { CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete'
import { autocompletion, startCompletion } from '@codemirror/autocomplete'

/**
 * 图片文件扩展名集合
 */
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico'])

/**
 * 补全候选项类型
 */
export interface PathCandidate {
  /** 显示名称（文件名或目录名） */
  label: string
  /** 完整路径（相对于工作区根） */
  fullPath: string
  /** 是否为目录 */
  isDirectory: boolean
  /** 是否为图片文件 */
  isImage: boolean
  /** 相对路径（相对于当前文件目录，用于插入） */
  relativePath: string
}

/**
 * 触发类型
 */
export type TriggerKind = 'wiki' | 'relative' | 'image' | 'link' | 'none'

/**
 * 判断文件是否为图片文件
 *
 * @param filename - 文件名
 * @returns 是否为图片文件
 */
export function isImageFile(filename: string): boolean {
  const lower = filename.toLowerCase()
  for (const ext of IMAGE_EXTENSIONS) {
    if (lower.endsWith(ext)) return true
  }
  return false
}

/**
 * 规范化路径分隔符为 /
 *
 * @param path - 原始路径
 * @returns 规范化后的路径
 */
function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+/g, '/')
}

/**
 * 获取文件的目录部分
 *
 * @param filePath - 文件完整路径
 * @returns 目录路径（不含末尾 /）
 */
function getDirPath(filePath: string): string {
  const normalized = normalizePath(filePath)
  const lastSlash = normalized.lastIndexOf('/')
  return lastSlash > 0 ? normalized.slice(0, lastSlash) : ''
}

/**
 * 计算从当前文件目录到目标文件的相对路径
 *
 * @param targetPath - 目标文件完整路径
 * @param currentFilePath - 当前文件完整路径
 * @returns 相对路径（如 ./api.md 或 ../api/config.md）
 */
export function getRelativePath(targetPath: string, currentFilePath: string): string {
  const normalizedTarget = normalizePath(targetPath)
  const normalizedCurrent = normalizePath(currentFilePath)
  const currentDir = getDirPath(normalizedCurrent)

  const targetParts = normalizedTarget.split('/').filter(Boolean)
  const currentParts = currentDir.split('/').filter(Boolean)

  // 找到共同前缀
  let commonLen = 0
  while (
    commonLen < targetParts.length - 1 &&
    commonLen < currentParts.length &&
    targetParts[commonLen].toLowerCase() === currentParts[commonLen].toLowerCase()
  ) {
    commonLen++
  }

  // 计算需要返回的上级目录数
  const upCount = currentParts.length - commonLen
  const downParts = targetParts.slice(commonLen)

  const parts: string[] = []
  for (let i = 0; i < upCount; i++) {
    parts.push('..')
  }
  parts.push(...downParts)

  const result = parts.join('/')
  // 同目录下文件以 ./ 开头
  if (upCount === 0 && !result.startsWith('.')) {
    return './' + result
  }
  return result
}

/**
 * 从输入的查询路径中解析出"已确定的目录前缀"和"过滤词"
 *
 * 例如输入 `./images/arch` 时：
 * - 目录前缀：`images/`（相对于当前文件目录）
 * - 过滤词：`arch`
 *
 * @param query - 用户输入的查询字符串（如 ./images/arch、[[api、./）
 * @param currentFilePath - 当前文件完整路径
 * @returns 解析结果
 */
export function parsePathQuery(
  query: string,
  currentFilePath: string,
): { dirPrefix: string; filter: string } {
  // 去掉触发词部分，只保留路径部分
  let pathPart = query
  if (pathPart.startsWith('[[')) pathPart = pathPart.slice(2)
  else if (pathPart.startsWith('![](')) pathPart = pathPart.slice(4)
  else if (pathPart.startsWith('](')) pathPart = pathPart.slice(2)

  // 如果以 ./ 开头，去掉 ./
  if (pathPart.startsWith('./')) {
    pathPart = pathPart.slice(2)
  }

  // 找到最后一个 / 的位置，分割目录前缀和过滤词
  const lastSlash = pathPart.lastIndexOf('/')
  if (lastSlash >= 0) {
    return {
      dirPrefix: pathPart.slice(0, lastSlash + 1),
      filter: pathPart.slice(lastSlash + 1),
    }
  }
  return { dirPrefix: '', filter: pathPart }
}

/**
 * 根据目录前缀和当前文件路径，计算需要列出哪个目录的内容
 *
 * @param dirPrefix - 目录前缀（如 images/ 或 ../api/）
 * @param currentFilePath - 当前文件完整路径
 * @returns 目标目录的完整路径，若无法计算则返回 null
 */
export function resolveTargetDir(dirPrefix: string, currentFilePath: string): string | null {
  const normalizedCurrent = normalizePath(currentFilePath)
  const currentDir = getDirPath(normalizedCurrent)

  if (!dirPrefix) {
    // 没有目录前缀，返回当前文件所在目录
    return currentDir
  }

  // 保留开头的 /，使用 split('/') 后重新拼接
  const isAbsolute = currentDir.startsWith('/')
  const currentParts = currentDir.split('/').filter(Boolean)
  const prefixParts = dirPrefix.split('/').filter(Boolean)
  const resultParts = [...currentParts]

  for (const part of prefixParts) {
    if (part === '..') {
      resultParts.pop()
    } else if (part !== '.') {
      resultParts.push(part)
    }
  }

  return (isAbsolute ? '/' : '') + resultParts.join('/')
}

/**
 * 构建补全候选项列表
 *
 * @param entries - 目录中的文件条目
 * @param currentFilePath - 当前文件完整路径
 * @param options - 可选配置
 * @returns 候选项列表
 */
export function buildCandidates(
  entries: FileEntry[],
  currentFilePath: string,
  options: { imagesOnly?: boolean } = {},
): PathCandidate[] {
  const { imagesOnly = false } = options
  const candidates: PathCandidate[] = []

  for (const entry of entries) {
    // 跳过隐藏文件
    if (entry.isHidden) continue

    // 如果仅显示图片，过滤非图片文件
    if (imagesOnly && !entry.isDirectory && !isImageFile(entry.name)) continue

    const relativePath = getRelativePath(entry.path, currentFilePath)
    candidates.push({
      label: entry.name,
      fullPath: entry.path,
      isDirectory: entry.isDirectory,
      isImage: !entry.isDirectory && isImageFile(entry.name),
      relativePath,
    })
  }

  // 目录排在前面，然后按名称排序
  candidates.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1
    }
    return a.label.localeCompare(b.label)
  })

  return candidates
}

/**
 * 根据过滤词对候选项进行模糊匹配过滤
 *
 * @param filter - 过滤词
 * @param candidates - 候选项列表
 * @returns 过滤后的候选项（最多 50 条）
 */
export function filterPaths(filter: string, candidates: PathCandidate[]): PathCandidate[] {
  if (!filter) {
    return candidates.slice(0, 50)
  }

  const scored = candidates
    .map((c) => ({ candidate: c, score: fuzzyMatch(filter, c.label) }))
    .filter((x) => x.score > 0)

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 50).map((x) => x.candidate)
}

/**
 * 检测触发类型
 *
 * @param textBefore - 光标前的文本
 * @returns 触发类型
 */
export function detectTrigger(textBefore: string): TriggerKind {
  // ![]( 触发图片补全
  if (/!\[\]\($/.test(textBefore)) return 'image'
  // ]( 触发链接路径补全
  if (/\]\($/.test(textBefore)) return 'link'
  // [[ 触发 wiki 链接补全
  if (/\[\[$/.test(textBefore)) return 'wiki'
  // ./ 触发相对路径补全
  if (/(^|\s|\(|\[)\.\/$/.test(textBefore)) return 'relative'
  return 'none'
}

/**
 * 从光标前的文本中提取查询字符串
 *
 * @param textBefore - 光标前的文本
 * @param trigger - 触发类型
 * @returns 查询字符串
 */
export function extractQuery(textBefore: string, trigger: TriggerKind): string {
  // 找到触发词的位置
  let triggerIdx = -1
  let triggerLen = 0

  switch (trigger) {
    case 'image':
      triggerIdx = textBefore.lastIndexOf('![](')
      triggerLen = 4
      break
    case 'link':
      triggerIdx = textBefore.lastIndexOf('](')
      triggerLen = 2
      break
    case 'wiki':
      triggerIdx = textBefore.lastIndexOf('[[')
      triggerLen = 2
      break
    case 'relative': {
      // ./ 的位置 - 找到最后一个 ./
      const idx = textBefore.lastIndexOf('./')
      if (idx < 0) return ''
      // 确保这是一个触发（前面是行首、空白或括号），而不是路径中间的 ./
      if (idx > 0) {
        const prevChar = textBefore[idx - 1]
        if (!/[\s([]/.test(prevChar)) return ''
      }
      triggerIdx = idx
      triggerLen = 2
      break
    }
    case 'none':
      return ''
  }

  if (triggerIdx < 0) return ''
  return textBefore.slice(triggerIdx + triggerLen)
}

/**
 * 生成插入文本
 *
 * 根据触发类型和候选项，生成要插入到编辑器中的文本。
 * - wiki: `[filename](./relative/path)` （替换掉 `[[`）
 * - image: `](./relative/path)` （替换掉 `![](` 后的查询文本）
 * - link: `./relative/path` （替换掉 `](` 后的查询文本，保留结尾的 `)`）
 * - relative: `relative/path` （替换掉 `./` 后的查询文本）
 *
 * @param trigger - 触发类型
 * @param candidate - 选中的候选项
 * @returns 插入文本和需要替换的范围
 */
export function buildInsertText(
  trigger: TriggerKind,
  candidate: PathCandidate,
): { text: string; replaceTrigger: boolean } {
  const relPath = candidate.relativePath
  const displayLabel = candidate.isDirectory
    ? candidate.label
    : candidate.label.replace(/\.[^.]+$/, '')

  switch (trigger) {
    case 'wiki':
      // [[ → [label](./path)
      return {
        text: `[${displayLabel}](${relPath})`,
        replaceTrigger: true,
      }
    case 'image':
      // ![]( → ](./path)
      return {
        text: `](${relPath})`,
        replaceTrigger: true,
      }
    case 'link':
      // ]( → ./path （用户需要自己加结尾的 )）
      return {
        text: relPath,
        replaceTrigger: true,
      }
    case 'relative':
      // ./ → path 或 path/
      return {
        text: candidate.isDirectory ? relPath + '/' : relPath,
        replaceTrigger: true,
      }
    case 'none':
      return { text: relPath, replaceTrigger: false }
  }
}

/**
 * 路径补全扩展的配置
 */
export interface PathCompletionOptions {
  /** 当前文件完整路径 */
  currentFilePath: string
  /** 列出指定目录的文件条目（异步） */
  listDirectory: (dirPath: string) => Promise<FileEntry[]>
}

/**
 * 创建路径补全的 CodeMirror 扩展
 *
 * @param options - 配置项
 * @returns CodeMirror Extension
 */
export function pathCompletionExtension(options: PathCompletionOptions): Extension {
  const { currentFilePath, listDirectory } = options

  /**
   * 补全 source 函数
   */
  async function pathCompletionSource(ctx: CompletionContext): Promise<CompletionResult | null> {
    const textBefore = ctx.state.doc.sliceString(0, ctx.pos)
    const trigger = detectTrigger(textBefore)
    if (trigger === 'none') return null

    const query = extractQuery(textBefore, trigger)
    const { dirPrefix, filter } = parsePathQuery(
      trigger === 'wiki' ? query : query.startsWith('./') ? query : './' + query,
      currentFilePath,
    )

    // 解析目标目录
    const targetDir = resolveTargetDir(dirPrefix, currentFilePath)
    if (targetDir === null) return null

    // 异步加载目录数据
    let entries: FileEntry[]
    try {
      entries = await listDirectory(targetDir)
    } catch {
      return null
    }

    // 构建候选项
    const imagesOnly = trigger === 'image'
    const candidates = buildCandidates(entries, currentFilePath, { imagesOnly })

    // 过滤
    const filtered = filterPaths(filter, candidates)
    if (filtered.length === 0) return null

    // 找到触发词位置，用于替换
    const triggerText =
      trigger === 'wiki' ? '[[' : trigger === 'image' ? '![](' : trigger === 'link' ? '](' : './'

    const triggerEnd = ctx.pos - query.length
    const triggerStart = triggerEnd - triggerText.length

    const options: Completion[] = filtered.map((c) => {
      const insert = buildInsertText(trigger, c)
      return {
        label: c.label,
        type: c.isDirectory ? 'folder' : c.isImage ? 'visual' : 'text',
        detail: c.isDirectory ? '目录' : c.relativePath,
        // 用 apply 函数替换触发词 + 查询文本，插入最终结果
        apply: (view: EditorView, _completion: Completion, _from: number, to: number) => {
          view.dispatch({
            changes: {
              from: triggerStart,
              to: to,
              insert: insert.text,
            },
          })
        },
      }
    })

    // from 设为光标位置（触发词之后），这样 CodeMirror 才会显示补全列表
    return {
      from: triggerEnd,
      to: ctx.pos,
      options,
      validFor: /^[\w./-]*$/,
    }
  }

  /**
   * 编辑器更新监听器：文档变化后检测触发模式，手动启动补全
   *
   * 因为 activateOnTyping 默认只在标识符字符后触发，
   * 对于 [[、./、![]( 等特殊字符组合需要手动触发。
   */
  const triggerCompletionOnChange = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      const textBefore = update.state.doc.sliceString(0, update.state.selection.main.head)
      const trigger = detectTrigger(textBefore)
      if (trigger !== 'none') {
        setTimeout(() => {
          startCompletion(update.view)
        }, 0)
      }
    }
  })

  return [
    autocompletion({
      override: [pathCompletionSource],
      activateOnTyping: false,
    }),
    triggerCompletionOnChange,
  ]
}
