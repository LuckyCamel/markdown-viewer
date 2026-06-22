import { protocol } from 'electron'
import { readFile } from 'fs/promises'
import { extname } from 'path'
import { logError } from './logger'

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
}

export function registerFileProtocol(): void {
  protocol.handle('local-file', async (request) => {
    try {
      const filePath = decodeURIComponent(request.url.slice('local-file://'.length))
      const ext = extname(filePath).toLowerCase()
      const data = await readFile(filePath)
      return new Response(data, {
        headers: { 'Content-Type': MIME_MAP[ext] || 'application/octet-stream' },
      })
    } catch (err) {
      logError('protocol:readFile', err)
      return new Response('File not found', { status: 404 })
    }
  })
}
