import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import axios from 'axios'
import AdmZip from 'adm-zip'
import { getStore } from './store'
import { Transform } from 'stream'

// ----------------------------------------------------------------------
// 🔧 SYNC CONFIGURATION
// ----------------------------------------------------------------------
const MAX_RETRIES = 3
const CHUNK_SIZE = 10 * 1024 * 1024 // 10MB chunks

class Throttle extends Transform {
    constructor(bps) {
        super()
        this.bps = bps
        this.sent = 0
        this.startTime = Date.now()
    }

    _transform(chunk, encoding, callback) {
        this.sent += chunk.length
        const elapsed = Date.now() - this.startTime
        const expected = (this.sent / this.bps) * 1000
        
        if (elapsed < expected) {
            setTimeout(() => {
                this.push(chunk)
                callback()
            }, expected - elapsed)
        } else {
            this.push(chunk)
            callback()
        }
    }
}

export class SyncManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow
    this.lastProgressUpdate = 0
  }

  sendProgress(task, current, total, message = '') {
    const now = Date.now()
    // Throttle updates to max 10 times per second (100ms)
    // Always send if completed (current == total) or if it's a new task
    if (now - this.lastProgressUpdate > 100 || current === total || current === 0) {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('launch-progress', {
                type: 'progress',
                task,
                current,
                total,
                message
            })
        }
        this.lastProgressUpdate = now
    }
  }

  log(message) {
    console.log(`[SyncManager] ${message}`)
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        // Optional: Send logs to UI console if needed
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Helper to safely open a file with retry logic for EPERM errors (Common on Windows)
   */
  async safeOpen(dest, mode, retries = 15, delay = 1000) {
      for (let i = 0; i < retries; i++) {
          try {
              if (mode === 'w' && i === 0) {
                  try {
                      if (fs.existsSync(dest)) {
                          fs.chmodSync(dest, 0o666) 
                      }
                  } catch (e) {}
              }

              const handle = await fs.promises.open(dest, mode)
              return handle
          } catch (e) {
              const isLocked = e.code === 'EPERM' || e.code === 'EBUSY' || e.code === 'EACCES'
              if (isLocked && i < retries - 1) {
                  this.log(`[FILE-LOCKED] ${path.basename(dest)} is locked (${e.code}), retrying... (${i+1}/${retries})`)
                  await this.sleep(delay)
                  continue
              }
              throw e
          }
      }
  }

  /**
   * Download a file with retry logic and progress tracking
   */
  async downloadFile(url, dest, options = {}) {
    const { 
        retries = MAX_RETRIES, 
        onProgress = () => {},
        checkSize = true,
        signal = null
    } = options

    const fileName = path.basename(dest)
    this.log(`[DOWNLOAD] Starting download for ${fileName}`)
    
    const tempDest = `${dest}.tmp`
    if (fs.existsSync(tempDest)) {
        try { fs.chmodSync(tempDest, 0o666); fs.unlinkSync(tempDest) } catch(e) {}
    }

    let attempt = 0
    while (attempt <= retries) {
        if (signal?.aborted) throw new Error('Download aborted')
        
        let fd = null
        try {
            // Pre-check size
            if (checkSize && fs.existsSync(dest)) {
                try {
                    const stats = await fs.promises.stat(dest)
                    const head = await axios.head(url, {
                        headers: { 'User-Agent': 'Mozilla/5.0' },
                        timeout: 10000
                    })
                    const remoteSize = parseInt(head.headers['content-length'], 10)
                    if (remoteSize > 0 && stats.size === remoteSize) {
                        this.log(`[DOWNLOAD] Already exists: ${fileName}`)
                        return true
                    }
                } catch (e) { /* Fallback to download */ }
            }
            
            const response = await axios({
                method: 'get',
                url: url,
                responseType: 'stream',
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 30000
            })

            const totalLength = parseInt(response.headers['content-length'], 10) || 0
            let downloaded = 0
            
            fd = await this.safeOpen(tempDest, 'w')
            const writer = fs.createWriteStream(null, { fd: fd.fd, autoClose: false })
            
            let lastOnProgress = 0
            
            response.data.on('data', (chunk) => {
                downloaded += chunk.length
                const now = Date.now()
                if (totalLength && (now - lastOnProgress > 100 || downloaded === totalLength)) {
                    onProgress(downloaded, totalLength)
                    lastOnProgress = now
                }
            })

            const maxSpeed = getStore().get('maxDownloadSpeed', 0)
            if (maxSpeed > 0) {
                const bps = maxSpeed * 1024 * 1024
                const throttle = new Throttle(bps)
                response.data.pipe(throttle).pipe(writer)
            } else {
                response.data.pipe(writer)
            }

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve)
                writer.on('error', (err) => {
                    writer.destroy()
                    reject(err)
                })
            })

            if (totalLength > 0) {
                const stat = await fd.stat()
                if (stat.size !== totalLength) {
                    throw new Error(`Incomplete: expected ${totalLength} but got ${stat.size}`)
                }
            }

            await fd.close()
            fd = null

            // Atomic rename with retries
            if (fs.existsSync(dest)) {
                 try { fs.chmodSync(dest, 0o666); fs.unlinkSync(dest) } catch(e) {}
            }
            
            for (let i = 0; i < 10; i++) {
                try {
                    fs.renameSync(tempDest, dest)
                    break
                } catch(e) {
                    if (i === 9) throw e
                    await this.sleep(500)
                }
            }

            this.log(`[DOWNLOAD] Success: ${fileName}`)
            return true

        } catch (error) {
            if (fd) {
                try { await fd.close() } catch(e) {}
                fd = null
            }
            attempt++
            this.log(`[DOWNLOAD] Error (Attempt ${attempt}/${retries}): ${fileName} - ${error.message}`)
            if (attempt > retries) {
                try { if (fs.existsSync(tempDest)) fs.unlinkSync(tempDest) } catch(e) {}
                throw error
            }
            await this.sleep(1000 * attempt)
        }
    }
  }

  /**
   * Download a large file using chunks (Range requests)
   */
  async downloadLargeFile(url, dest, options = {}) {
     const { signal = null } = options
     const fileName = path.basename(dest)
     this.log(`[LARGE-DOWNLOAD] Starting chunked download: ${fileName}`)
     
     const tempDest = `${dest}.tmp`

     if (fs.existsSync(tempDest)) {
         try {
             fs.chmodSync(tempDest, 0o666)
             fs.unlinkSync(tempDest)
         } catch (e) {
             this.log(`[LARGE-DOWNLOAD] Temp cleanup warning: ${e.message}`)
         }
     }

     let totalSize = 0
     try {
         if (signal?.aborted) throw new Error('Download aborted')
         const head = await axios.head(url, {
             headers: { 'User-Agent': 'Mozilla/5.0' },
             timeout: 15000
         })
         totalSize = parseInt(head.headers['content-length'], 10)
         
         const acceptRanges = head.headers['accept-ranges']
         if (acceptRanges !== 'bytes' && !head.headers['content-range']) {
             this.log("[LARGE-DOWNLOAD] No range support, falling back to stream.")
             return this.downloadFile(url, dest, options)
         }

     } catch (e) {
         if (signal?.aborted) throw new Error('Download aborted')
         this.log(`[LARGE-DOWNLOAD] Size check failed: ${e.message}. Falling back.`)
         return this.downloadFile(url, dest, options)
     }

     if (!totalSize) return this.downloadFile(url, dest, options)

     const chunks = Math.ceil(totalSize / CHUNK_SIZE)
     this.log(`Downloading ${fileName} in ${chunks} chunks (${(totalSize/1024/1024).toFixed(2)} MB)`)

     const fd = await this.safeOpen(tempDest, 'w')
     let downloadedTotal = 0
     let abortError = null
     
     const downloadChunk = async (i) => {
         if (signal?.aborted || abortError) return
         
         const start = i * CHUNK_SIZE
         const end = Math.min(start + CHUNK_SIZE - 1, totalSize - 1)
         
         let retries = 0
         while (retries <= MAX_RETRIES) {
             if (signal?.aborted || abortError) return
             try {
                 const startTime = Date.now()
                 const response = await axios({
                    method: 'get',
                    url: url,
                    headers: { Range: `bytes=${start}-${end}` },
                    responseType: 'arraybuffer',
                    timeout: 45000
                 })
                 
                 if (signal?.aborted || abortError) return

                 const buffer = Buffer.from(response.data)
                 await fd.write(buffer, 0, buffer.length, start)
                 
                 const maxSpeed = getStore().get('maxDownloadSpeed', 0)
                 if (maxSpeed > 0) {
                     const bps = maxSpeed * 1024 * 1024
                     const expectedTime = (buffer.length / bps) * 1000
                     const actualTime = Date.now() - startTime
                     if (actualTime < expectedTime) await this.sleep(expectedTime - actualTime)
                 }

                 downloadedTotal += buffer.length
                 response.data = null 
                 
                 this.sendProgress('Downloading Modpack...', downloadedTotal, totalSize)
                 return 
             } catch (e) {
                 if (signal?.aborted || abortError) return
                 retries++
                 if (retries > MAX_RETRIES) throw e
                 await this.sleep(1500 * retries)
             }
         }
     }

     const queue = Array.from({ length: chunks }, (_, i) => i)
     const workers = []
     const concurrency = getStore().get('maxConcurrentDownloads', 5)

     for (let w = 0; w < concurrency; w++) {
         workers.push((async () => {
             while (queue.length > 0 && !abortError && !signal?.aborted) {
                 const i = queue.shift()
                 if (i !== undefined) {
                     try {
                        await downloadChunk(i)
                     } catch (err) {
                        abortError = err
                        return
                     }
                 }
             }
         })())
     }
     
     try {
        await Promise.all(workers)
        if (abortError) throw abortError
        if (signal?.aborted) throw new Error('Download aborted')

        const stat = await fd.stat()
        if (stat.size !== totalSize) {
            throw new Error(`Incomplete: expected ${totalSize} but got ${stat.size}`)
        }

     } catch (e) {
        await fd.close()
        try { if (fs.existsSync(tempDest)) fs.unlinkSync(tempDest) } catch(err) {}
        throw e
     }
     
     await fd.close()

     if (fs.existsSync(dest)) {
          try { fs.chmodSync(dest, 0o666); fs.unlinkSync(dest) } catch(e) {}
     }
     
     for (let i = 0; i < 10; i++) {
         try {
             fs.renameSync(tempDest, dest)
             break
         } catch(e) {
             if (i === 9) throw e
             await this.sleep(500)
         }
     }

     this.log(`[LARGE-DOWNLOAD] Success: ${fileName}`)
     return true
  }

  /**
   * Sync a list of mods with concurrency
   */
  async syncMods(mods, modsFolder, options = {}) {
      if (!mods || mods.length === 0) return
      const { signal = null } = options

      try {
          if (!fs.existsSync(modsFolder)) await fs.promises.mkdir(modsFolder, { recursive: true })
      } catch (e) {
          this.log(`[SYNC-ERROR] Could not create mods folder: ${e.message}`)
      }

      this.log(`Syncing ${mods.length} mods...`)
      
      let completed = 0
      const total = mods.length
      const store = getStore()
      const modCache = store.get('modSizeCache', {})
      const CACHE_EXPIRATION_MS = 14 * 24 * 60 * 60 * 1000 // 14 days
      const nowTime = Date.now()
      
      const currentProgress = new Map()

      const updateGlobalProgress = () => {
          let totalProgressPoints = completed * 100
          for (const p of currentProgress.values()) totalProgressPoints += p
          const globalPercent = total > 0 ? (totalProgressPoints / total) : 0
          this.sendProgress('Checking/Downloading Mods', Math.min(globalPercent, 99.9), 100)
      }

      const queue = [...mods]
      let abortError = null

      const next = async () => {
          if (queue.length === 0 || abortError || signal?.aborted) return
          const modUrl = queue.shift()
          
          currentProgress.set(modUrl, 0)
          
          try {
            if (signal?.aborted) throw new Error('Download aborted')

            let fileName = null
            try {
                const urlObj = new URL(modUrl)
                fileName = path.basename(decodeURIComponent(urlObj.pathname))
                if (!fileName || !fileName.includes('.')) {
                    fileName = urlObj.searchParams.get('file') || urlObj.searchParams.get('name') || fileName
                }
            } catch (e) {
                fileName = decodeURIComponent(modUrl.split('/').pop().split('?')[0])
            }

            if (!fileName || fileName.trim() === '') {
                completed++
                updateGlobalProgress()
                return
            }

            const dest = path.join(modsFolder, fileName)

            let shouldDownload = false
            try {
                const stat = await fs.promises.stat(dest)
                const cached = modCache[fileName]
                const isCacheValid = cached && typeof cached === 'object' && cached.size === stat.size && (nowTime - (cached.timestamp || 0) < CACHE_EXPIRATION_MS)

                if (isCacheValid) {
                    shouldDownload = false
                } else {
                    try {
                        const head = await axios.head(modUrl, { 
                            headers: { 'User-Agent': 'Mozilla/5.0' },
                            timeout: 10000 
                        })
                        const remoteSize = parseInt(head.headers['content-length'], 10)
                        if (remoteSize > 0 && stat.size !== remoteSize) {
                            shouldDownload = true
                        } else {
                            shouldDownload = false
                            if (remoteSize > 0) modCache[fileName] = { size: remoteSize, timestamp: nowTime }
                        }
                    } catch (headErr) {
                        shouldDownload = stat.size === 0
                    }
                }
            } catch (stateErr) {
                shouldDownload = true
            }

            if (shouldDownload) {
                await this.downloadFile(modUrl, dest, {
                    signal,
                    onProgress: (loaded, full) => {
                        if (full > 0) {
                            const percent = (loaded / full) * 100
                            currentProgress.set(modUrl, percent)
                            updateGlobalProgress()
                        }
                    }
                })
                try {
                    const finalStat = await fs.promises.stat(dest)
                    modCache[fileName] = { size: finalStat.size, timestamp: nowTime }
                } catch (e) {}
            }

            completed++
            currentProgress.delete(modUrl)
            updateGlobalProgress()

          } catch (e) {
              currentProgress.delete(modUrl)
              if (e.message === 'Download aborted') {
                  abortError = e
                  return
              }
              console.error(`Failed to sync mod: ${modUrl}`, e)
              abortError = e
              return
          }

          if (!abortError && !signal?.aborted) await next()
      }

      const workers = []
      const concurrency = store.get('maxConcurrentDownloads', 5)
      for (let i = 0; i < Math.min(concurrency, mods.length); i++) workers.push(next())
      
      await Promise.all(workers)
      
      if (abortError) throw abortError
      if (signal?.aborted) throw new Error('Download aborted')

      // Cache Cleanup
      const CLEANUP_THRESHOLD = 30 * 24 * 60 * 60 * 1000
      Object.keys(modCache).forEach(key => {
          if (!modCache[key] || nowTime - (modCache[key].timestamp || 0) > CLEANUP_THRESHOLD) delete modCache[key]
      })

      store.set('modSizeCache', modCache)
      this.sendProgress('Checking/Downloading Mods', 100, 100)
  }

  /**
   * Compare local folder against a list of valid filenames
   * Returns lists of added (missing locally), deleted (extra locally), kept, and corrupt files.
   */
  async comparePatches(folder, validFilenames = [], ignoreList = []) {
      const result = {
          added: [],    // In validFilenames but not in folder (New files to download)
          deleted: [],  // In folder but not in validFilenames (Old files to remove)
          kept: [],     // In both
          corrupt: []   // Files that exist but are invalid (0 byte or bad header)
      }

      if (!fs.existsSync(folder)) {
          result.added = [...validFilenames]
          return result
      }

      try {
          const normalizeRel = (rel) => rel.split(path.sep).join('/')
          const validSet = new Set(validFilenames)
          const lowerValidBasenames = new Set(validFilenames.map(v => path.basename(v).toLowerCase()))
          const systemWhitelist = ['figura', 'fragmentskin', 'cache', 'shaderpacks', 'screenshots', ...ignoreList]

          const localFiles = []
          const listFilesRecursive = async (dir, prefix = "") => {
              const entries = await fs.promises.readdir(dir, { withFileTypes: true })
              for (const ent of entries) {
                  const rel = prefix ? `${prefix}/${ent.name}` : ent.name
                  const abs = path.join(dir, ent.name)
                  const relLower = rel.toLowerCase()
                  const isWhitelisted = systemWhitelist.some(w => relLower.includes(String(w).toLowerCase()))
                  if (ent.isDirectory()) {
                      if (isWhitelisted) {
                          result.kept.push(rel)
                          continue
                      }
                      await listFilesRecursive(abs, rel)
                  } else {
                      localFiles.push({ rel: normalizeRel(rel), abs, name: ent.name, whitelisted: isWhitelisted })
                  }
              }
          }

          await listFilesRecursive(folder)

          const localRelSet = new Set(localFiles.map(f => f.rel))

          for (const f of localFiles) {
              if (f.whitelisted) {
                  result.kept.push(f.rel)
                  continue
              }

              let isCorrupt = false
              try {
                  const stats = await fs.promises.stat(f.abs)
                  if (stats.isFile()) {
                      if (stats.size === 0) {
                          isCorrupt = true
                      } else if (f.name.toLowerCase().endsWith('.jar')) {
                          const handle = await fs.promises.open(f.abs, 'r')
                          const buffer = Buffer.alloc(4)
                          await handle.read(buffer, 0, 4, 0)
                          await handle.close()
                          if (buffer[0] !== 0x50 || buffer[1] !== 0x4B) {
                              isCorrupt = true
                          }
                      }
                  }
              } catch (e) {}

              if (isCorrupt) {
                  result.corrupt.push(f.rel)
              }

              const isValidExact = validSet.has(f.rel)
              const isValidByName = lowerValidBasenames.has(f.name.toLowerCase())

              if (isValidExact || isValidByName) {
                  if (!isCorrupt) result.kept.push(f.rel)
                  continue
              }

              if (!isCorrupt) {
                  result.deleted.push(f.rel)
              }
          }

          for (const valid of validFilenames) {
              const normValid = normalizeRel(valid)
              const existsExact = localRelSet.has(normValid)
              const existsByName = localFiles.some(f => f.name.toLowerCase() === path.basename(valid).toLowerCase())
              if (!existsExact && !existsByName) {
                  if (!result.added.includes(valid)) result.added.push(valid)
              } else if (result.corrupt.includes(normValid)) {
                  if (!result.added.includes(valid)) result.added.push(valid)
              }
          }
      } catch (e) {
          console.error(`[COMPARE] Error reading folder ${folder}:`, e)
      }

      return result
  }

  /**
   * Cleanup folder by removing files not in the whitelist
   */
  async cleanupFolder(folder, validFilenames = [], ignoreList = []) {
      try {
          if (!fs.existsSync(folder)) return

          this.log(`[CLEANUP] Checking folder: ${folder}`)
          
          // Use comparePatches logic to identify files to delete
          const { deleted } = await this.comparePatches(folder, validFilenames, ignoreList)

          for (const file of deleted) {
              const filePath = path.join(folder, file)
              this.log(`[CLEANUP] Removing old/extra file: ${file}`)
              await fs.promises.rm(filePath, { recursive: true, force: true })
          }

          const systemWhitelist = ['figura', 'fragmentskin', 'cache', 'shaderpacks', 'screenshots', ...ignoreList]
          const pruneEmptyDirs = async (dir, prefix = "") => {
              const entries = await fs.promises.readdir(dir, { withFileTypes: true })
              for (const ent of entries) {
                  if (!ent.isDirectory()) continue
                  const rel = prefix ? `${prefix}/${ent.name}` : ent.name
                  const abs = path.join(dir, ent.name)
                  const relLower = rel.toLowerCase()
                  const isWhitelisted = systemWhitelist.some(w => relLower.includes(String(w).toLowerCase()))
                  if (isWhitelisted) continue
                  await pruneEmptyDirs(abs, rel)
                  try {
                      const after = await fs.promises.readdir(abs)
                      if (after.length === 0) {
                          await fs.promises.rm(abs, { recursive: true, force: true })
                      }
                  } catch (e) {}
              }
          }
          await pruneEmptyDirs(folder)
      } catch (e) {
          console.error(`[CLEANUP] Error cleaning folder ${folder}:`, e)
      }
  }

  /**
   * Native Unzip using PowerShell (Windows) to save RAM
   */
  async nativeUnzip(zipPath, targetDir, signal = null) {
      return new Promise((resolve, reject) => {
          if (signal?.aborted) return reject(new Error('Unzip aborted'))
          
          let childProcess = null

          try {
              // PowerShell Expand-Archive is memory efficient as it runs in a separate process
              const command = `powershell -NoProfile -NonInteractive -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${targetDir}' -Force"`
              
              childProcess = exec(command, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
                  if (signal?.aborted) return // Already handled
                  if (error) {
                      // Fallback to AdmZip if PowerShell fails
                      console.warn("PowerShell unzip failed, falling back to AdmZip:", error.message)
                      this.fallbackUnzip(zipPath, targetDir, resolve, reject, signal)
                  } else {
                      resolve(true)
                  }
              })
              
              if (signal) {
                  signal.addEventListener('abort', () => {
                      if (childProcess) {
                          try {
                              childProcess.kill() 
                          } catch (e) {
                              console.error("Failed to kill unzip process:", e)
                          }
                      }
                      reject(new Error('Unzip aborted'))
                  }, { once: true })
              }

          } catch (err) {
              // Fallback if exec itself fails to run
              console.warn("exec failed to start, falling back to AdmZip:", err.message)
              this.fallbackUnzip(zipPath, targetDir, resolve, reject, signal)
          }
      })
  }

  fallbackUnzip(zipPath, targetDir, resolve, reject, signal) {
      if (signal?.aborted) return reject(new Error('Unzip aborted'))
      try {
          const zip = new AdmZip(zipPath)
          // AdmZip is synchronous and blocking, can't easily abort mid-extraction without worker threads
          // But we can check before starting
          zip.extractAllTo(targetDir, true)
          if (signal?.aborted) throw new Error('Unzip aborted') // Late check
          resolve(true)
      } catch (e) {
          reject(new Error(`Unzip failed: ${e.message}`))
      }
  }

  /**
   * Extract Zip file with Progress
   */
  async extractZip(zipPath, targetDir, options = {}) {
      const { signal = null, ignoreFiles = [] } = options
      if (signal?.aborted) throw new Error('Extraction aborted')

      this.log(`Extracting ${path.basename(zipPath)}...`)
      
      // 🚨 Retry logic for opening the Zip file (Common EPERM on Windows after download)
      let zip = null
      for (let i = 0; i < 10; i++) {
          try {
              zip = new AdmZip(zipPath)
              zip.getEntries() // Integrity check
              break
          } catch (e) {
              if (i === 9) throw new Error(`Failed to open zip for extraction: ${e.message}`)
              this.log(`[ZIP-LOCKED] Zip file is busy, retrying in 1s... (${i+1}/10)`)
              await this.sleep(1000)
          }
      }
      
      // Use a temp directory to handle nested folder structures correctly
      const tempDir = path.join(path.dirname(targetDir), `temp_${Date.now()}`)
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

      try {
          // ----------------------------------------------------------------
          // 1. UNZIP with Progress (Using AdmZip entry-by-entry)
          // ----------------------------------------------------------------
          const entries = zip.getEntries()
          const totalEntries = entries.length
          let extractedCount = 0

          for (const entry of entries) {
              if (signal?.aborted) throw new Error('Extraction aborted')
              
              // Extract individual entry
              // extractEntryTo(entry, targetPath, maintainEntryPath, overwrite)
              zip.extractEntryTo(entry, tempDir, true, true)
              
              extractedCount++
              
              // Throttle progress updates (every 20 files or last one)
              if (extractedCount % 20 === 0 || extractedCount === totalEntries) {
                  this.sendProgress('Extracting Modpack...', extractedCount, totalEntries)
                  // Yield to event loop to prevent UI freeze
                  await new Promise(resolve => setTimeout(resolve, 1))
              }
          }
          
          if (signal?.aborted) throw new Error('Extraction aborted')

          this.log("Extraction complete. Analyzing structure...")
          
          const files = fs.readdirSync(tempDir)
          // Filter out system files
          const visibleFiles = files.filter(f => !f.startsWith('.'))
          
          let sourceDir = tempDir
          
          // Check for GitHub-style nested folder (single directory containing files)
          if (visibleFiles.length === 1) {
              const nestedPath = path.join(tempDir, visibleFiles[0])
              if (fs.statSync(nestedPath).isDirectory()) {
                  // Don't flatten if it's a standard Minecraft folder (e.g. "mods", "config")
                  // This prevents issues where a zip just contains "mods/" at root from being flattened into the instance root
                  const standardFolders = ['mods', 'config', 'versions', 'saves', 'resourcepacks', 'shaderpacks', 'screenshots', 'logs']
                  if (!standardFolders.includes(visibleFiles[0].toLowerCase())) {
                      this.log(`Detected nested root folder: ${visibleFiles[0]}. Flattening...`)
                      sourceDir = nestedPath
                  } else {
                      this.log(`Detected standard folder '${visibleFiles[0]}' at root. Preserving structure.`)
                  }
              }
          }
          
          // ----------------------------------------------------------------
          // 🔄 SMART SYNC (Copy + Cleanup)
          // ----------------------------------------------------------------
          
          if (signal?.aborted) throw new Error('Extraction aborted')

          // Helper for recursive file listing (Async)
          const getAllFiles = async (dir, fileList = []) => {
              if (signal?.aborted) throw new Error('Extraction aborted')
              try {
                  const files = await fs.promises.readdir(dir)
                  for (const file of files) {
                      const filePath = path.join(dir, file)
                      const stat = await fs.promises.stat(filePath)
                      if (stat.isDirectory()) {
                          await getAllFiles(filePath, fileList)
                      } else {
                          fileList.push(filePath)
                      }
                  }
              } catch (e) { }
              return fileList
          }

          if (!fs.existsSync(targetDir)) await fs.promises.mkdir(targetDir, { recursive: true })

          // 1. Get all source files (Relative paths)
          const sourceFiles = await getAllFiles(sourceDir)
          const sourceRelativePaths = sourceFiles.map(f => path.relative(sourceDir, f))
          
          // 2. Copy/Update Files (Source -> Target)
          let processedFiles = 0
          const totalFiles = sourceRelativePaths.length
          
          for (const relPath of sourceRelativePaths) {
              if (signal?.aborted) throw new Error('Extraction aborted')

              const srcFile = path.join(sourceDir, relPath)
              const destFile = path.join(targetDir, relPath)
              
              // Rule: Don't overwrite User Settings (options.txt, etc)
              const isSettings = relPath.toLowerCase() === 'options.txt' || 
                               (relPath.toLowerCase().startsWith('options') && relPath.endsWith('.txt'))
                               
              if (isSettings && fs.existsSync(destFile)) {
                  this.log(`Skipping settings file: ${relPath}`)
                  processedFiles++
                  continue
              }

              // Ensure dest dir exists
              const destDir = path.dirname(destFile)
              if (!fs.existsSync(destDir)) await fs.promises.mkdir(destDir, { recursive: true })

              // Overwrite
              if (fs.existsSync(destFile)) {
                  await fs.promises.rm(destFile, { recursive: true, force: true })
              }
              
              // Rename is faster
              await fs.promises.rename(srcFile, destFile)
              
              processedFiles++
              // Update progress for installation phase
              if (processedFiles % 10 === 0 || processedFiles === totalFiles) {
                  this.sendProgress('Installing Files...', processedFiles, totalFiles)
                  await new Promise(resolve => setTimeout(resolve, 1))
              }
          }
          
          // 3. Cleanup Extra Files (Target -> Delete)
          // User request: "Check Config and Mods" -> Remove extras in these folders
          const foldersToCheck = ['mods', 'config']
          let dynamicWhitelist = []
          if (Array.isArray(ignoreFiles)) {
              dynamicWhitelist = ignoreFiles
          } else if (typeof ignoreFiles === 'string' && ignoreFiles.trim()) {
              dynamicWhitelist = [ignoreFiles]
          }
          const whitelist = ['figura', 'fragmentskin', 'emotes', 'options', ...dynamicWhitelist]
          
          for (const folder of foldersToCheck) {
              if (signal?.aborted) throw new Error('Extraction aborted')
              const targetFolder = path.join(targetDir, folder)
              if (!fs.existsSync(targetFolder)) continue

              const targetFiles = await getAllFiles(targetFolder)
              
              for (const absPath of targetFiles) {
                  const relPath = path.relative(targetDir, absPath)
                  
                  // Normalize paths for comparison (Windows backslashes)
                  const normRelPath = relPath.split(path.sep).join('/')
                  
                  // Check if file existed in source
                  const inSource = sourceRelativePaths.some(p => p.split(path.sep).join('/') === normRelPath)
                  
                  if (!inSource) {
                      // File is extra. Check Whitelist.
                      const isWhitelisted = whitelist.some(w => normRelPath.toLowerCase().includes(w.toLowerCase()))
                      
                      if (!isWhitelisted) {
                          this.log(`Removing extra file: ${relPath}`)
                          try { await fs.promises.rm(absPath, { force: true }) } catch(e) {}
                      } else {
                          this.log(`Preserving whitelisted file: ${relPath}`)
                      }
                  }
              }
          }
          
          this.log("Files installed successfully.")
          return true

      } catch (e) {
          this.log(`Extraction/Sync failed: ${e.message}`)
          throw e
      } finally {
          // Cleanup temp directory
          if (fs.existsSync(tempDir)) {
              try {
                  fs.rmSync(tempDir, { recursive: true, force: true })
                  this.log(`Cleaned up temp directory: ${tempDir}`)
              } catch (e) {
                  this.log(`Failed to cleanup temp directory: ${e.message}`)
              }
          }
      }
  }
}
