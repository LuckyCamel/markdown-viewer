import { open as openFile } from 'fs/promises'
import { basename } from 'path'
import type { FileEntry } from '../shared/types'
import { listDirectory } from './files'

function cacheKey(dirPath: string, ignoreList: string[], extensions: string[]): string {
  return `${dirPath}::${[...ignoreList].sort().join(',')}::${[...extensions].sort().join(',')}`
}

const cache = new Map<string, FileEntry[]>()
const enqueued = new Set<string>()

function isTextFile(buffer: Buffer): boolean {
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] === 0) return false
  }
  return true
}

async function readFirstBuffer(filePath: string): Promise<Buffer> {
  let fileHandle: Awaited<ReturnType<typeof openFile>> | undefined
  try {
    fileHandle = await openFile(filePath, 'r')
    const buf = Buffer.alloc(4096)
    const { bytesRead } = await fileHandle.read(buf, 0, 4096, 0)
    return buf.subarray(0, bytesRead)
  } finally {
    if (fileHandle !== undefined) await fileHandle.close()
  }
}

function shouldInclude(
  entry: { name: string; isDirectory: boolean; path: string },
  ignoreList: string[],
  extensions: string[],
): { include: boolean; checkBinary?: boolean } {
  const ignoreSet = new Set(ignoreList)
  if (ignoreSet.has(entry.name)) return { include: false }
  if (entry.isDirectory) return { include: true }

  const hasExt = basename(entry.name).includes('.')
  const extMatch = extensions.filter((e) => e !== '').some((ext) => entry.name.endsWith(ext))

  if (extMatch) return { include: true }
  if (!hasExt && extensions.includes('')) return { include: true, checkBinary: true }

  return { include: false }
}

export async function getFilteredEntries(
  dirPath: string,
  ignoreList: string[],
  extensions: string[],
): Promise<FileEntry[]> {
  const key = cacheKey(dirPath, ignoreList, extensions)
  if (cache.has(key)) return cache.get(key)!

  const rawEntries = await listDirectory(dirPath, ignoreList)
  const filtered: FileEntry[] = []

  for (const entry of rawEntries) {
    const { include, checkBinary } = shouldInclude(
      entry as { name: string; isDirectory: boolean; path: string },
      ignoreList,
      extensions,
    )
    if (!include) continue

    if (checkBinary) {
      const buf = await readFirstBuffer(entry.path)
      if (!isTextFile(buf)) continue
    }

    filtered.push(entry)
    if (entry.isDirectory && !enqueued.has(entry.path)) {
      enqueued.add(entry.path)
      queueScan(entry.path, ignoreList, extensions)
    }
  }

  cache.set(key, filtered)
  return filtered
}

const scanQueue: Array<{ dirPath: string; ignoreList: string[]; extensions: string[] }> = []
let scanTimer: ReturnType<typeof setImmediate> | null = null

function queueScan(dirPath: string, ignoreList: string[], extensions: string[]): void {
  scanQueue.push({ dirPath, ignoreList, extensions })
  if (!scanTimer) {
    scanTimer = setImmediate(processScan)
  }
}

function processScan(): void {
  const batch = scanQueue.splice(0, 3)
  for (const { dirPath, ignoreList, extensions } of batch) {
    getFilteredEntries(dirPath, ignoreList, extensions).catch(() => {
      // 后台扫描失败静默处理
    })
  }
  if (scanQueue.length > 0) {
    scanTimer = setImmediate(processScan)
  } else {
    scanTimer = null
  }
}

export function invalidateAll(): void {
  cache.clear()
  enqueued.clear()
  scanQueue.length = 0
  if (scanTimer) {
    clearImmediate(scanTimer)
    scanTimer = null
  }
}
