import { readdir, readFile as fsReadFile } from 'fs/promises'
import { join, extname } from 'path'
import type { SearchMatch, SearchProgress } from '../shared/types'

const TEXT_EXTENSIONS = new Set(['.md', '.markdown', '.txt', '.json', '.yaml', '.yml', '.toml'])

async function walkDir(dirPath: string): Promise<string[]> {
  const files: string[] = []
  const entries = await readdir(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
    const fullPath = join(dirPath, entry.name)
    if (entry.isDirectory()) {
      files.push(...await walkDir(fullPath))
    } else if (TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      files.push(fullPath)
    }
  }
  return files
}

export async function searchInFile(
  _filePath: string,
  query: string,
  content: string
): Promise<SearchMatch[]> {
  const matches: SearchMatch[] = []
  const lines = content.split('\n')
  const lowerQuery = query.toLowerCase()

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const col = line.toLowerCase().indexOf(lowerQuery)
    if (col !== -1) {
      const start = Math.max(0, col - 20)
      const end = Math.min(line.length, col + query.length + 20)
      matches.push({
        path: _filePath,
        line: i + 1,
        column: col + 1,
        match: query,
        lineContent: line.slice(start, end).trim(),
      })
    }
  }

  return matches
}

export async function searchDirectory(
  dirPath: string,
  query: string,
  onProgress: (progress: SearchProgress) => void
): Promise<void> {
  const allFiles = await walkDir(dirPath)
  let allMatches: SearchMatch[] = []

  for (let i = 0; i < allFiles.length; i++) {
    const content = await fsReadFile(allFiles[i], 'utf-8')
    const matches = await searchInFile(allFiles[i], query, content)
    allMatches.push(...matches)

    onProgress({
      totalFiles: allFiles.length,
      searchedFiles: i + 1,
      matches: allMatches,
    })
  }
}
