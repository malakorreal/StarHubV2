import { app, shell, BrowserWindow, ipcMain, Tray, Menu } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.ico?asset'
import { setupAuth } from './auth'
import { setupLauncher } from './launcher'
import { setupStatus } from './status'
import { setupRPC, updateRPCLanguage, setActivity } from './rpc'
import { setupStore, getStore } from './store'
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
    title: 'StarHub',
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
  
  // RPC Status Handler
  ipcMain.handle('update-rpc', (event, { status, instanceName }) => {
      setActivity(status, instanceName)
      return { success: true }
  })

  // Language Handler
  ipcMain.handle('update-language', (event, lang) => {
      updateRPCLanguage(lang)
      return { success: true }
  })
  
  // Bypass CORS for Image Fetching
  ipcMain.handle('fetch-image-base64', async (event, url) => {
      try {
          // Check if it's a local file
          if (!url.startsWith('http')) {
              // It's likely a file path. Remove 'file://' if present
              const filePath = url.replace('file:///', '').replace('file://', '')
              try {
                  const buffer = await fs.readFile(filePath)
                  const base64 = buffer.toString('base64')
                  // Guess mime type based on extension
                  const ext = filePath.split('.').pop().toLowerCase()
                  const mimeType = ext === 'gif' ? 'image/gif' : (ext === 'png' ? 'image/png' : 'image/jpeg')
                  return `data:${mimeType};base64,${base64}`
              } catch (err) {
                   console.error('Error reading local file:', err)
                   return null
              }
          }

          // It's a remote URL
          const response = await fetch(url, {
              headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 StarHub/1.0'
              }
          })
          if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`)
          const arrayBuffer = await response.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          const base64 = buffer.toString('base64')
          const mimeType = response.headers.get('content-type') || 'image/png'
          return `data:${mimeType};base64,${base64}`
      } catch (error) {
          console.error('Error fetching image:', error)
          return null
      }
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
      const store = getStore()
      if (store.get('autoCheckUpdates', true)) {
          autoUpdater.checkForUpdates()
      }
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
    autoUpdater.quitAndInstall(true, true)
  })

  // Install Update Handler
  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall(true, true)
  })

  // Check for Updates Handler
  ipcMain.handle('check-for-updates', () => {
      if (!is.dev) {
          autoUpdater.checkForUpdates()
          return { success: true }
      }
      return { success: false, error: 'Dev mode' }
  })

  // Backup Instance Data Handler
  ipcMain.handle('backup-instance-data', async (event, instance) => {
    if (!instance || (!instance.path && !instance.id)) return { success: false, error: 'Invalid instance' }
    
    try {
      const AdmZip = require('adm-zip')
      const path = require('path')
      const fs = require('fs')
      
      // Target folders to backup
      const targetFolders = ['emotes', 'fragment', 'skin', 'figura', 'screenshots', 'shaderpacks', 'options.txt']
      
      let instancePath = instance.path
      if (!instancePath) {
          const baseDir = app.getPath('userData')
          instancePath = path.join(baseDir, 'instances', instance.id)
      }
      
      const backupsDir = path.join(instancePath, 'backups')
      
      // Ensure backups directory exists
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true })
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const zipName = `backup-${timestamp}.zip`
      const zipPath = path.join(backupsDir, zipName)
      
      const zip = new AdmZip()
      let hasData = false
      
      // Add folders/files if they exist
      for (const item of targetFolders) {
        const itemPath = path.join(instancePath, item)
        if (fs.existsSync(itemPath)) {
            const stats = fs.statSync(itemPath)
            if (stats.isDirectory()) {
                zip.addLocalFolder(itemPath, item)
                hasData = true
            } else if (stats.isFile()) {
                zip.addLocalFile(itemPath)
                hasData = true
            }
        }
      }
      
      if (!hasData) {
          return { success: false, error: 'No data found to backup (Emotes, Fragment, Skin, Figura, etc.)' }
      }
      
      zip.writeZip(zipPath)
      
      // Open the backups folder so user knows where it is
      shell.openPath(backupsDir)
      
      return { success: true, path: zipPath }
      
    } catch (err) {
      console.error('Backup failed:', err)
      return { success: false, error: err.message }
    }
  })
  
  ipcMain.handle('open-crash-reports', async (event, instance) => {
    try {
      if (!instance || (!instance.path && !instance.id)) return { success: false, error: 'Invalid instance' }
      let instancePath = instance.path
      if (!instancePath) {
        const baseDir = app.getPath('userData')
        instancePath = join(baseDir, 'instances', instance.id)
      }
      const crashDir = join(instancePath, 'crash-reports')
      try {
        await fs.access(crashDir)
      } catch {
        await fs.mkdir(crashDir, { recursive: true })
      }
      const err = await shell.openPath(crashDir)
      if (err) {
        return { success: false, error: err }
      }
      return { success: true, path: crashDir, created: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
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
