import { watch, FSWatcher } from 'fs'
import { BrowserWindow } from 'electron'
import { readFile } from './files'
import { logError } from './logger'
import type { FileChangeEvent } from '../shared/types'
import { IPC_CHANNELS } from '../shared/types'

const watchers = new Map<string, FSWatcher>()

export function watchFile(filePath: string, window: BrowserWindow): void {
  if (watchers.has(filePath)) return

  const watcher = watch(filePath, async (eventType) => {
    if (eventType === 'change') {
      try {
        const { content } = await readFile(filePath)
        const event: FileChangeEvent = { path: filePath, type: 'change' }
        window.webContents.send(IPC_CHANNELS.WATCHER_FILE_CHANGED, event, content)
      } catch {
        const event: FileChangeEvent = { path: filePath, type: 'delete' }
        window.webContents.send(IPC_CHANNELS.WATCHER_FILE_CHANGED, event, null)
      }
    }
  })

  watcher.on('error', (err) => {
    logError('watcher', err)
  })

  watchers.set(filePath, watcher)
}

export function unwatchFile(filePath: string): void {
  const watcher = watchers.get(filePath)
  if (watcher) {
    watcher.close()
    watchers.delete(filePath)
  }
}

export function unwatchAll(): void {
  for (const [path, watcher] of watchers) {
    watcher.close()
    watchers.delete(path)
  }
}
