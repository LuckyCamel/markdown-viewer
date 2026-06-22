import { BrowserWindow } from 'electron'
import { join } from 'path'
import { appStore } from './store'

let mainWindow: BrowserWindow | null = null

export function createWindow(): BrowserWindow {
  const savedBounds = appStore.get('windowBounds')

  mainWindow = new BrowserWindow({
    width: savedBounds.width,
    height: savedBounds.height,
    x: savedBounds.x,
    y: savedBounds.y,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('resize', () => {
    if (!mainWindow) return
    const [width, height] = mainWindow.getSize()
    const [x, y] = mainWindow.getPosition()
    appStore.set('windowBounds', { x, y, width, height })
  })

  mainWindow.on('move', () => {
    if (!mainWindow) return
    const [x, y] = mainWindow.getPosition()
    const [width, height] = mainWindow.getSize()
    appStore.set('windowBounds', { x, y, width, height })
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}
