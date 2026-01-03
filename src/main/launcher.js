import { Client } from 'minecraft-launcher-core'
import { setActivity } from './rpc'
import { getStore } from './store'
import { getInstances } from './instances'
import { SyncManager } from './sync'
import { JavaManager } from './javaManager'
import { shell, app, dialog } from 'electron'
import fs from 'fs'
import path from 'path'
import axios from 'axios'
import AdmZip from 'adm-zip'

const launcher = new Client()

export function setupLauncher(ipcMain, mainWindow) {
  const store = getStore()
  const syncManager = new SyncManager(mainWindow)
  const javaManager = new JavaManager(mainWindow)

  let currentLaunchController = null

  // Helper to prepare files (Download/Extract)
  const prepareGameFiles = async (instance, forceRepair = false, signal = null) => {
    // Use AppData to avoid non-ASCII path issues
    const baseDir = app.getPath('userData')
    const rootPath = path.join(baseDir, 'instances', instance.id)
    const modsFolder = path.join(rootPath, 'mods')
    const zipPath = path.join(rootPath, 'modpack.zip')

    console.log(`[PREPARE] Checking instance at: ${rootPath} (Force: ${forceRepair})`)
    
    if (signal?.aborted) throw new Error('Launch aborted')

    if (forceRepair) {
        // Remove zip to force re-download
        if (fs.existsSync(zipPath)) {
            fs.rmSync(zipPath, { force: true })
        }
        // Note: We don't remove mods folder anymore to allow Smart Sync
    }

    // Ensure root exists
    if (!fs.existsSync(rootPath)) {
        fs.mkdirSync(rootPath, { recursive: true })
    }
    if (!fs.existsSync(modsFolder)) {
        fs.mkdirSync(modsFolder, { recursive: true })
    }

    // 1. Handle Modpack Zip
    if (instance.modpackUrl) {
        // Check if we need to download
        let needsDownload = forceRepair || !fs.existsSync(zipPath)
        
        if (needsDownload) {
             console.log(`Downloading Modpack: ${instance.modpackUrl}`)
             await syncManager.downloadLargeFile(instance.modpackUrl, zipPath, { signal })
             await syncManager.extractZip(zipPath, rootPath, { signal })
        } else {
             // Zip exists. Check if mods folder is empty?
             // Or if we just want to ensure everything is synced
             // For "prepare", we might want to re-extract to be safe if it's quick?
             // But re-extracting takes time.
             // Let's check if mods folder is empty.
             const files = fs.readdirSync(modsFolder)
             if (files.length === 0) {
                 console.log("Mods folder empty. Extracting existing zip...")
                 await syncManager.extractZip(zipPath, rootPath, { signal })
             } else {
                 // Optional: We could run extraction again for "Smart Sync" even if files exist,
                 // because extractZip now has the Smart Sync logic.
                 // Let's do it if it's not too slow. It compares files.
                 // But for large packs, it might be slow to read all files.
                 // Let's skip if not forceRepair and mods exist.
                 // However, user requirement says "When loading... is finished".
                 // If we skip everything, it finishes instantly.
             }
        }
    }

    if (signal?.aborted) throw new Error('Launch aborted')

    // 2. Handle Individual Mods
    if (instance.mods && Array.isArray(instance.mods)) {
        console.log(`Checking ${instance.mods.length} mods...`)
        await syncManager.syncMods(instance.mods, modsFolder, { signal })
    }

    // 3. Save Installed Version
    // Prioritize modpackVersion if available, otherwise use Minecraft version
    const versionToSave = instance.modpackVersion || instance.version
    if (versionToSave) {
        store.set(`installed_versions.${instance.id}`, versionToSave)
    }

    return rootPath
  }

  ipcMain.handle('cancel-launch', async () => {
      if (currentLaunchController) {
          console.log("Cancelling launch...")
          currentLaunchController.abort()
          currentLaunchController = null
          return { success: true }
      }
      return { success: false, reason: 'no_active_launch' }
  })

  ipcMain.handle('repair-instance', async (event, instance) => {
    try {
        if (currentLaunchController) {
            currentLaunchController.abort() // Cancel any previous
        }
        currentLaunchController = new AbortController()
        const signal = currentLaunchController.signal

        await prepareGameFiles(instance, true, signal)
        
        currentLaunchController = null
        return { success: true }
    } catch (e) {
        currentLaunchController = null
        console.error("Repair Error:", e)
        if (e.message === 'Launch aborted' || e.message === 'Download aborted' || e.message === 'Unzip aborted' || e.message === 'Extraction aborted') {
             return { success: false, error: 'Cancelled' }
        }
        return { success: false, error: e.message }
    }
  })

  ipcMain.handle('prepare-launch', async (event, instance) => {
    try {
        if (currentLaunchController) {
            currentLaunchController.abort()
        }
        currentLaunchController = new AbortController()
        const signal = currentLaunchController.signal

        await prepareGameFiles(instance, false, signal)
        
        currentLaunchController = null
        return { success: true }
    } catch (e) {
        currentLaunchController = null
        console.error("Prepare Error:", e)
        if (e.message === 'Launch aborted' || e.message === 'Download aborted') {
             return { success: false, error: 'Cancelled' }
        }
        return { success: false, error: e.message }
    }
  })

  ipcMain.handle('launch-game', async (event, { instance, auth }) => {
    // Create a new launcher instance per launch to avoid event listener leaks
    const launcher = new Client()
    
    try {
        if (currentLaunchController) {
            // Check if it's the SAME instance? 
            // If user clicks play twice quickly?
            // Usually UI prevents this.
            // If we are already launching, maybe we should abort the previous one or block?
            // Let's abort previous.
            currentLaunchController.abort()
        }
        currentLaunchController = new AbortController()
        const signal = currentLaunchController.signal

        // PREPARE FIRST (Ensure files are ready)
        // Note: The UI might call prepare-launch separately, but for safety launch-game should also ensure readiness
        // especially if we merge logic.
        // If we call prepareGameFiles here, it uses the signal.
        await prepareGameFiles(instance, false, signal)

        if (signal.aborted) throw new Error('Launch aborted')

        // ---------------------------------------------------------
        // ☕ JAVA CHECK & AUTO-INSTALL
        // ---------------------------------------------------------
        // Check if user has a custom Java path set
        let javaPath = store.get('javaPath', '')
        if (javaPath && fs.existsSync(javaPath)) {
             console.log("Using custom Java path:", javaPath)
        } else {
             // Auto-detect/install based on MC version
             console.log("Checking Java...")
             javaPath = await javaManager.ensureJava(instance.version, signal)
        }

        console.log("Launching instance:", instance.name)
        const ram = store.get('ram', 4096)
        
        // Use AppData to avoid non-ASCII path issues
        const baseDir = app.getPath('userData')
        const rootPath = path.join(baseDir, 'instances', instance.id)
        
        // ---------------------------------------------------------
        // 📦 Mod Downloading System (Zip & Individual)
        // ---------------------------------------------------------
        // Skipped here because 'prepare-launch' should have been called.
        // But for safety, ensure folders exist
        if (!fs.existsSync(rootPath)) fs.mkdirSync(rootPath, { recursive: true })
        
        // Basic Loader Handling
        const versionOpts = {
            number: instance.version,
            type: "release"
        }

        // If loader is specified, we assume we are launching a custom version (Forge/Fabric)
        // The version ID must match what is installed or provided in the modpack
        if (instance.loader && instance.loader !== 'vanilla') {
            versionOpts.type = "custom"
            
            // ------------------------------------------------------------------
            // 🔎 AUTO-DETECT CUSTOM VERSION FROM FOLDER
            // ------------------------------------------------------------------
            // If the JSON doesn't provide a specific ID, we try to find it in the versions folder
            let detectedVersionId = null
            
            const versionsPath = path.join(rootPath, 'versions')
            if (fs.existsSync(versionsPath)) {
                try {
                    const dirs = fs.readdirSync(versionsPath).filter(f => {
                        return fs.statSync(path.join(versionsPath, f)).isDirectory()
                    })
                    
                    // Logic: Find a directory that contains "Forge", "Fabric", "Quilt", or "NeoForge"
                    // AND matches the base game version partially if possible
                    const customDir = dirs.find(d => 
                        d.toLowerCase().includes(instance.loader.toLowerCase()) || 
                        d.toLowerCase().includes('forge') || 
                        d.toLowerCase().includes('fabric')
                    )
                    
                    if (customDir) {
                        console.log(`[AUTO-DETECT] Found custom version folder: ${customDir}`)
                        detectedVersionId = customDir
                    }
                } catch (e) {
                    console.error("Error scanning versions folder:", e)
                }
            }

            // ------------------------------------------------------------------
            // ⬇️ AUTO-INSTALL FABRIC IF MISSING
            // ------------------------------------------------------------------
            if (!detectedVersionId && !instance.customVersionId && instance.loader === 'fabric') {
                try {
                    console.log(`[AUTO-INSTALL] Fabric folder not found. Attempting to install Fabric for ${instance.version}...`)
                    
                    // 1. Fetch available loaders
                    const metaUrl = `https://meta.fabricmc.net/v2/versions/loader/${instance.version}`
                    const { data: loaders } = await axios.get(metaUrl)
                    
                    if (loaders && loaders.length > 0) {
                        // Pick first stable loader
                        const loader = loaders.find(l => l.loader.stable) || loaders[0]
                        const loaderVer = loader.loader.version
                        const fabricVersionId = `fabric-loader-${loaderVer}-${instance.version}`
                        
                        console.log(`[AUTO-INSTALL] Selected Fabric Loader: ${loaderVer}`)
                        
                        // 2. Fetch Profile JSON
                        const profileUrl = `https://meta.fabricmc.net/v2/versions/loader/${instance.version}/${loaderVer}/profile/json`
                        const { data: profileJson } = await axios.get(profileUrl)
                        
                        // 3. Save to versions folder
                        const fabricDir = path.join(versionsPath, fabricVersionId)
                        if (!fs.existsSync(fabricDir)) fs.mkdirSync(fabricDir, { recursive: true })
                        
                        const jsonPath = path.join(fabricDir, `${fabricVersionId}.json`)
                        fs.writeFileSync(jsonPath, JSON.stringify(profileJson, null, 2))
                        
                        console.log(`[AUTO-INSTALL] Installed Fabric JSON to: ${jsonPath}`)
                        detectedVersionId = fabricVersionId
                    }
                } catch (err) {
                    console.error("[AUTO-INSTALL] Failed to install Fabric:", err.message)
                }
            }

            if (instance.customVersionId) {
                versionOpts.custom = instance.customVersionId
            } else if (detectedVersionId) {
                 // Use detected version
                 versionOpts.custom = detectedVersionId
            } else {
                // Fallback: assume instance.version IS the ID (risky if it's just "1.20.1")
                versionOpts.custom = instance.version
            }
        }

        // ---------------------------------------------------------
        // ⚙️ Launch Options (Java Args & Auto-Join)
        // ---------------------------------------------------------
        const javaArgs = store.get('javaArgs', '')
        const autoJoin = store.get('autoJoin', false)
        
        const customLaunchArgs = javaArgs ? javaArgs.split(' ').filter(a => a.trim().length > 0) : []
        const customArgs = []

        if (autoJoin && instance.serverIp) {
            const [ip, port] = instance.serverIp.split(':')
            customArgs.push('--server', ip)
            if (port) customArgs.push('--port', port)
            console.log(`[AUTO-JOIN] Added server args: ${ip}:${port || 25565}`)
        }

        const opts = {
            javaPath,
            clientPackage: null,
            authorization: auth,
            root: rootPath,
            version: versionOpts,
            memory: {
                max: ram + "M",
                min: "1024M"
            },
            customLaunchArgs, // JVM Arguments
            customArgs,       // Game Arguments
            overrides: {
                detached: false // Keep attached to see logs/close event
            }
        }

        // Setup Event Listeners BEFORE launching
        launcher.on('debug', (e) => {
            // console.log(`[DEBUG] ${e}`) // Too verbose for main console usually, but good for game log
            mainWindow.webContents.send('game-log', `[DEBUG] ${e}`)
        })
        launcher.on('data', (e) => {
            console.log(`[DATA] ${e}`)
            mainWindow.webContents.send('game-log', `${e}`)
        })
        
        launcher.on('progress', (e) => {
             mainWindow.webContents.send('launch-progress', e)
        })

        launcher.on('arguments', (e) => {
            console.log("Game Launched")
            mainWindow.webContents.send('launch-success')
            mainWindow.hide() // Hide to Tray
            setActivity(`Playing ${instance.name}`, 'In Game', Date.now())
        })

        launcher.on('close', (code) => {
             console.log("Game Closed with code", code)
             setActivity('Browsing StarHub', 'In Launcher')
             mainWindow.webContents.send('game-closed', code)
             mainWindow.show()
        })
        
        // Await launch to catch initialization errors
        await launcher.launch(opts)
        
        return { success: true }

    } catch (error) {
        console.error("Launch Error:", error)
        return { success: false, error: error.message }
    }
  })

  ipcMain.handle('open-instance-folder', async (event, instance) => {
      if (!instance) return { success: false, reason: 'no_instance' }
      const baseDir = app.getPath('userData')
      const folder = path.join(baseDir, 'instances', instance.id)
      
      if (!fs.existsSync(folder)) {
          return { success: false, reason: 'not_found' }
      }
      shell.openPath(folder)
      return { success: true }
  })
}
