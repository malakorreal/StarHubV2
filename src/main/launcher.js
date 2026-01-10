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
        // 🚨 Validate File Extension (Must be .zip)
        try {
            const urlPath = new URL(instance.modpackUrl).pathname.toLowerCase()
            if (urlPath.endsWith('.rar')) {
                throw new Error('Modpack URL must be a .zip file (RAR is not supported)')
            }
        } catch (e) {
            if (e.message.includes('RAR')) throw e
            // If URL parsing fails, ignore and let download try
        }

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

    // 2.5 Handle Preload Mods (JSON Configurable)
    if (instance.preloadMods && Array.isArray(instance.preloadMods)) {
        console.log(`[PRELOAD] Checking ${instance.preloadMods.length} preload mods...`)
        
        for (const mod of instance.preloadMods) {
            if (signal?.aborted) throw new Error('Launch aborted')
            
            let modUrl = ''
            let modName = ''
            
            if (typeof mod === 'string') {
                modUrl = mod
                modName = path.basename(decodeURIComponent(modUrl))
            } else if (typeof mod === 'object' && mod.url) {
                modUrl = mod.url
                modName = mod.name || path.basename(decodeURIComponent(modUrl))
            }
            
            if (modUrl) {
                const destPath = path.join(modsFolder, modName)
                
                // Use downloadFile with size checking
                await syncManager.downloadFile(modUrl, destPath, { 
                    signal, 
                    checkSize: true,
                    onProgress: (current, total) => {
                        // Only update main progress occasionally or just log
                         syncManager.sendProgress(`Downloading ${modName}`, current, total)
                    }
                })
            }
        }
    }

    // 2.6 Cleanup Old Mods (ONLY if NOT using modpackUrl)
    // If using modpackUrl, extractZip handles cleanup during repair.
    // If using ONLY mods/preloadMods, we need to manually clean up orphans.
    if (!instance.modpackUrl) {
        try {
            const validFilenames = []
            
            // Helper to get filename from URL
            const getFileName = (url) => {
                try {
                    return decodeURIComponent(url.split('/').pop().split('?')[0])
                } catch (e) { return null }
            }

            // 1. From mods array
            if (instance.mods && Array.isArray(instance.mods)) {
                instance.mods.forEach(modUrl => {
                     const name = getFileName(modUrl)
                     if (name) validFilenames.push(name)
                })
            }
            
            // 2. From preloadMods
            if (instance.preloadMods && Array.isArray(instance.preloadMods)) {
                instance.preloadMods.forEach(mod => {
                    let name = null
                    if (typeof mod === 'string') {
                        name = getFileName(mod)
                    } else if (typeof mod === 'object' && mod.url) {
                        name = mod.name || getFileName(mod.url)
                    }
                    if (name) validFilenames.push(name)
                })
            }
            
            if (validFilenames.length > 0) {
                await syncManager.cleanupFolder(modsFolder, validFilenames)
            }
        } catch (e) {
            console.error("[CLEANUP] Error during mod cleanup:", e)
        }
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
        let forgeInstallerPath = null
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

            // ------------------------------------------------------------------
            // 🔨 AUTO-INSTALL FORGE IF MISSING
            // ------------------------------------------------------------------
            if (!detectedVersionId && !instance.customVersionId && instance.loader === 'forge') {
                try {
                    console.log(`[AUTO-INSTALL] Forge folder not found. Preparing to install Forge for ${instance.version}...`)
                    
                    let forgeVersion = instance.forgeVersion
                    if (!forgeVersion) {
                        // Fetch recommended
                        const promoUrl = `https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json`
                        const { data: promo } = await axios.get(promoUrl)
                        forgeVersion = promo.promos[`${instance.version}-recommended`] || promo.promos[`${instance.version}-latest`]
                    }
                    
                    if (forgeVersion) {
                        const forgeFullVersion = `${instance.version}-${forgeVersion}`
                        const installerUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${forgeFullVersion}/forge-${forgeFullVersion}-installer.jar`
                        
                        const cacheDir = path.join(baseDir, 'cache')
                        const installerPath = path.join(cacheDir, `forge-${forgeFullVersion}-installer.jar`)
                        
                        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true })
                        
                        // Check if installer exists
                        if (!fs.existsSync(installerPath)) {
                            console.log(`Downloading Forge Installer: ${installerUrl}`)
                            await syncManager.downloadLargeFile(installerUrl, installerPath, { signal })
                        }
                        
                        console.log(`[AUTO-INSTALL] Forge Installer ready at: ${installerPath}`)
                        forgeInstallerPath = installerPath
                    } else {
                        console.warn(`[AUTO-INSTALL] Could not determine Forge version for ${instance.version}`)
                    }
                } catch (err) {
                    console.error("[AUTO-INSTALL] Failed to prepare Forge:", err.message)
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
        const resolution = store.get('resolution', { width: 854, height: 480 })
        const fullscreen = store.get('fullscreen', false)
        
        // JVM Arguments (e.g. -Xmx, -D...)
        const rawJavaArgs = javaArgs ? javaArgs.split(' ').filter(a => a.trim().length > 0) : []
        const jvmArgs = []

        // Sanitize JVM Args: Remove Game Args that users mistakenly put in Java Args
        for (let i = 0; i < rawJavaArgs.length; i++) {
            const arg = rawJavaArgs[i]
            if (arg === '--server' || arg === '--port' || arg === '--username' || arg === '--uuid' || arg === '--accessToken') {
                // Skip this arg and the next one (the value)
                i++
                console.warn(`[LAUNCHER] Removed invalid JVM arg: ${arg}`)
                continue
            }
            // Also remove QuickPlay args if present manually
            if (arg.startsWith('--quickPlay')) {
                 if (arg.includes('Path')) {
                     // --quickPlayPath "path"
                     i++
                 }
                 continue
            }
            jvmArgs.push(arg)
        }

        // Game Arguments (e.g. --server, --username)
        const gameArgs = []

        if (autoJoin && instance.serverIp) {
            // Check MC Version for QuickPlay support (1.20+)
            const isModern = (v) => {
                if (!v) return false
                const parts = v.split('.')
                if (parts.length < 2) return false
                const minor = parseInt(parts[1])
                return minor >= 20
            }

            // TEMPORARY DISABLED: Auto-Join causing issues with arguments
            console.log("[AUTO-JOIN] Feature temporarily disabled by user request.")
            /*
            if (isModern(instance.version)) {
                // Use QuickPlay for 1.20+
                opts.quickPlay = {
                    type: 'multiplayer',
                    identifier: instance.serverIp
                }
                console.log(`[AUTO-JOIN] Using QuickPlay for ${instance.version}: ${instance.serverIp}`)
            } else {
                // Use CLI Args for older versions
                const [ip, port] = instance.serverIp.split(':')
                gameArgs.push('--server', ip)
                if (port) gameArgs.push('--port', port)
                console.log(`[AUTO-JOIN] Added server args for ${instance.version}: ${ip}:${port || 25565}`)
            }
            */
        }

        const opts = {
            forge: forgeInstallerPath,
            javaPath,
            clientPackage: null,
            authorization: auth,
            root: rootPath,
            version: versionOpts,
            memory: {
                max: ram + "M",
                min: "1024M"
            },
            window: {
                width: resolution.width,
                height: resolution.height,
                fullscreen: fullscreen
            },
            customArgs: jvmArgs,           // MCLC: customArgs = JVM Arguments
            customLaunchArgs: gameArgs,    // MCLC: customLaunchArgs = Game Arguments
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
