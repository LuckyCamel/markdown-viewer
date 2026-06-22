import { Menu, BrowserWindow, shell, dialog, app } from 'electron'
import { logError } from './logger'
import { IPC_CHANNELS } from '../shared/types'

export function createAppMenu(mainWindow: BrowserWindow): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Folder...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            try {
              const result = await dialog.showOpenDialog(mainWindow, {
                properties: ['openDirectory'],
              })
              if (!result.canceled && result.filePaths[0]) {
                mainWindow.webContents.send(IPC_CHANNELS.MENU_OPEN_FOLDER, result.filePaths[0])
              }
            } catch (err) {
              logError('menu:openFolder', err)
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Close Tab',
          accelerator: 'CmdOrCtrl+W',
          click: () => mainWindow.webContents.send(IPC_CHANNELS.MENU_CLOSE_TAB),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle File Tree',
          accelerator: 'CmdOrCtrl+B',
          click: () => mainWindow.webContents.send(IPC_CHANNELS.MENU_TOGGLE_FILE_TREE),
        },
        {
          label: 'Toggle Outline',
          accelerator: 'CmdOrCtrl+T',
          click: () => mainWindow.webContents.send(IPC_CHANNELS.MENU_TOGGLE_OUTLINE),
        },
        { type: 'separator' },
        {
          label: 'File Search',
          accelerator: 'CmdOrCtrl+P',
          click: () => mainWindow.webContents.send(IPC_CHANNELS.MENU_FILE_SEARCH),
        },
        {
          label: 'Content Search',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => mainWindow.webContents.send(IPC_CHANNELS.MENU_CONTENT_SEARCH),
        },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow.webContents.send(IPC_CHANNELS.MENU_OPEN_SETTINGS),
        },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { role: 'reload' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        {
          label: 'Next Tab',
          accelerator: 'CmdOrCtrl+Tab',
          click: () => mainWindow.webContents.send(IPC_CHANNELS.MENU_NEXT_TAB),
        },
        {
          label: 'Previous Tab',
          accelerator: 'CmdOrCtrl+Shift+Tab',
          click: () => mainWindow.webContents.send(IPC_CHANNELS.MENU_PREV_TAB),
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            try {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Markdown Viewer',
                message: `Markdown Viewer v${app.getVersion()}`,
              })
            } catch (err) {
              logError('menu:about', err)
            }
          },
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
