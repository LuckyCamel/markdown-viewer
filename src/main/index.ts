import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { createWindow, getMainWindow } from './window'
import { registerFileProtocol } from './protocol'
import { createAppMenu } from './menu'
import { appStore, type StoreSchema } from './store'
import { listDirectory, readFile, getFileInfo } from './files'
import { watchFile, unwatchFile } from './watcher'
import { searchDirectory } from './search'
import { logError } from './logger'

process.on('uncaughtException', (err) => {
  logError('uncaughtException', err)
})
process.on('unhandledRejection', (err) => {
  logError('unhandledRejection', err)
})

app.on('ready', () => {
  try {
    registerFileProtocol()

    ipcMain.handle('files:listDirectory', (_event, dirPath: string) => {
      const ignoreList = appStore.get('ignoreList')
      return listDirectory(dirPath, ignoreList)
    })
    ipcMain.handle('files:readFile', (_event, filePath: string) => readFile(filePath))
    ipcMain.handle('files:getFileInfo', (_event, filePath: string) => getFileInfo(filePath))
    ipcMain.handle('store:get', (_event, key: string) => {
      try {
        return appStore.get(key as keyof StoreSchema)
      } catch (err) {
        logError('store:get', err)
        throw err
      }
    })
    ipcMain.handle('store:set', (_event, key: string, value: unknown) => {
      try {
        appStore.set(key as keyof StoreSchema, value as any)
      } catch (err) {
        logError('store:set', err)
      }
    })
    ipcMain.handle('store:delete', (_event, key: string) => {
      try {
        appStore.delete(key as keyof StoreSchema)
      } catch (err) {
        logError('store:delete', err)
      }
    })
    ipcMain.handle('dialog:openDirectory', async () => {
      try {
        const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
        return result.canceled ? null : result.filePaths[0]
      } catch (err) {
        logError('dialog:openDirectory', err)
        throw err
      }
    })
    ipcMain.handle('dialog:openFile', async () => {
      try {
        const result = await dialog.showOpenDialog({ properties: ['openFile'] })
        return result.canceled ? null : result.filePaths[0]
      } catch (err) {
        logError('dialog:openFile', err)
        throw err
      }
    })
    ipcMain.handle('shell:openExternal', (_event, url: string) => shell.openExternal(url))

    const win = createWindow()
    createAppMenu(win)

    ipcMain.on('watcher:watchFile', (_event, filePath: string) => {
      watchFile(filePath, win)
    })
    ipcMain.on('watcher:unwatchFile', (_event, filePath: string) => {
      try {
        unwatchFile(filePath)
      } catch (err) {
        logError('watcher:unwatchFile', err)
      }
    })

    ipcMain.on('files:searchContent', (_event, dirPath: string, query: string) => {
      const mainWin = getMainWindow()
      if (!mainWin) return
      const ignoreList = appStore.get('ignoreList')
      searchDirectory(
        dirPath,
        query,
        (progress) => {
          mainWin.webContents.send('search:result', progress)
        },
        ignoreList,
      )
    })
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
