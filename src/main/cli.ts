import { app } from 'electron'
import { readFileSync } from 'fs'
import { join } from 'path'
import { logError } from './logger'

export interface CliResult {
  action: 'version' | 'help' | 'default'
}

const HELP_TEXT = `Markdown Viewer

Usage: markdown-viewer [options]

Options:
  -v, --version   Print version and exit
  -h, --help      Print this help and exit
`

function getVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(app.getAppPath(), 'package.json'), 'utf-8')) as {
      version: string
    }
    return pkg.version
  } catch (err) {
    logError('cli:readPackageJson', err)
    return 'unknown'
  }
}

export function parseCliArgs(): CliResult {
  try {
    const rawArgs = process.argv.slice(app.isPackaged ? 1 : 2)

    if (rawArgs.includes('-v') || rawArgs.includes('--version')) {
      console.log(getVersion())
      process.exit(0)
      return { action: 'default' }
    }
    if (rawArgs.includes('-h') || rawArgs.includes('--help')) {
      console.log(HELP_TEXT.trim())
      process.exit(0)
      return { action: 'default' }
    }

    return { action: 'default' }
  } catch (err) {
    logError('cli:parseCliArgs', err)
    return { action: 'default' }
  }
}
