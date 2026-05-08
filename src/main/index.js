import { app, shell, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
import { spawn, execFileSync } from 'child_process'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.ico?asset'
import { setupAuth } from './auth'
import { setupLauncher } from './launcher'
import { setupStatus } from './status'
import { setupRPC, updateRPCLanguage, setActivity, shutdownRPC } from './rpc'
import { setupStore, getStore } from './store'
import { autoUpdater } from 'electron-updater'

// Disable Hardware Acceleration to fix slow startup/lag on some systems
// app.disableHardwareAcceleration()

let mainWindow
let tray = null

// ----------------------------------------------------------------------
// 🔒 SINGLE INSTANCE LOCK
// ----------------------------------------------------------------------
const shouldForceAdmin = process.platform === 'win32' && app.isPackaged && !process.argv.includes('--elevated') && !process.argv.includes('--no-admin')

const isElevated = () => {
  const cmds = ['powershell', 'pwsh']
  const args = ['-NoProfile', '-Command', '([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)']
  for (const c of cmds) {
    try {
      const out = execFileSync(c, args, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim().toLowerCase()
      if (out === 'true') return true
      if (out === 'false') return false
    } catch (e) {}
  }
  return false
}

const relaunchAsAdmin = () => {
  const exe = process.execPath
  const exeEsc = exe.replace(/'/g, "''")
  const args = process.argv.slice(1).filter(a => a !== '--elevated')
  args.push('--elevated')
  const argsEsc = args.map(a => `'${String(a).replace(/'/g, "''")}'`).join(',')
  const cmd = `Start-Process -FilePath '${exeEsc}' -Verb RunAs -ArgumentList @(${argsEsc})`
  try {
    spawn('powershell', ['-NoProfile', '-Command', cmd], { detached: true, stdio: 'ignore' }).unref()
  } catch (e) {
    try {
      spawn('pwsh', ['-NoProfile', '-Command', cmd], { detached: true, stdio: 'ignore' }).unref()
    } catch (e2) {}
  }
}

const showAdminPrompt = async () => {
  const channel = 'admin-prompt-choice'
  return await new Promise((resolve) => {
    const win = new BrowserWindow({
      width: 520,
      height: 320,
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      show: false,
      frame: false,
      backgroundColor: '#0b0f1a',
      title: 'StarHub',
      icon: icon,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    })

    let finished = false
    const done = (choice) => {
      if (finished) return
      finished = true
      try { win.close() } catch (e) {}
      resolve(choice)
    }

    ipcMain.once(channel, (event, choice) => {
      done(choice === 'accept' ? 'accept' : 'decline')
    })

    win.on('closed', () => {
      done('decline')
    })

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' data:;">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>StarHub</title>
  <style>
    :root{--bg:#0b0f1a;--panel:#10182a;--text:#e6eefc;--muted:#9bb0d6;--accent:#ff7a3d;--line:rgba(255,255,255,.08)}
    *{box-sizing:border-box}
    html,body{width:100%;height:100%;margin:0;background:var(--bg);font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial}
    .wrap{height:100%;display:flex;flex-direction:column}
    .top{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--line);background:rgba(255,255,255,.02)}
    .brand{display:flex;gap:10px;align-items:center}
    .logo{width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,#ff7a3d,#facc15)}
    .title{color:var(--text);font-weight:700;font-size:14px;letter-spacing:.2px}
    .x{cursor:pointer;color:var(--muted);font-size:18px;line-height:18px;padding:6px 10px;border-radius:10px}
    .x:hover{background:rgba(255,255,255,.06);color:var(--text)}
    .content{flex:1;padding:18px 18px 0}
    .card{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:18px}
    h1{margin:0 0 8px;color:var(--text);font-size:18px}
    p{margin:0;color:var(--muted);font-size:13px;line-height:1.5}
    .note{margin-top:12px;padding:10px 12px;border-radius:12px;background:rgba(255,122,61,.08);border:1px solid rgba(255,122,61,.25);color:var(--text);font-size:12.5px}
    .actions{display:flex;gap:10px;justify-content:flex-end;padding:16px 18px 18px}
    button{border:1px solid var(--line);background:rgba(255,255,255,.04);color:var(--text);padding:10px 14px;border-radius:12px;font-weight:700;cursor:pointer}
    button:hover{background:rgba(255,255,255,.07)}
    .primary{border-color:rgba(255,122,61,.45);background:linear-gradient(135deg,rgba(255,122,61,.95),rgba(250,204,21,.85));color:#0b0f1a}
    .primary:hover{filter:brightness(1.02)}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <div class="brand"><div class="logo"></div><div class="title">StarHub Launcher</div></div>
      <div class="x" id="close">×</div>
    </div>
    <div class="content">
      <div class="card">
        <h1>ต้องการสิทธิ์ผู้ดูแลระบบ (Administrator)</h1>
        <p>เพื่อให้อัปเดต/ติดตั้ง Modpack ได้สมบูรณ์ StarHub จำเป็นต้องรันด้วยสิทธิ์ผู้ดูแลระบบ</p>
        <div class="note">กด “ยอมรับ” แล้วระบบจะขึ้นหน้าต่างขอสิทธิ์ (UAC) ของ Windows</div>
      </div>
    </div>
    <div class="actions">
      <button id="decline">ไม่</button>
      <button class="primary" id="accept">ยอมรับ</button>
    </div>
  </div>
  <script>
    const { ipcRenderer } = require('electron')
    const send = (v) => ipcRenderer.send('${channel}', v)
    document.getElementById('accept').addEventListener('click', () => send('accept'))
    document.getElementById('decline').addEventListener('click', () => send('decline'))
    document.getElementById('close').addEventListener('click', () => send('decline'))
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') send('decline') })
  </script>
</body>
</html>`

    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    win.once('ready-to-show', () => win.show())
  })
}

import { getUserAchievements, getAllAchievements, checkAndGrantLaunchAchievements } from './supabase'

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

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.starhub.launcher')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  if (shouldForceAdmin && !isElevated()) {
    const choice = await showAdminPrompt()
    if (choice === 'accept') {
      relaunchAsAdmin()
    }
    app.exit(0)
    return
  }

  const gotTheLock = app.requestSingleInstanceLock()
  if (!gotTheLock) {
    app.quit()
    return
  }

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      if (!mainWindow.isVisible()) mainWindow.show()
      mainWindow.focus()
    }
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

  ipcMain.handle('get-about-audio-url', async () => {
      const candidates = [
          join(process.cwd(), 'resources', 'about.mp3'),
          join(app.getAppPath(), 'resources', 'about.mp3'),
          join(process.resourcesPath, 'about.mp3'),
          join(process.resourcesPath, 'resources', 'about.mp3')
      ]

      for (const abs of candidates) {
          try {
              await fs.access(abs)
              const buffer = await fs.readFile(abs)
              const base64 = buffer.toString('base64')
              return { success: true, url: `data:audio/mpeg;base64,${base64}` }
          } catch (e) {}
      }

      return { success: false, error: 'not_found' }
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
    // autoUpdater.quitAndInstall(true, true) // Removed to prevent forced restart loop. Let UI handle it.
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

  ipcMain.handle('get-all-achievements', async () => {
      return await getAllAchievements()
  })

  ipcMain.handle('get-user-achievements', async () => {
      const store = getStore()
      const selectedId = store.get('selectedAccountId')
      const accounts = store.get('accounts', [])
      const auth = store.get('auth')
      const uuid =
        (selectedId && accounts.find(a => a.uuid === selectedId)?.uuid) ||
        auth?.uuid ||
        null
      if (!uuid) return []
      return await getUserAchievements(uuid)
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
  const trayIcon = nativeImage.createFromPath(icon)
  tray = new Tray(trayIcon)
  const contextMenu = Menu.buildFromTemplate([
    { 
        label: '  Open StarHub', 
        icon: trayIcon.resize({ width: 16, height: 16 }),
        click: () => {
            if (mainWindow) {
                mainWindow.show()
                mainWindow.focus()
            }
        } 
    },
    { 
        label: '  Fix launcher (Repair)', 
        click: () => {
            if (mainWindow) {
                mainWindow.show()
                mainWindow.focus()
                mainWindow.webContents.send('open-repair-from-tray')
            }
        }
    },
    { type: 'separator' },
    { 
        label: '  Exit', 
        click: () => {
            app.quit()
        } 
    }
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
    if (behavior === 'tray') {
      mainWindow.hide()
    } else {
      app.quit()
    }
  })

  ipcMain.handle('restart-launcher', () => {
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.reload()
        return { success: true }
      }
      return { success: false, error: 'Main window not available' }
    } catch (e) {
      console.error('Failed to restart launcher:', e)
      return { success: false, error: e.message }
    }
  })

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  shutdownRPC()
})
