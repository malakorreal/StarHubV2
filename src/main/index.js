import { app, shell, BrowserWindow, ipcMain, dialog, Tray, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.ico?asset'
import { setupAuth } from './auth'
import { setupLauncher } from './launcher'
import { setupStatus } from './status'
import { setupRPC, updateRPCLanguage } from './rpc'
import { setupStore } from './store'
import { autoUpdater } from 'electron-updater'

// Disable Hardware Acceleration to fix slow startup/lag on some systems
// app.disableHardwareAcceleration()

let mainWindow
let tray = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    frame: false, // Custom frame for HoYoplay style
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    icon: icon, // Explicitly set icon for Windows
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })
  
  // Visibility Events for Animation Control
  mainWindow.on('show', () => {
      mainWindow.webContents.send('window-visibility', true)
  })
  
  mainWindow.on('hide', () => {
      mainWindow.webContents.send('window-visibility', false)
  })
  
  mainWindow.on('minimize', () => {
      mainWindow.webContents.send('window-visibility', false)
  })
  
  mainWindow.on('restore', () => {
      mainWindow.webContents.send('window-visibility', true)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.starhub.launcher')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()
  
  // Setup Modules
  setupStore(ipcMain)
  setupAuth(ipcMain, mainWindow)
  setupLauncher(ipcMain, mainWindow)
  setupStatus(ipcMain)
  setupRPC(mainWindow)
  
  // Language Handler
  ipcMain.handle('update-language', (event, lang) => {
      updateRPCLanguage(lang)
      return { success: true }
  })
  
  // Instance Handler needs mainWindow to support cache-first strategy
  // Ensure we don't have duplicates (though launcher.js handler is removed now)
  ipcMain.removeHandler('get-instances') 
  ipcMain.handle('get-instances', async (event, force = false) => {
      const { getInstances } = await import('./instances')
      return await getInstances(mainWindow, force)
  })

  // Auto Update (Check immediately on startup)
  // Ensure we don't try to auto-update in dev mode
  if (!is.dev) {
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'malakorreal',
      repo: 'StarHubV2'
    })

    // Add a small delay to ensure window is ready to receive 'checking' event if fast
    setTimeout(() => {
      autoUpdater.checkForUpdates()
    }, 2000)
  }

  // Auto Update Events
  autoUpdater.on('checking-for-update', () => {
    mainWindow.webContents.send('updater-event', { type: 'checking' })
  })

  autoUpdater.on('update-available', () => {
    mainWindow.webContents.send('updater-event', { type: 'available' })
  })

  autoUpdater.on('update-not-available', () => {
    mainWindow.webContents.send('updater-event', { type: 'not-available' })
  })

  autoUpdater.on('error', (err) => {
    mainWindow.webContents.send('updater-event', { type: 'error', error: err.message })
  })

  autoUpdater.on('download-progress', (progressObj) => {
    mainWindow.webContents.send('updater-event', { 
        type: 'downloading', 
        progress: progressObj.percent 
    })
  })

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('updater-event', { type: 'downloaded' })
  })

  // Install Update Handler
  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall()
  })

  // Tray
  tray = new Tray(icon)
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open StarHub', click: () => mainWindow.show() },
    { label: 'Quit', click: () => app.quit() }
  ])
  tray.setToolTip('StarHub Launcher')
  tray.setContextMenu(contextMenu)
  
  tray.on('click', () => {
    mainWindow.show()
  })

  ipcMain.on('window-minimize', () => mainWindow.minimize())
  ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })
  
  ipcMain.handle('window-close', async (event, behavior) => {
    // behavior: 'tray' or 'quit'
    if (behavior === 'tray') {
      mainWindow.hide()
    } else {
      app.quit()
    }
  })

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
        loadMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
