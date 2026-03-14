import { Client } from 'minecraft-launcher-core'
import { setActivity } from './rpc'
import { getStore } from './store'
import { getInstances } from './instances'
import { SyncManager } from './sync'
import { JavaManager } from './javaManager'
import { shell, app } from 'electron'
import fs from 'fs'
import path from 'path'
import axios from 'axios'
import AdmZip from 'adm-zip'
import os from 'os'
import { execSync, spawn } from 'child_process'

const launcher = new Client()

export function setupLauncher(ipcMain, mainWindow) {
  const store = getStore()
  const syncManager = new SyncManager(mainWindow)
  const javaManager = new JavaManager(mainWindow, syncManager)

  let currentLaunchController = null
  let currentLaunchPromise = null
  let activeLauncherProcess = null
  const getFreeSpaceGB = (targetPath) => {
    try {
      if (process.platform === 'win32') {
        const root = path.parse(targetPath).root // e.g., C:\\
        const drive = root ? root.replace(':\\', '') : 'C'
        const cmd = `powershell -NoProfile -NonInteractive -Command "(Get-PSDrive -Name '${drive}').Free/1GB"`
        const out = execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
        const val = parseFloat(out)
        return isNaN(val) ? 0 : val
      } else {
        // Linux/Mac: use df -BG (Free space in GB)
        const cmd = `df -BG "${targetPath}" | tail -1 | awk '{print $4}' | sed 's/G//'`
        const out = execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
        const val = parseFloat(out)
        return isNaN(val) ? 0 : val
      }
    } catch {
      return 0
    }
  }

  // Helper to prepare files (Download/Extract)
  const prepareGameFiles = async (instance, forceRepair = false, signal = null) => {
    // ---------------------------------------------------------
    // 🌐 URL NORMALIZATION (Dropbox & etc)
    // ---------------------------------------------------------
    const normalizeUrl = (url) => {
        if (!url) return url
        let finalUrl = url.trim()
        
        // Handle Dropbox specific logic
        if (finalUrl.includes('dropbox.com')) {
            if (finalUrl.includes('?dl=0')) {
                finalUrl = finalUrl.replace('?dl=0', '?dl=1')
            } else if (!finalUrl.includes('?dl=1')) {
                finalUrl = finalUrl.includes('?') ? `${finalUrl}&dl=1` : `${finalUrl}?dl=1`
            }
        }
        
        // 🚨 IMPORTANT: Encode URL to handle spaces/Thai characters in filename
        // We only encode if it's not already encoded (simple check for %)
        // But better is to use encodeURI on the full path after stripping protocol
        try {
            const parts = finalUrl.split('://')
            if (parts.length === 2) {
                const protocol = parts[0]
                const rest = parts[1]
                // encodeURI is safe for already encoded chars like %20
                finalUrl = `${protocol}://${encodeURI(decodeURI(rest))}`
            }
        } catch (e) {
            console.warn(`[URL] Failed to encode URL: ${finalUrl}`, e)
        }
        
        return finalUrl
    }

    if (instance.modpackUrl) {
        const oldUrl = instance.modpackUrl
        instance.modpackUrl = normalizeUrl(instance.modpackUrl)
        if (oldUrl !== instance.modpackUrl) console.log(`[ZIP] Normalized URL: ${instance.modpackUrl}`)
    }
    if (instance.modpackMirrorUrl) {
        instance.modpackMirrorUrl = normalizeUrl(instance.modpackMirrorUrl)
    }

    // Use AppData to avoid non-ASCII path issues
    const baseDir = app.getPath('userData')
    const rootPath = path.join(baseDir, 'instances', instance.id)
    const modsFolder = path.join(rootPath, 'mods')

    // 🚨 DYNAMIC FILENAME: Use filename from URL if possible, otherwise fallback to modpack.zip
    let modpackFileName = 'modpack.zip'
    if (instance.modpackUrl) {
        try {
            // Get path from URL (e.g. /scl/fi/xxx/MyModpack.zip)
            const urlPath = new URL(instance.modpackUrl).pathname
            const extracted = path.basename(decodeURIComponent(urlPath))
            if (extracted && extracted.toLowerCase().endsWith('.zip')) {
                modpackFileName = extracted
            }
        } catch (e) {
            console.warn("[ZIP] Failed to extract filename from URL, using default.")
        }
    }
    const zipPath = path.join(rootPath, modpackFileName)
    console.log(`[ZIP] Resolved modpack file: ${modpackFileName}`)

    // ---------------------------------------------------------
    // 🔄 CHECK FOR VERSION UPDATE
    // ---------------------------------------------------------
    const installedVersions = store.get('installed_versions', {})
    const installedVersion = installedVersions[instance.id]
    const currentVersion = instance.modpackVersion || instance.version
    
    // If versions mismatch, force an update (re-download/re-extract)
    if (installedVersion && installedVersion !== currentVersion) {
         console.log(`[UPDATE] Version mismatch detected for ${instance.id}! Installed: ${installedVersion}, New: ${currentVersion}`)
         forceRepair = true
    }

    console.log(`[PREPARE] Checking instance at: ${rootPath} (Force: ${forceRepair})`)
    
    if (signal?.aborted) throw new Error('Launch aborted')

    if (forceRepair) {
        // 🚨 CLEANUP: Remove any .zip files in root to avoid disk space issues
        if (fs.existsSync(rootPath)) {
            try {
                const existingFiles = fs.readdirSync(rootPath)
                for (const file of existingFiles) {
                    if (file.toLowerCase().endsWith('.zip')) {
                        const fullPath = path.join(rootPath, file)
                        try {
                            fs.chmodSync(fullPath, 0o666)
                            fs.rmSync(fullPath, { force: true })
                            console.log(`[CLEANUP] Deleted old zip: ${file}`)
                        } catch (e) {
                            console.warn(`[CLEANUP] Failed to delete ${file}: ${e.message}`)
                        }
                    }
                }
            } catch (e) {}
        }
        
        // 🚨 FORCE CLEAN MODS FOLDER ON UPDATE/REPAIR
        // As requested: Delete mods folder but PRESERVE ignored files.
        if (fs.existsSync(modsFolder)) {
             console.log("[UPDATE] Cleaning mods folder (Preserving ignored files)...")
             try {
                const files = fs.readdirSync(modsFolder)
                const ignoreList = instance.ignoreFiles || []
                const systemWhitelist = ['figura', 'fragmentskin', 'cache', 'shaderpacks', 'screenshots', ...ignoreList]
                
                for (const file of files) {
                    // Check if file matches any whitelist pattern
                    const isIgnored = systemWhitelist.some(w => file.toLowerCase().includes(w.toLowerCase()))
                    
                    if (!isIgnored) {
                        try {
                            const fullPath = path.join(modsFolder, file)
                            fs.rmSync(fullPath, { recursive: true, force: true })
                        } catch (e) {
                             console.error(`Failed to delete ${file}:`, e)
                        }
                    } else {
                        console.log(`[UPDATE] Preserved ignored file: ${file}`)
                    }
                }
             } catch (e) {
                console.error("Failed to clean mods folder:", e)
             }
        }
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
        console.log(`[ZIP] Processing modpack for instance ${instance.id}: ${instance.modpackUrl}`)
        console.log(`[ZIP] Zip path: ${zipPath}`)
        
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
        console.log(`[ZIP] needsDownload: ${needsDownload} (forceRepair: ${forceRepair}, zipExists: ${fs.existsSync(zipPath)})`)
        
        if (needsDownload) {
             console.log(`[ZIP] Downloading Modpack: ${instance.modpackUrl}`)
             
             // 🚨 Ensure we start with a clean file for new download
             // We don't delete here anymore because downloadLargeFile with 'w' mode will handle it via safeOpen
             // which has better EPERM/Retry logic.

             try {
                await syncManager.downloadLargeFile(instance.modpackUrl, zipPath, { signal })
             } catch (e) {
                // If failed or aborted, delete partial zip so it doesn't block next attempt
                if (fs.existsSync(zipPath)) {
                    try { 
                        // Retry logic for EPERM deletion
                        for (let i = 0; i < 5; i++) {
                            try {
                                fs.rmSync(zipPath, { force: true })
                                break
                            } catch(err) {
                                if (i === 4) break
                                await new Promise(r => setTimeout(r, 500))
                            }
                        }
                    } catch(err) {}
                }

                if (instance.modpackMirrorUrl && !signal?.aborted) {
                    console.warn(`[ZIP] Primary modpack download failed: ${e.message}. Trying mirror...`)
                    await syncManager.downloadLargeFile(instance.modpackMirrorUrl, zipPath, { signal })
                } else {
                    console.error(`[ZIP] Download failed: ${e.message}`)
                    throw e // Re-throw if no mirror is available or if aborted
                }
             }
             console.log(`[ZIP] Extraction starting: ${zipPath} -> ${rootPath}`)
             await syncManager.extractZip(zipPath, rootPath, { signal, ignoreFiles: instance.ignoreFiles })
        } else {
             // Zip exists. Verify it's not corrupt before skipping download
             let isCorrupt = false
             try {
                 // 🚨 Retry logic for integrity check (Common EPERM)
                 let zip = null
                 for (let i = 0; i < 5; i++) {
                     try {
                         zip = new AdmZip(zipPath)
                         zip.getEntries()
                         break
                     } catch(e) {
                         if (i === 4) throw e
                         await new Promise(r => setTimeout(r, 500))
                     }
                 }
                 console.log(`[ZIP] Existing zip verified: ${zipPath}`)
             } catch (e) {
                 console.warn("[ZIP] Existing modpack.zip is corrupt, redownloading...")
                 isCorrupt = true
                 try { 
                    // Retry logic for EPERM
                    for (let i = 0; i < 5; i++) {
                        try {
                            fs.rmSync(zipPath, { force: true })
                            break
                        } catch(err) {
                            if (i === 4) break
                            await new Promise(r => setTimeout(r, 500))
                        }
                    }
                 } catch(err) {}
                 await syncManager.downloadLargeFile(instance.modpackUrl, zipPath, { signal })
                 // Need to extract after redownloading!
                 await syncManager.extractZip(zipPath, rootPath, { signal, ignoreFiles: instance.ignoreFiles })
             }

             // If not corrupt, check if we need to extract anyway (e.g. mods folder empty)
             if (!isCorrupt) {
                 const files = fs.readdirSync(modsFolder)
                 if (files.length === 0) {
                     console.log("[ZIP] Mods folder empty. Extracting existing zip...")
                     await syncManager.extractZip(zipPath, rootPath, { signal, ignoreFiles: instance.ignoreFiles })
                 }
             }
        }
    } else {
        console.log(`[ZIP] No modpackUrl for instance ${instance.id}`)
    }

    if (signal?.aborted) throw new Error('Launch aborted')

    // ---------------------------------------------------------
    // 🔍 PATCH COMPARISON & CLEANUP PREPARATION
    // ---------------------------------------------------------
    // We calculate valid filenames BEFORE syncing mods to compare "Old vs New".
    const validModRelPaths = new Set()
    
    try {
        // Helper to get filename from URL
        const getFileName = (url) => {
            try {
                return decodeURIComponent(url.split('/').pop().split('?')[0])
            } catch (e) { return null }
        }

        const patchStatePath = path.join(rootPath, 'patch_state.json')
        let previousManagedMods = []
        try {
            const raw = await fs.promises.readFile(patchStatePath, 'utf-8')
            const parsed = JSON.parse(raw)
            if (parsed && Array.isArray(parsed.managedMods)) previousManagedMods = parsed.managedMods
        } catch (e) {}

        // 1. From mods array
        if (instance.mods && Array.isArray(instance.mods)) {
            instance.mods.forEach(modUrl => {
                 const name = getFileName(modUrl)
                 if (name) validModRelPaths.add(name)
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
                if (name) validModRelPaths.add(name)
            })
        }
        
        // 3. From Modpack Zip (if exists)
        if (instance.modpackUrl) {
             if (fs.existsSync(zipPath)) {
                try {
                    const zip = new AdmZip(zipPath)
                    const entries = zip.getEntries()
                    const normalizeEntry = (p) => (p || '').replace(/\\/g, '/').replace(/^\/+/, '')
                    const fileEntries = entries.filter(e => !e.isDirectory).map(e => normalizeEntry(e.entryName)).filter(Boolean)
                    const visible = fileEntries.filter(p => !p.startsWith('__MACOSX/') && !p.split('/')[0].startsWith('.'))
                    const topLevels = new Set(visible.map(p => p.split('/')[0]).filter(Boolean))
                    const standardFolders = new Set(['mods', 'config', 'versions', 'saves', 'resourcepacks', 'shaderpacks', 'screenshots', 'logs'])
                    let stripPrefix = ''
                    if (topLevels.size === 1) {
                        const only = Array.from(topLevels)[0]
                        if (only && !standardFolders.has(only.toLowerCase())) stripPrefix = `${only}/`
                    }
                    for (const entryPathRaw of visible) {
                        const entryPath = stripPrefix && entryPathRaw.startsWith(stripPrefix) ? entryPathRaw.slice(stripPrefix.length) : entryPathRaw
                        const lower = entryPath.toLowerCase()
                        if (lower.startsWith('mods/')) {
                            const rel = entryPath.slice('mods/'.length)
                            if (rel) validModRelPaths.add(rel)
                        }
                    }
                } catch (e) {
                    console.warn("[CLEANUP] Failed to read modpack zip, skipping cleanup to be safe:", e)
                    // If zip fails, we might still want to proceed with what we have? 
                    // But if we cleanup, we might delete zip contents.
                    // Safe approach: Don't run cleanup if zip is critical but unreadable.
                    // Throwing here will stop the whole launch though? 
                    // Let's assume if zip is corrupt, we probably re-downloaded it above (Step 1).
                    // If it's still corrupt, maybe we should stop.
                }
             }
        }
        
        if (forceRepair && previousManagedMods.length > 0) {
            const removedManaged = previousManagedMods.filter(p => !validModRelPaths.has(p))
            for (const rel of removedManaged) {
                try {
                    await fs.promises.rm(path.join(modsFolder, rel), { recursive: true, force: true })
                } catch (e) {}
            }
        }

        // 🚨 PATCH COMPARISON (Requested Feature)
        // Compare old vs new files to detect additions, deletions, and corruption.
        // We do this BEFORE syncMods to accurately show what WILL happen.
        try {
             const desired = Array.from(validModRelPaths)
             const { added, deleted, corrupt } = await syncManager.comparePatches(modsFolder, desired, instance.ignoreFiles || [])
             
             // Notify UI about patch summary
             if (mainWindow && !mainWindow.isDestroyed()) {
                 mainWindow.webContents.send('patch-summary', { 
                     added: added.length, 
                     deleted: deleted.length,
                     corrupt: corrupt.length
                 })
             }

             if (added.length > 0 || deleted.length > 0 || corrupt.length > 0) {
                 console.log(`[PATCH COMPARE] Changes detected for instance ${instance.id}:`)
                 if (added.length > 0) {
                     console.log(`   [+] New Files to Download (${added.length}):`)
                     added.forEach(f => console.log(`       - ${f}`))
                 }
                 if (deleted.length > 0) {
                     console.log(`   [-] Old Files to Remove (${deleted.length}):`)
                     deleted.forEach(f => console.log(`       - ${f}`))
                 }
                 if (corrupt.length > 0) {
                     console.log(`   [!] Corrupt/Invalid Files Found (${corrupt.length}):`)
                     corrupt.forEach(f => console.log(`       - ${f}`))
                     
                     // AUTO-FIX: Delete corrupt files immediately so syncMods redownloads them
                     console.log(`[AUTO-FIX] Removing ${corrupt.length} corrupt files...`)
                     for (const file of corrupt) {
                         try {
                             await fs.promises.rm(path.join(modsFolder, file), { recursive: true, force: true })
                         } catch(e) { console.error(`Failed to delete corrupt file ${file}`, e)}
                     }
                 }
             } else {
                 console.log(`[PATCH COMPARE] No file changes detected. System healthy.`)
             }

             // Stable Cleanup: Only run cleanup if patch comparison was successful
             console.log("[CLEANUP] Running stable cleanup...")
             await syncManager.cleanupFolder(modsFolder, desired, instance.ignoreFiles || [])

        } catch (err) {
            console.error("[PATCH COMPARE] Error analyzing changes:", err)
        }

    } catch (e) {
        console.warn("Failed to prepare cleanup list:", e)
    }

    // 2. Handle Individual Mods
    if (instance.mods && Array.isArray(instance.mods)) {
        console.log(`Checking ${instance.mods.length} mods...`)
        await syncManager.syncMods(instance.mods, modsFolder, { signal })
    }

    // 2.1 Auto-Fix: Scan for corrupt libraries (Common Issue)
    // Optimization: Only check 0-byte files on normal launch. Check headers only on repair.
    const librariesPath = path.join(rootPath, 'libraries')
    if (fs.existsSync(librariesPath)) {
        try {
            console.log("[AUTO-FIX] Scanning for corrupt libraries...")
            const scanAndClean = async (dir) => {
                const files = await fs.promises.readdir(dir)
                for (const file of files) {
                    const fullPath = path.join(dir, file)
                    const stat = await fs.promises.stat(fullPath)
                    if (stat.isDirectory()) {
                        await scanAndClean(fullPath)
                    } else if (file.endsWith('.jar')) {
                        // Check 1: Zero Byte (Fast)
                        if (stat.size === 0) {
                            console.log(`[AUTO-FIX] Deleting 0-byte file: ${file}`)
                            await fs.promises.unlink(fullPath)
                            continue
                        }
                        
                        // Check 2: Invalid Zip Header (Thorough Check)
                        // User requested thorough verification to avoid missing file issues.
                        // We check every jar file header to ensure it's a valid zip.
                        try {
                            const handle = await fs.promises.open(fullPath, 'r')
                            const buffer = Buffer.alloc(4)
                            await handle.read(buffer, 0, 4, 0)
                            await handle.close()
                            // PK.. (0x50 0x4B 0x03 0x04)
                            if (buffer[0] !== 0x50 || buffer[1] !== 0x4B) {
                                console.log(`[AUTO-FIX] Deleting invalid header file: ${file}`)
                                await fs.promises.unlink(fullPath)
                            }
                        } catch (e) {
                            console.log(`[AUTO-FIX] Error checking file ${file}: ${e.message}`)
                        }
                    }
                }
            }
            await scanAndClean(librariesPath)
        } catch (e) {
            console.error("[AUTO-FIX] Library scan failed:", e)
        }
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

    try {
        const patchStatePath = path.join(rootPath, 'patch_state.json')
        const currentVersionForState = instance.modpackVersion || instance.version || null
        const managedMods = Array.from(validModRelPaths)
        await fs.promises.writeFile(patchStatePath, JSON.stringify({ version: currentVersionForState, managedMods, updatedAt: Date.now() }, null, 2), 'utf-8')
    } catch (e) {}

        // Cleanup logic is being moved to the patch comparison block for stability.

    // 3. Save Installed Version
    // Prioritize modpackVersion if available, otherwise use Minecraft version
    const versionToSave = instance.modpackVersion || instance.version
    if (versionToSave) {
        const installed = store.get('installed_versions', {})
        installed[instance.id] = versionToSave
        store.set('installed_versions', installed)
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
            if (currentLaunchPromise) {
                try { await currentLaunchPromise } catch(e) {} // Wait for previous to stop
            }
        }
        currentLaunchController = new AbortController()
        const signal = currentLaunchController.signal

        currentLaunchPromise = prepareGameFiles(instance, true, signal)
        await currentLaunchPromise
        
        currentLaunchController = null
        currentLaunchPromise = null
        return { success: true }
    } catch (e) {
        currentLaunchController = null
        currentLaunchPromise = null
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
            if (currentLaunchPromise) {
                try { await currentLaunchPromise } catch(e) {}
            }
        }
        currentLaunchController = new AbortController()
        const signal = currentLaunchController.signal

        currentLaunchPromise = prepareGameFiles(instance, false, signal)
        await currentLaunchPromise
        
        currentLaunchController = null
        currentLaunchPromise = null
        return { success: true }
    } catch (e) {
        currentLaunchController = null
        currentLaunchPromise = null
        console.error("Prepare Error:", e)
        if (e.message === 'Launch aborted' || e.message === 'Download aborted') {
             return { success: false, error: 'Cancelled' }
        }
        return { success: false, error: e.message }
    }
  })

  ipcMain.handle('launch-game', async (event, { instance, auth }) => {
    // Prevent multiple instances
    if (activeLauncherProcess) {
        return { success: false, error: 'Game is already running!' }
    }

    // Create a new launcher instance per launch to avoid event listener leaks
    const launcher = new Client()
    
    try {
        if (currentLaunchController) {
            currentLaunchController.abort()
            if (currentLaunchPromise) {
                try { await currentLaunchPromise } catch(e) {}
            }
        }
        currentLaunchController = new AbortController()
        const signal = currentLaunchController.signal

        // PREPARE FIRST (Ensure files are ready)
        currentLaunchPromise = prepareGameFiles(instance, false, signal)
        await currentLaunchPromise

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
        const totalMemMB = Math.floor(os.totalmem() / 1024 / 1024)
        const totalMemGB = totalMemMB / 1024
        let hardMax
        if (totalMemGB <= 4) {
            hardMax = 2048
        } else if (totalMemGB <= 6) {
            hardMax = 3072
        } else if (totalMemGB <= 8) {
            hardMax = 4096
        } else if (totalMemGB <= 12) {
            hardMax = 6144
        } else {
            hardMax = 8192
        }
        const dynamicCap = Math.floor(totalMemMB * 0.6)
        const safeCap = Math.min(dynamicCap, hardMax)
        const ramToUse = Math.min(ram, safeCap)
        if (ramToUse < ram) {
            syncManager.sendProgress('Adjusting Memory...', 1, 1, `Using ${ramToUse} MB (cap ${safeCap} MB)`)
        }
        
        // Use AppData to avoid non-ASCII path issues
        const baseDir = app.getPath('userData')
        const rootPath = path.join(baseDir, 'instances', instance.id)
        
        // ---------------------------------------------------------
        // 📦 Mod Downloading System (Zip & Individual)
        // ---------------------------------------------------------
        // Skipped here because 'prepare-launch' should have been called.
        // But for safety, ensure folders exist
        if (!fs.existsSync(rootPath)) fs.mkdirSync(rootPath, { recursive: true })
        const freeGB = getFreeSpaceGB(rootPath)
        if (freeGB > 0 && freeGB < 2) {
            throw new Error(`Insufficient disk space (${freeGB.toFixed(2)} GB free). Require at least 2 GB.`)
        }
        
        // Basic Loader Handling
        instance.loader = (instance.loader || 'vanilla').toLowerCase()
        let forgeInstallerPath = null
        const versionOpts = {
            number: instance.version,
            type: "release"
        }

        // If loader is specified, we assume we are launching a custom version (Forge/Fabric)
        // The version ID must match what is installed or provided in the modpack
        if (instance.loader && instance.loader !== 'vanilla') {
            // We'll set type/custom below only if we actually have a detected/explicit custom version.
            
            // ------------------------------------------------------------------
            // 🔎 AUTO-DETECT CUSTOM VERSION FROM FOLDER
            // ------------------------------------------------------------------
            // If the JSON doesn't provide a specific ID, we try to find it in the versions folder
            let detectedVersionId = null
            let detectedForgeForThisMc = null
            
            const versionsPath = path.join(rootPath, 'versions')
            if (fs.existsSync(versionsPath)) {
                try {
                    const dirs = fs.readdirSync(versionsPath).filter(f => {
                        return fs.statSync(path.join(versionsPath, f)).isDirectory()
                    })
                    
                    const getVersionJson = (versionId) => {
                        try {
                            const jsonPath = path.join(versionsPath, versionId, `${versionId}.json`)
                            if (!fs.existsSync(jsonPath)) return null
                            const stat = fs.statSync(jsonPath)
                            if (!stat.isFile() || stat.size < 16) return null
                            const raw = fs.readFileSync(jsonPath, 'utf-8')
                            const parsed = JSON.parse(raw)
                            if (!parsed || typeof parsed !== 'object') return null
                            if (!parsed.id || typeof parsed.id !== 'string') return null
                            return parsed
                        } catch (e) {
                            return null
                        }
                    }

                    const isForgeProfile = (json, versionId) => {
                        if (!json) return false
                        const id = String(versionId || json.id || '').toLowerCase()
                        const mainClass = String(json.mainClass || '').toLowerCase()
                        const hasForgeMain = mainClass.includes('cpw.mods') || mainClass.includes('modlauncher') || mainClass.includes('forge')
                        const libs = Array.isArray(json.libraries) ? json.libraries : []
                        const hasForgeLib = libs.some(l => String(l?.name || '').toLowerCase().includes('net.minecraftforge') || String(l?.name || '').toLowerCase().includes('minecraftforge'))
                        return id.includes('forge') || hasForgeMain || hasForgeLib
                    }

                    const isFabricProfile = (json, versionId) => {
                        if (!json) return false
                        const id = String(versionId || json.id || '').toLowerCase()
                        const libs = Array.isArray(json.libraries) ? json.libraries : []
                        const hasFabricLib = libs.some(l => String(l?.name || '').toLowerCase().includes('net.fabricmc'))
                        return id.includes('fabric') || hasFabricLib
                    }

                    const isValidForLoader = (versionId, loader) => {
                        const json = getVersionJson(versionId)
                        if (!json) return false
                        const inherits = String(json.inheritsFrom || '').toLowerCase()
                        const mc = String(instance.version || '').toLowerCase()
                        const inheritsOk = !inherits || inherits.includes(mc)
                        if (!inheritsOk) return false
                        if (loader === 'forge') return isForgeProfile(json, versionId)
                        if (loader === 'fabric') return isFabricProfile(json, versionId)
                        return true
                    }

                    const loaderKey = instance.loader === 'forge' ? 'forge' : instance.loader
                    const candidates = dirs.filter(d => {
                        const dl = d.toLowerCase()
                        const matchLoader = loaderKey ? dl.includes(loaderKey) : false
                        const matchMc = dl.includes(instance.version.toLowerCase())
                        return matchLoader && matchMc
                    })

                    let chosen = null
                    for (const d of candidates) {
                        if (instance.loader === 'forge' && d.toLowerCase().includes('forge')) {
                            detectedForgeForThisMc = d
                        }
                        if (isValidForLoader(d, instance.loader)) {
                            chosen = d
                            break
                        }
                    }

                    if (chosen) {
                        console.log(`[AUTO-DETECT] Found custom version folder: ${chosen}`)
                        detectedVersionId = chosen
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
            // 🔨 FORGE HANDLING (Auto-Install & Installer Setup)
            // ------------------------------------------------------------------
            if (instance.loader === 'forge') {
                try {
                    console.log(`[FORGE] Checking Forge configuration for ${instance.version}...`)
                    
                    let forgeVersion = instance.forgeVersion
                    
                    // 1. Try to deduce Forge version if not explicit
                    if (!forgeVersion) {
                         if (detectedVersionId) {
                             // Try to parse from detected folder name
                             // Common formats: "1.20.1-forge-47.2.0", "forge-1.16.5-36.2.34"
                             const parts = detectedVersionId.split('-')
                             const lastPart = parts[parts.length - 1]
                             // Basic heuristic: check if it looks like a version (has dots, starts with digit)
                             if (lastPart.includes('.') && /^\d/.test(lastPart) && lastPart !== instance.version) {
                                 forgeVersion = lastPart
                                 console.log(`[FORGE] Deduced version from folder: ${forgeVersion}`)
                             }
                        }
                    }

                    // 2. If still missing, fetch recommended (Only if we don't have a detected version, 
                    //    OR if we strictly need to ensure we have an installer)
                    if (!forgeVersion && !detectedVersionId && !instance.customVersionId) {
                        console.log("[FORGE] No version detected. Fetching recommended...")
                        const promoUrl = `https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json`
                        try {
                            const { data: promo } = await axios.get(promoUrl, {
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                                },
                                timeout: 15000
                            })
                            if (promo && promo.promos) {
                                forgeVersion = promo.promos[`${instance.version}-recommended`] || promo.promos[`${instance.version}-latest`]
                            }
                        } catch (e) {
                            console.warn(`[FORGE] Failed to fetch promotions from primary URL: ${e.message}. Trying mirror...`)
                            const mirrorUrl = `https://bmclapi2.bangbang93.com/forge/promotions_slim.json`
                            try {
                                const { data: promo } = await axios.get(mirrorUrl, { timeout: 15000 })
                                if (promo && promo.promos) {
                                    forgeVersion = promo.promos[`${instance.version}-recommended`] || promo.promos[`${instance.version}-latest`]
                                }
                            } catch (e2) {
                                console.error(`[FORGE] Failed to fetch promotions from mirror: ${e2.message}`)
                            }
                        }

                        // Fallback for common versions if fetch failed
                        if (!forgeVersion) {
                            if (instance.version === '1.20.1') forgeVersion = '47.2.0'
                            else if (instance.version === '1.16.5') forgeVersion = '36.2.34'
                            else if (instance.version === '1.18.2') forgeVersion = '40.2.0'
                            else if (instance.version === '1.19.2') forgeVersion = '43.2.0'
                            else if (instance.version === '1.19.4') forgeVersion = '45.1.0'
                            else if (instance.version === '1.20.2') forgeVersion = '48.1.0'
                            
                            if (forgeVersion) {
                                console.warn(`[FORGE] Used fallback version for ${instance.version}: ${forgeVersion}`)
                            }
                        }
                    }

                    // 3. If we have a forgeVersion, prepare the installer
                    if (forgeVersion) {
                        // Ensure version doesn't already contain the MC version (some detections might include it)
                        const cleanForgeVersion = forgeVersion.replace(`${instance.version}-`, '')
                        const forgeFullVersion = `${instance.version}-${cleanForgeVersion}`
                        
                        const installerUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${forgeFullVersion}/forge-${forgeFullVersion}-installer.jar`
                        
                        const cacheDir = path.join(baseDir, 'cache')
                        const installerPath = path.join(cacheDir, `forge-${forgeFullVersion}-installer.jar`)
                        
                        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true })
                        
                        // Check/Download logic
                        let needsInstallerDownload = !fs.existsSync(installerPath)
                         
                        if (!needsInstallerDownload) {
                             try {
                                 const stat = fs.statSync(installerPath)
                                 if (stat.size < 1000) { 
                                     console.log(`[AUTO-FIX] Deleting invalid/corrupt installer: ${installerPath}`)
                                     fs.unlinkSync(installerPath)
                                     needsInstallerDownload = true
                                 }
                             } catch (e) { needsInstallerDownload = true }
                        }

                        if (needsInstallerDownload) {
                             console.log(`Downloading Forge Installer: ${installerUrl}`)
                             syncManager.sendProgress('Downloading Forge Installer...', 0, 1)
                             try {
                               await syncManager.downloadLargeFile(installerUrl, installerPath, { signal })
                             } catch (e) {
                               if (signal.aborted || e.message === 'Download aborted' || e.message === 'Launch aborted') {
                                   try { if (fs.existsSync(installerPath)) fs.unlinkSync(installerPath) } catch {}
                                   throw new Error('Download aborted')
                               }
                               console.warn(`[FORGE] Primary Maven download failed: ${e.message}. Trying mirror...`)
                               try {
                                   const mirror = `https://bmclapi2.bangbang93.com/maven/net/minecraftforge/forge/${forgeFullVersion}/forge-${forgeFullVersion}-installer.jar`
                                   await syncManager.downloadLargeFile(mirror, installerPath, { signal })
                               } catch (e2) {
                                   console.warn(`[FORGE] BMCLAPI mirror failed: ${e2.message}. Trying official files mirror...`)
                                   const officialMirror = `https://files.minecraftforge.net/net/minecraftforge/forge/${forgeFullVersion}/forge-${forgeFullVersion}-installer.jar`
                                   await syncManager.downloadLargeFile(officialMirror, installerPath, { signal })
                               }
                             }
                             if (signal.aborted) {
                                 try { if (fs.existsSync(installerPath)) fs.unlinkSync(installerPath) } catch {}
                                 throw new Error('Download aborted')
                             }
                             syncManager.sendProgress('Downloading Forge Installer...', 1, 1)
                        }
                        
                        console.log(`[FORGE] Installer ready at: ${installerPath}`)
                        forgeInstallerPath = installerPath
                    } else {
                        console.warn("[FORGE] Could not determine Forge version. Launch might fail if installer is required.")
                    }
                } catch (err) {
                    console.error("[FORGE] Error preparing Forge:", err.message)
                }
            }

            // Decide version selection strategy:
            // - If we already have a custom version folder (detectedVersionId or explicit), use custom.
            // - Else, rely on MCLC + forge installer to create the profile from the base MC version.
            const validateCustomId = (customId) => {
                try {
                    const jsonPath = path.join(rootPath, 'versions', customId, `${customId}.json`)
                    if (!fs.existsSync(jsonPath)) return false
                    const stat = fs.statSync(jsonPath)
                    if (!stat.isFile() || stat.size < 16) return false
                    const raw = fs.readFileSync(jsonPath, 'utf-8')
                    const parsed = JSON.parse(raw)
                    if (!parsed || typeof parsed !== 'object') return false
                    if (!parsed.id || typeof parsed.id !== 'string') return false
                    const inherits = String(parsed.inheritsFrom || '').toLowerCase()
                    const mc = String(instance.version || '').toLowerCase()
                    if (inherits && !inherits.includes(mc)) return false
                    if (instance.loader === 'forge') {
                        const mainClass = String(parsed.mainClass || '').toLowerCase()
                        const libs = Array.isArray(parsed.libraries) ? parsed.libraries : []
                        const hasForgeLib = libs.some(l => String(l?.name || '').toLowerCase().includes('net.minecraftforge') || String(l?.name || '').toLowerCase().includes('minecraftforge'))
                        const hasForgeMain = mainClass.includes('cpw.mods') || mainClass.includes('modlauncher') || mainClass.includes('forge')
                        if (!(String(customId).toLowerCase().includes('forge') || hasForgeMain || hasForgeLib)) return false
                    }
                    if (instance.loader === 'fabric') {
                        const libs = Array.isArray(parsed.libraries) ? parsed.libraries : []
                        const hasFabricLib = libs.some(l => String(l?.name || '').toLowerCase().includes('net.fabricmc'))
                        if (!(String(customId).toLowerCase().includes('fabric') || hasFabricLib)) return false
                    }
                    return true
                } catch (e) {
                    return false
                }
            }

            let selectedCustomId = null
            const explicitCustomValid = instance.customVersionId ? validateCustomId(instance.customVersionId) : false
            const detectedCustomValid = detectedVersionId ? validateCustomId(detectedVersionId) : false
            if (instance.customVersionId && !explicitCustomValid) {
                console.warn(`[VERSION] Invalid custom profile '${instance.customVersionId}'. Falling back to installer/base version.`)
            }
            if (!instance.customVersionId && detectedVersionId && !detectedCustomValid) {
                console.warn(`[VERSION] Detected profile '${detectedVersionId}' is not valid for loader '${instance.loader}'. Falling back to installer/base version.`)
            }

            if (instance.customVersionId && explicitCustomValid) {
                selectedCustomId = instance.customVersionId
                console.log(`[VERSION] Using explicit custom version: ${selectedCustomId}`)
            } else if (detectedVersionId && detectedCustomValid) {
                selectedCustomId = detectedVersionId
                console.log(`[VERSION] Using detected custom version: ${selectedCustomId}`)
            }

            if (selectedCustomId) {
                versionOpts.type = "custom"
                versionOpts.custom = selectedCustomId
            } else if (instance.loader === 'fabric') {
                // Fabric JSON may have been generated above
                if (fs.existsSync(path.join(rootPath, 'versions'))) {
                    const dirs = fs.readdirSync(path.join(rootPath, 'versions')).filter(d => d.toLowerCase().includes('fabric') && d.includes(instance.version))
                    if (dirs[0]) {
                        versionOpts.type = "custom"
                        versionOpts.custom = dirs[0]
                        console.log(`[VERSION] Using generated Fabric version: ${dirs[0]}`)
                    }
                }
            } else if (instance.loader === 'forge') {
                // Keep versionOpts as release and pass installer path so MCLC installs forge profile for us.
                console.log("[VERSION] No Forge profile detected; will install via installer during launch.")
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
        let quickPlayConfig = null

        if (autoJoin && instance.serverIp) {
            const serverIp = instance.serverIp.trim()
            if (serverIp) {
                // Robust Version Checking
                const isModern = (v) => {
                    if (!v) return false
                    // Handle "1.20.1", "1.20", "1.21-rc1"
                    // Match major.minor
                    const match = v.match(/^1\.(\d+)/)
                    if (match && match[1]) {
                        const minor = parseInt(match[1])
                        return minor >= 20
                    }
                    return false
                }

                console.log("[AUTO-JOIN] Configuring auto-join...")
                if (isModern(instance.version)) {
                    // Use QuickPlay for 1.20+
                    quickPlayConfig = {
                        type: 'multiplayer',
                        identifier: serverIp
                    }
                    console.log(`[AUTO-JOIN] Using QuickPlay for ${instance.version}: ${serverIp}`)
                } else {
                    // Use Legacy Arguments for older versions
                    // MCLC 'legacy' type adds --server and --port
                    quickPlayConfig = {
                        type: 'legacy',
                        identifier: serverIp
                    }
                    console.log(`[AUTO-JOIN] Using Legacy Args for ${instance.version}: ${serverIp}`)
                }
            }
        }

        const forgeOption = (instance.loader === 'forge' && forgeInstallerPath && versionOpts.type !== "custom")
            ? forgeInstallerPath
            : null

        const opts = {
            forge: forgeOption || undefined,
            javaPath,
            clientPackage: null,
            authorization: auth,
            root: rootPath,
            version: versionOpts,
            memory: {
                max: ramToUse + "M",
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

        // Only add quickPlay if configured (prevents MCLC crash on null destructuring)
        if (quickPlayConfig) {
            opts.quickPlay = quickPlayConfig
        }

        // Setup Event Listeners BEFORE launching
        launcher.on('debug', (e) => {
            mainWindow.webContents.send('game-log', `[DEBUG] ${e}`)
        })
        let vlcErrorDetected = false
        let oomDetected = false
        let invalidSessionDetected = false

        // Log session to file for crash reports
        const logsDir = path.join(rootPath, 'logs')
        if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true })
        const sessionStamp = new Date().toISOString().replace(/[:.]/g, '-')
        const sessionLogPath = path.join(logsDir, `session-${sessionStamp}.log`)
        const sessionStream = fs.createWriteStream(sessionLogPath)
        let exceptionDetected = false
        launcher.on('data', (e) => {
            console.log(`[DATA] ${e}`)
            mainWindow.webContents.send('game-log', `${e}`)
            const text = String(e)
            try { sessionStream.write(text + '\n') } catch {}
            if (text.includes('libvlc error') || text.includes('no suitable interface module')) {
                vlcErrorDetected = true
            }
            const lower = text.toLowerCase()
            if (lower.includes('insufficient memory for the java runtime environment') || lower.includes('native memory allocation (mmap) failed')) {
                oomDetected = true
            }
            if (lower.includes('failed to login: invalid session')) {
                invalidSessionDetected = true
            }
            if (lower.includes('exception') || lower.includes('error')) {
                exceptionDetected = true
            }
        })
        
        let lastProgressTime = 0
        launcher.on('progress', (e) => {
             const now = Date.now()
             // Throttle progress updates to avoid IPC flooding (especially during asset checks)
             if (now - lastProgressTime > 100 || e.type !== 'assets') {
                 mainWindow.webContents.send('launch-progress', e)
                 lastProgressTime = now
             }
        })

        launcher.on('arguments', (e) => {
            console.log("Game Launched")
            mainWindow.webContents.send('launch-success')
            mainWindow.hide() // Hide to Tray
            setActivity('playing', instance.name, Date.now())
        })

        launcher.on('close', (code) => {
             console.log("Game Closed with code", code)
             activeLauncherProcess = null
             setActivity('selecting')
             try { sessionStream.end() } catch {}
             
             if (vlcErrorDetected) {
                 mainWindow.webContents.send('game-closed', { 
                     code, 
                     error: 'Video Mod Error (VLC)', 
                     details: 'Mod ที่ใช้วิดีโอ (เช่น FancyMenu) ทำงานผิดพลาด\nโปรดติดตั้ง Visual C++ Redistributable (x64)' 
                 })
             } else if (oomDetected) {
                 mainWindow.webContents.send('game-closed', {
                     code,
                     error: 'Insufficient Memory (Java)',
                     details: 'หน่วยความจำในเครื่องไม่เพียงพอสำหรับ Java ในการเปิดเกม\n\nวิธีแก้ที่แนะนำ:\n- ลดค่า RAM ในหน้า Settings ของ StarHub (แท็บ General)\n- ถ้าเครื่องมี RAM น้อยกว่า 8GB แนะนำให้ตั้งไว้ประมาณ 2048-3072 MB\n- ปิดโปรแกรมอื่น ๆ ที่ใช้ RAM เยอะก่อนเปิดเกม\n- รีสตาร์ทเครื่องถ้ายังเป็นอยู่'
                 })
             } else if (invalidSessionDetected) {
                 try {
                     store.delete('auth')
                 } catch (e) {
                     console.error("Failed to clear auth after invalid session:", e)
                 }
                 mainWindow.webContents.send('game-closed', {
                     code,
                     error: 'Invalid Session',
                     details: 'ไม่สามารถเข้าสู่เซิร์ฟเวอร์ได้เพราะ Session ของ Minecraft ไม่ถูกต้องหรือหมดอายุ\n\nStarHub ทำการออกจากระบบให้แล้ว\nกรุณาเปิด Settings แล้วล็อกอินบัญชี Minecraft ใหม่อีกครั้ง จากนั้นเปิดเกมใหม่แล้วลองเข้าเซิร์ฟเวอร์อีกครั้ง'
                 })
             } else {
                 if (code !== 0 || exceptionDetected) {
                     try {
                         const crashDir = path.join(rootPath, 'crash-reports')
                         if (!fs.existsSync(crashDir)) fs.mkdirSync(crashDir, { recursive: true })
                         const bundlePath = path.join(crashDir, `crash-${sessionStamp}.zip`)
                         const zip = new AdmZip()
                         zip.addLocalFile(sessionLogPath)
                         const envInfo = {
                           instance: { id: instance.id, name: instance.name, version: instance.version, loader: instance.loader || 'vanilla' },
                           javaPath,
                           memoryMB: ramToUse,
                           os: { platform: os.platform(), release: os.release(), arch: os.arch() }
                         }
                         const envJsonPath = path.join(crashDir, `env-${sessionStamp}.json`)
                         fs.writeFileSync(envJsonPath, JSON.stringify(envInfo, null, 2))
                         zip.addLocalFile(envJsonPath)
                         zip.writeZip(bundlePath)
                         try { fs.unlinkSync(envJsonPath) } catch {}
                         mainWindow.webContents.send('game-closed', { code, error: 'Game closed unexpectedly', details: `สร้างไฟล์รายงานไว้ที่:\n${bundlePath}` })
                     } catch (e) {
                         mainWindow.webContents.send('game-closed', code)
                     }
                 } else {
                     mainWindow.webContents.send('game-closed', code)
                 }
             }
             
             mainWindow.show()
        })
        
        // Await launch to catch initialization errors
        try {
            await launcher.launch(opts)
        } catch (primaryErr) {
            // Retry strategy for Forge: if installer exists and no custom profile selected, try once more after cleaning the versions folder
            if (instance.loader === 'forge' && forgeOption) {
                try {
                    console.warn("[FORGE][RETRY] Primary launch failed. Cleaning Forge versions and retrying once...")
                    const versionsPath = path.join(rootPath, 'versions')
                    if (fs.existsSync(versionsPath)) {
                        const dirs = fs.readdirSync(versionsPath).filter(d => d.toLowerCase().includes('forge') && d.includes(instance.version))
                        for (const d of dirs) {
                            await fs.promises.rm(path.join(versionsPath, d), { recursive: true, force: true })
                        }
                    }
                    await launcher.launch(opts)
                } catch (retryErr) {
                    throw retryErr
                }
            } else {
                throw primaryErr
            }
        }
        
        activeLauncherProcess = true // Mark as running

        return { success: true }

    } catch (error) {
        console.error("Launch Error:", error)
        if (
            error.message === 'Launch aborted' ||
            error.message === 'Download aborted' ||
            error.message === 'Unzip aborted' ||
            error.message === 'Extraction aborted'
        ) {
            return { success: false, error: 'Cancelled' }
        }
        return { success: false, error: error.message }
    }
  })

  ipcMain.handle('install-vcredist', async () => {
    try {
      const vcredistUrl = 'https://aka.ms/vs/17/release/vc_redist.x64.exe'
      const tempPath = path.join(app.getPath('temp'), 'vc_redist.x64.exe')
      
      console.log(`[VCREDIST] Downloading from ${vcredistUrl}...`)
      const response = await axios({
        method: 'get',
        url: vcredistUrl,
        responseType: 'stream'
      })

      const writer = fs.createWriteStream(tempPath)
      response.data.pipe(writer)

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve)
        writer.on('error', reject)
      })

      console.log(`[VCREDIST] Downloaded to ${tempPath}. Starting installation...`)
      
      // Run installer silently: /install /quiet /norestart
      const child = spawn(tempPath, ['/install', '/passive', '/norestart'], {
        detached: true,
        stdio: 'ignore'
      })
      
      child.unref()
      
      return { success: true }
    } catch (error) {
      console.error("[VCREDIST] Installation failed:", error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('open-instance-folder', async (event, instance) => {
      if (!instance) return { success: false, reason: 'no_instance' }
      
      // Security: Validate instance ID to prevent path traversal (allow dots, underscores, dashes)
      if (!/^[a-zA-Z0-9_.-]+$/.test(instance.id)) {
          console.error(`[SECURITY] Invalid instance ID attempted: ${instance.id}`)
          return { success: false, reason: 'invalid_id' }
      }

      const baseDir = app.getPath('userData')
      const folder = path.join(baseDir, 'instances', instance.id)
      
      if (!fs.existsSync(folder)) {
          return { success: false, reason: 'not_found' }
      }
      shell.openPath(folder)
      return { success: true }
  })

  ipcMain.handle('uninstall-instance', async (event, instance) => {
      try {
          if (!instance || !instance.id) {
              return { success: false, error: 'Invalid instance' }
          }

          if (!/^[a-zA-Z0-9_.-]+$/.test(instance.id)) {
              console.error(`[SECURITY] Invalid instance ID for uninstall: ${instance.id}`)
              return { success: false, error: 'invalid_id' }
          }

          const baseDir = app.getPath('userData')
          const instancePath = path.join(baseDir, 'instances', instance.id)

          if (fs.existsSync(instancePath)) {
              await fs.promises.rm(instancePath, { recursive: true, force: true })
          }

          const installed = store.get('installed_versions', {})
          if (installed && Object.prototype.hasOwnProperty.call(installed, instance.id)) {
              delete installed[instance.id]
              store.set('installed_versions', installed)
          }

          return { success: true }
      } catch (error) {
          console.error("[UNINSTALL] Failed:", error)
          return { success: false, error: error.message }
      }
  })

  ipcMain.handle('repair-game', async (event, instanceId) => {
      try {
          if (!instanceId) return { success: false, error: 'No Instance ID' }
          
          const baseDir = app.getPath('userData')
          const instancePath = path.join(baseDir, 'instances', instanceId)
          const librariesPath = path.join(instancePath, 'libraries')
          const assetsPath = path.join(instancePath, 'assets')
          
          console.log(`[REPAIR] Deleting libraries for instance: ${instanceId}`)
          
          if (fs.existsSync(librariesPath)) {
              await fs.promises.rm(librariesPath, { recursive: true, force: true })
          }
          if (fs.existsSync(assetsPath)) {
              await fs.promises.rm(assetsPath, { recursive: true, force: true })
          }

          return { success: true }
      } catch (error) {
          console.error("[REPAIR] Failed:", error)
          return { success: false, error: error.message }
      }
  })
}
