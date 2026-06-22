import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { createWindow, getMainWindow } from './window'
import { registerFileProtocol } from './protocol'
import { createAppMenu } from './menu'
import { appStore, type StoreSchema } from './store'
import { listDirectory, readFile, getFileInfo } from './files'
import { watchFile, unwatchFile } from './watcher'
import { searchDirectory } from './search'

app.on('ready', () => {
  registerFileProtocol()

  ipcMain.handle('files:listDirectory', (_event, dirPath: string) => listDirectory(dirPath))
  ipcMain.handle('files:readFile', (_event, filePath: string) => readFile(filePath))
  ipcMain.handle('files:getFileInfo', (_event, filePath: string) => getFileInfo(filePath))
  ipcMain.handle('store:get', (_event, key: string) => appStore.get(key as keyof StoreSchema))
  ipcMain.handle('store:set', (_event, key: string, value: unknown) => {
    appStore.set(key as keyof StoreSchema, value as any)
  })
  ipcMain.handle('store:delete', (_event, key: string) => appStore.delete(key as keyof StoreSchema))
  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })
  ipcMain.handle('dialog:openFile', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openFile'] })
    return result.canceled ? null : result.filePaths[0]
  })
  ipcMain.handle('shell:openExternal', (_event, url: string) => shell.openExternal(url))

  const win = createWindow()
  createAppMenu(win)

  ipcMain.on('watcher:watchFile', (_event, filePath: string) => {
    watchFile(filePath, win)
  })
  ipcMain.on('watcher:unwatchFile', (_event, filePath: string) => {
    unwatchFile(filePath)
  })

  ipcMain.on('files:searchContent', (_event, dirPath: string, query: string) => {
    const mainWin = getMainWindow()
    if (!mainWin) return
    searchDirectory(dirPath, query, (progress) => {
      mainWin.webContents.send('search:result', progress)
    })
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
