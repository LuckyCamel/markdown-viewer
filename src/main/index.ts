import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { createWindow, getMainWindow } from './window'
import { registerFileProtocol } from './protocol'
import { createAppMenu } from './menu'
import { appStore, type StoreSchema } from './store'
import { watchFile, unwatchFile } from './watcher'
import { logError } from './logger'
import { invalidateAll } from './file-filter'
import { IPC_CHANNELS } from '../shared/types'
import {
  handleListDirectory,
  handleReadFile,
  handleGetFileInfo,
  handleStoreGet,
  handleStoreSet,
  handleStoreDelete,
  handleSearchContent,
} from './handlers'

process.on('uncaughtException', (err) => {
  logError('uncaughtException', err)
})
process.on('unhandledRejection', (err) => {
  logError('unhandledRejection', err)
})

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.FILES_LIST_DIRECTORY, (_event, dirPath: string) =>
    handleListDirectory(dirPath, appStore.get('ignoreList'), appStore.get('markdownExtensions')),
  )
  ipcMain.handle(IPC_CHANNELS.FILES_READ_FILE, (_event, filePath: string) =>
    handleReadFile(filePath),
  )
  ipcMain.handle(IPC_CHANNELS.FILES_GET_FILE_INFO, (_event, filePath: string) =>
    handleGetFileInfo(filePath),
  )
  ipcMain.handle(IPC_CHANNELS.STORE_GET, (_event, key: string) => {
    try {
      return handleStoreGet(appStore.get, key as keyof StoreSchema)
    } catch (err) {
      logError('store:get', err)
      throw err
    }
  })
  ipcMain.handle(IPC_CHANNELS.STORE_SET, (_event, key: string, value: unknown) => {
    try {
      handleStoreSet(appStore.set, key as keyof StoreSchema, value as any)
    } catch (err) {
      logError('store:set', err)
    }
  })
  ipcMain.handle(IPC_CHANNELS.STORE_DELETE, (_event, key: string) => {
    try {
      handleStoreDelete(appStore.delete, key as keyof StoreSchema)
    } catch (err) {
      logError('store:delete', err)
    }
  })
  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_DIRECTORY, async () => {
    try {
      const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
      return result.canceled ? null : result.filePaths[0]
    } catch (err) {
      logError('dialog:openDirectory', err)
      throw err
    }
  })
  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_FILE, async () => {
    try {
      const result = await dialog.showOpenDialog({ properties: ['openFile'] })
      return result.canceled ? null : result.filePaths[0]
    } catch (err) {
      logError('dialog:openFile', err)
      throw err
    }
  })
  ipcMain.handle(IPC_CHANNELS.SHELL_OPEN_EXTERNAL, (_event, url: string) => shell.openExternal(url))

  ipcMain.handle(IPC_CHANNELS.FILE_FILTER_INVALIDATE, async () => {
    invalidateAll()
  })

  ipcMain.on(IPC_CHANNELS.WATCHER_WATCH_FILE, (_event, filePath: string) => {
    const mainWin = getMainWindow()
    if (mainWin) watchFile(filePath, mainWin)
  })
  ipcMain.on(IPC_CHANNELS.WATCHER_UNWATCH_FILE, (_event, filePath: string) => {
    try {
      unwatchFile(filePath)
    } catch (err) {
      logError('watcher:unwatchFile', err)
    }
  })

  let activeSearchId = 0
  ipcMain.on(IPC_CHANNELS.FILES_SEARCH_CONTENT, (_event, dirPath: string, query: string) => {
    const searchId = ++activeSearchId
    const mainWin = getMainWindow()
    if (!mainWin) return
    const ignoreList = appStore.get('ignoreList')
    handleSearchContent(dirPath, query, ignoreList, (progress) => {
      if (searchId === activeSearchId) {
        mainWin.webContents.send(IPC_CHANNELS.SEARCH_RESULT, progress)
      }
    })
  })
}

app.on('ready', () => {
  try {
    registerFileProtocol()
    registerIpcHandlers()
    const win = createWindow()
    createAppMenu(win)
  } catch (err) {
    logError('app:ready', err)
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
