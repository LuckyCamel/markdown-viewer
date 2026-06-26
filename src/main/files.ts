import { readdir, readFile as fsReadFile, stat } from 'fs/promises'
import { basename, join } from 'path'
import type { FileEntry, FileContent } from '../shared/types'

export const SUPPORTED_EXTENSIONS = ['.md', '.markdown']

export const DEFAULT_IGNORE = ['.git', 'node_modules', '__pycache__', '.DS_Store']

export async function listDirectory(
  dirPath: string,
  ignoreList: string[] = DEFAULT_IGNORE,
): Promise<FileEntry[]> {
  const entries = await readdir(dirPath, { withFileTypes: true })
  const ignoreSet = new Set(ignoreList)
  const result: FileEntry[] = []

  for (const entry of entries) {
    if (ignoreSet.has(entry.name)) continue
    result.push({
      name: entry.name,
      path: join(dirPath, entry.name),
      isDirectory: entry.isDirectory(),
      isHidden: entry.name.startsWith('.'),
    })
  }

  return result.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

export async function readFile(filePath: string): Promise<FileContent> {
  const content = await fsReadFile(filePath, 'utf-8')
  return { path: filePath, content }
}

export async function getFileInfo(filePath: string): Promise<FileEntry> {
  const s = await stat(filePath)
  return {
    name: basename(filePath),
    path: filePath,
    isDirectory: s.isDirectory(),
    isHidden: basename(filePath).startsWith('.'),
  }
}

export function hasSupportedFiles(entries: FileEntry[]): boolean {
  return entries.some(
    (e) => !e.isDirectory && SUPPORTED_EXTENSIONS.some((ext) => e.name.endsWith(ext)),
  )
}
