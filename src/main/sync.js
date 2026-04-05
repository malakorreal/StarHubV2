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
const CHUNK_SIZE = 2 * 1024 * 1024 // 2MB chunks

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
    const formattedMessage = `[SyncManager] ${message}`
    console.log(formattedMessage)
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        // Send logs to UI to help users debug when things look "stuck"
        this.mainWindow.webContents.send('launch-progress', {
            type: 'log',
            message: formattedMessage,
            timestamp: Date.now()
        })
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Enhanced ignore logic supporting:
   * - Exact paths: "options.txt", "mods/keep-me.jar"
   * - Directory: "config/", "screenshots" (matches all contents)
   * - Wildcards: "*.txt", "logs/*.log", "config/.*"
   */
  shouldIgnore(relPath, ignoreList) {
    if (!relPath) return false
    
    // Normalize path (Windows backslashes to forward slashes)
    const normPath = relPath.replace(/\\/g, '/').toLowerCase().replace(/^\/+/, '')
    
    const systemWhitelist = ['figura', 'fragmentskin', 'cache', 'shaderpacks', 'screenshots', 'emotes', 'logs']
    const combined = [...systemWhitelist, ...(Array.isArray(ignoreList) ? ignoreList : [])]

    return combined.some(pattern => {
      if (!pattern) return false
      
      // Normalize pattern: convert \ to /, remove leading /, and handle "./"
      let p = String(pattern)
        .replace(/\\/g, '/')
        .toLowerCase()
        .replace(/^\/+/, '')
        .replace(/\/+\.\/+/g, '/') // "config/./" -> "config/"
        .replace(/\/+\.$/, '/')    // "config/." -> "config/"
      
      // 1. Exact match
      if (normPath === p) return true

      // 2. Directory match (e.g. "config/" matches "config/file.txt")
      const dirPattern = p.endsWith('/') ? p : p + '/'
      if (normPath.startsWith(dirPattern)) return true

      // 3. Simple Wildcard match (e.g. "*.txt")
      if (p.includes('*')) {
        // Convert glob-like pattern to regex
        const regexPattern = p
          .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
          .replace(/\\\*/g, '.*')               // Convert * to .*
        
        try {
            const regex = new RegExp(`^${regexPattern}$`)
            if (regex.test(normPath)) return true
            
            // Handle "folder/*.ext" style
            if (p.includes('/') && !p.endsWith('*')) {
                const folderPart = p.substring(0, p.lastIndexOf('/') + 1)
                if (normPath.startsWith(folderPart)) {
                    const filePart = normPath.substring(folderPart.length)
                    const filePattern = p.substring(folderPart.length)
                    const fileRegex = new RegExp(`^${filePattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*')}$`)
                    if (fileRegex.test(filePart)) return true
                }
            }
        } catch (e) {
            console.error(`[IGNORE] Invalid regex from pattern ${p}:`, e.message)
        }
      }

      // 4. Filename match (Legacy support - check if the pattern matches just the basename)
      if (path.basename(normPath) === p) return true

      return false
    })
  }

  /**
   * Helper to safely open a file with retry logic for EPERM errors (Common on Windows)
   */
  async safeOpen(dest, mode, retries = 15, delay = 1000) {
      for (let i = 0; i < retries; i++) {
          try {
              if (mode === 'w') {
                  try {
                      if (fs.existsSync(dest)) {
                          fs.chmodSync(dest, 0o666) 
                          // If it's a new write and we're retrying, try to delete it first
                          if (i > 0) {
                              try { fs.unlinkSync(dest) } catch(e) {}
                          }
                      }
                  } catch (e) {}
              }

              const handle = await fs.promises.open(dest, mode)
              return handle
          } catch (e) {
              const isLocked = e.code === 'EPERM' || e.code === 'EBUSY' || e.code === 'EACCES'
              if (isLocked && i < retries - 1) {
                  this.log(`[FILE-LOCKED] ${path.basename(dest)} is locked (${e.code}), retrying... (${i+1}/${retries})`)
                  // On Windows, EPERM often means an antivirus is scanning the file or it's locked by another handle.
                  // Small delay then retry.
                  await this.sleep(delay)
                  continue
              }
              throw e
          }
      }
  }

  async safeMoveFile(src, dest, retries = 20, baseDelayMs = 200) {
      for (let i = 0; i < retries; i++) {
          try {
              await fs.promises.rename(src, dest)
              return true
          } catch (e) {
              const code = e?.code
              const isLocked = code === 'EPERM' || code === 'EBUSY' || code === 'EACCES'
              if (isLocked) {
                  try {
                      await fs.promises.copyFile(src, dest)
                      try { await fs.promises.unlink(src) } catch (e2) {}
                      return true
                  } catch (copyErr) {}
              }
              if (i === retries - 1) throw e
              const wait = Math.min(baseDelayMs * Math.pow(2, Math.max(i - 1, 0)), 4000) + Math.floor(Math.random() * 120)
              await this.sleep(wait)
          }
      }
      return false
  }

  /**
   * Download a file with retry logic and progress tracking
   */
  async downloadFile(url, dest, options = {}) {
    const { 
        retries = MAX_RETRIES + 3, // Even more retries for slow connections
        onProgress = () => {},
        checkSize = true,
        signal = null,
        connectTimeoutMs = 60000,
        stallTimeoutMs = 120000,
        retryDelayBaseMs = 1500,
        maxRetryDelayMs = 15000
    } = options

    const fileName = path.basename(dest)
    this.log(`[DOWNLOAD] Starting download for ${fileName}`)
    
    // Use unique temp filename to avoid EPERM on open/rename if multiple attempts happen
    const tempDest = `${dest}.tmp_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    let attempt = 0
    while (attempt <= retries) {
        if (signal?.aborted) throw new Error('Download aborted')
        
        let fd = null
        try {
            try { if (fs.existsSync(tempDest)) fs.unlinkSync(tempDest) } catch (e) {}

            // Pre-check size with timeout
            if (checkSize && fs.existsSync(dest)) {
                try {
                    const stats = await fs.promises.stat(dest)
                    const head = await axios.head(url, {
                        headers: { 'User-Agent': 'Mozilla/5.0' },
                        timeout: 15000,
                        validateStatus: (status) => status >= 200 && status < 300,
                        signal: signal || undefined
                    })
                    const remoteSize = parseInt(head.headers['content-length'], 10)
                    if (remoteSize > 0 && stats.size === remoteSize) {
                        this.log(`[DOWNLOAD] Already exists: ${fileName}`)
                        return true
                    }
                } catch (e) { /* Fallback to download */ }
            }
            
            this.log(`[DOWNLOAD] Requesting URL: ${url}`)
            const response = await axios({
                method: 'get',
                url: url,
                responseType: 'stream',
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': '*/*'
                },
                timeout: connectTimeoutMs, 
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                maxRedirects: 10,
                signal: signal || undefined
            })

            const totalLength = parseInt(response.headers['content-length'], 10) || 0
            let downloaded = 0
            
            fd = await this.safeOpen(tempDest, 'w')
            const writer = fs.createWriteStream(null, { fd: fd.fd, autoClose: false })
            
            let lastOnProgress = 0
            
            // Setup response data handling with timeout protection
            let dataReceivedAt = Date.now()
            const dataTimeoutCheck = setInterval(() => {
                if (Date.now() - dataReceivedAt > stallTimeoutMs) {
                    response.data.destroy(new Error('Data transfer timeout'))
                    clearInterval(dataTimeoutCheck)
                }
            }, 5000)

            const abortListener = () => {
                try { response.data?.destroy(new Error('Download aborted')) } catch (e) {}
                try { writer.destroy(new Error('Download aborted')) } catch (e) {}
                try { clearInterval(dataTimeoutCheck) } catch (e) {}
            }
            if (signal) signal.addEventListener('abort', abortListener, { once: true })

            response.data.on('data', (chunk) => {
                dataReceivedAt = Date.now()
                downloaded += chunk.length
                const now = Date.now()
                // Update progress even if totalLength is 0 (unknown)
                if (now - lastOnProgress > 150 || (totalLength > 0 && downloaded === totalLength)) {
                    onProgress(downloaded, totalLength || 0)
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
                writer.on('finish', () => {
                    clearInterval(dataTimeoutCheck)
                    resolve()
                })
                writer.on('error', (err) => {
                    clearInterval(dataTimeoutCheck)
                    writer.destroy()
                    reject(err)
                })
                response.data.on('error', (err) => {
                    clearInterval(dataTimeoutCheck)
                    writer.destroy()
                    reject(err)
                })
            })

            if (signal) {
                try { signal.removeEventListener('abort', abortListener) } catch (e) {}
            }

            if (totalLength > 0) {
                const stat = await fd.stat()
                if (stat.size !== totalLength) {
                    throw new Error(`Incomplete: expected ${totalLength} but got ${stat.size}`)
                }
            }

            await fd.close()
            fd = null

            // Atomic rename with retries
            this.log(`[DOWNLOAD] Finalizing: ${fileName}`)
            if (fs.existsSync(dest)) {
                 try { fs.chmodSync(dest, 0o666); fs.unlinkSync(dest) } catch(e) {}
            }
            
            for (let i = 0; i < 15; i++) {
                try {
                    fs.renameSync(tempDest, dest)
                    break
                } catch(e) {
                    if (i === 14) throw e
                    await this.sleep(1000)
                }
            }

            this.log(`[DOWNLOAD] Success: ${fileName}`)
            return true

        } catch (error) {
            if (fd) {
                try { await fd.close() } catch(e) {}
                fd = null
            }
            try { if (fs.existsSync(tempDest)) fs.unlinkSync(tempDest) } catch(e) {}
            attempt++
            this.log(`[DOWNLOAD] Error (Attempt ${attempt}/${retries}): ${fileName} - ${error.message}`)
            if (attempt > retries) {
                throw error
            }
            const waitTime = Math.min(retryDelayBaseMs * Math.pow(2, Math.max(attempt - 1, 0)), maxRetryDelayMs) + Math.floor(Math.random() * 250)
            await this.sleep(waitTime)
        }
    }
  }

  /**
   * Download a large file using chunks (Range requests)
   * Enhanced: Supports resuming from partial downloads if internet fails.
   */
  async downloadLargeFile(url, dest, options = {}) {
     const { 
        signal = null, 
        retries = 7,
        chunkTimeoutMs = 300000,
        maxTotalTimeMs = 30 * 60 * 1000,
        retryDelayBaseMs = 1500,
        maxRetryDelayMs = 15000
     } = options
     const fileName = path.basename(dest)
     this.log(`[LARGE-DOWNLOAD] Starting chunked download: ${fileName}`)
     
     // Stable temp filename for resuming
     const tempDest = `${dest}.part`
     const stateFile = `${dest}.state`
     const startedAt = Date.now()
     const chunkSize = CHUNK_SIZE

     let totalSize = 0
     try {
         if (signal?.aborted) throw new Error('Download aborted')
         
         // 🚨 ROBUST HEAD REQUEST: Some servers (like Dropbox) need a specific UA or respond better to a small GET range
         const getInfo = async (u) => {
             try {
                const h = await axios.head(u, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
                    timeout: 20000,
                    validateStatus: (status) => status >= 200 && status < 400,
                    signal: signal || undefined
                })
                return h
             } catch (e) {
                // Fallback to a 0-byte GET request if HEAD fails
                return await axios.get(u, {
                    headers: { 'Range': 'bytes=0-0', 'User-Agent': 'Mozilla/5.0' },
                    timeout: 20000,
                    validateStatus: (status) => status >= 200 && status < 400,
                    signal: signal || undefined
                })
             }
         }

         const head = await getInfo(url)
         const contentRange = head.headers['content-range']
         if (contentRange) {
             const parts = contentRange.split('/')
             totalSize = parseInt(parts[parts.length - 1], 10)
         } else {
             totalSize = parseInt(head.headers['content-length'], 10) || 0
         }
         
         const acceptRanges = head.headers['accept-ranges']
         const hasRangeSupport = (acceptRanges === 'bytes') || !!contentRange
         
         if (!hasRangeSupport) {
             this.log("[LARGE-DOWNLOAD] No range support detected, falling back to stream.")
             return this.downloadFile(url, dest, options)
         }

     } catch (e) {
         if (signal?.aborted) throw new Error('Download aborted')
         this.log(`[LARGE-DOWNLOAD] Size check failed: ${e.message}. Falling back to standard download.`)
         return this.downloadFile(url, dest, options)
     }

     if (!totalSize || isNaN(totalSize)) {
         this.log("[LARGE-DOWNLOAD] Could not determine total size, falling back to stream.")
         return this.downloadFile(url, dest, options)
     }

     const chunks = Math.ceil(totalSize / chunkSize)
     this.log(`Downloading ${fileName} in ${chunks} chunks (${(totalSize/1024/1024).toFixed(2)} MB)`)

     // 🔄 RESUME LOGIC: Check if we have a partial state
     let finishedChunks = new Set()
     try {
         if (fs.existsSync(stateFile) && fs.existsSync(tempDest)) {
             const rawState = fs.readFileSync(stateFile, 'utf8')
             const state = JSON.parse(rawState)
             // Only resume if it's the same file (same size)
             if (state.totalSize === totalSize && state.chunkSize === chunkSize) {
                 finishedChunks = new Set(state.finished || [])
                 this.log(`[RESUME] Found partial download. Resuming from chunk ${finishedChunks.size}/${chunks}...`)
             } else {
                 this.log("[RESUME] File size changed, starting fresh.")
                 try { fs.unlinkSync(tempDest); fs.unlinkSync(stateFile) } catch(e) {}
             }
         }
     } catch (e) {
         this.log("[RESUME] Failed to read state file, starting fresh.")
     }

     // Ensure temp file exists (open with 'a' to avoid truncation, or 'w' if fresh)
     const mode = finishedChunks.size > 0 ? 'r+' : 'w'
     if (mode === 'w' && !fs.existsSync(path.dirname(tempDest))) {
         fs.mkdirSync(path.dirname(tempDest), { recursive: true })
     }
     
     const fd = await this.safeOpen(tempDest, mode)
     // If we are starting fresh with 'w', make sure file is allocated (optional but good)
     
     let downloadedTotal = finishedChunks.size * chunkSize 
     // Note: last chunk might be smaller, but this is used for progress UI
     if (finishedChunks.size === chunks) downloadedTotal = totalSize

     let abortError = null
     
     const saveState = () => {
         try {
             fs.writeFileSync(stateFile, JSON.stringify({
                 totalSize,
                 chunkSize,
                 finished: Array.from(finishedChunks),
                 updatedAt: Date.now()
             }))
         } catch (e) {}
     }

     const downloadChunk = async (i) => {
         if (signal?.aborted || abortError) return
         if (finishedChunks.has(i)) return // Skip already finished chunks

         const start = i * chunkSize
         const end = Math.min(start + chunkSize - 1, totalSize - 1)
         
         let attempt = 0
         while (attempt <= retries) {
             if (signal?.aborted || abortError) return
             if (Date.now() - startedAt > maxTotalTimeMs) throw new Error('Download timeout')
             try {
                 const startTime = Date.now()
                 const response = await axios({
                    method: 'get',
                    url: url,
                    headers: { Range: `bytes=${start}-${end}`, 'User-Agent': 'Mozilla/5.0' },
                    responseType: 'arraybuffer',
                    timeout: chunkTimeoutMs,
                    signal: signal || undefined
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

                 finishedChunks.add(i)
                 downloadedTotal += buffer.length
                 response.data = null 
                 
                 // Periodically save state (every 5 chunks or so)
                 if (finishedChunks.size % 5 === 0) saveState()

                 this.sendProgress('Downloading Modpack...', downloadedTotal, totalSize)
                 return 
             } catch (e) {
                 if (signal?.aborted || abortError) return
                 attempt++
                 this.log(`[CHUNK-ERROR] Chunk ${i} failed (Attempt ${attempt}/${retries}): ${e.message}`)
                 if (attempt > retries) throw e
                 
                 this.sendProgress('Downloading Modpack...', downloadedTotal, totalSize, `เครือข่ายไม่เสถียร กำลังลองใหม่ (${attempt}/${retries})`)
                 const waitTime = Math.min(retryDelayBaseMs * Math.pow(2, Math.max(attempt - 1, 0)), maxRetryDelayMs) + Math.floor(Math.random() * 250)
                 await this.sleep(waitTime)
             }
         }
     }

     const queue = Array.from({ length: chunks }, (_, i) => i).filter(i => !finishedChunks.has(i))
     const workers = []
     // Reduce concurrency for slow internet if needed, but 3-5 is usually fine
     const concurrency = Math.min(getStore().get('maxConcurrentDownloads', 5), 3) 

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
            // Check if we can fix it by downloading missing chunks
            throw new Error(`Incomplete: expected ${totalSize} but got ${stat.size}`)
        }

     } catch (e) {
        if (fd) {
            try { await fd.close() } catch(err) {}
        }
        // DO NOT delete temp file or state file on failure! 
        // This allows resuming on the next attempt.
        throw e
     }
     
     await fd.close()

     this.log(`[LARGE-DOWNLOAD] Finalizing: ${fileName}`)
     if (fs.existsSync(dest)) {
          try { fs.chmodSync(dest, 0o666); fs.unlinkSync(dest) } catch(e) {}
     }
     
     for (let i = 0; i < 15; i++) {
         try {
             fs.renameSync(tempDest, dest)
             // SUCCESS: Cleanup state file
             try { if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile) } catch(e) {}
             break
         } catch(e) {
             if (i === 14) throw e
             this.log(`[RENAME-LOCKED] Failed to finalize file, retrying... (${i+1}/15)`)
             await this.sleep(1000)
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
                // Individual mod download retry logic (handled by downloadFile)
                try {
                    await this.downloadFile(modUrl, dest, {
                        signal,
                        retries: 5, // More retries for individual mods
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
                } catch (e) {
                    // Log error but maybe try to continue with other mods?
                    // For now, we still abort if a mod fails completely after retries, 
                    // but the retries are now more robust.
                    throw e
                }
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
  async comparePatches(folder, validFilenames = [], ignoreList = [], pathPrefix = "") {
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
          // Create a lowercase map for case-insensitive lookup on Windows
          const validLowercaseMap = new Map(validFilenames.map(v => [normalizeRel(v).toLowerCase(), v]))
          const lowerValidBasenames = new Set(validFilenames.map(v => path.basename(v).toLowerCase()))

          const localFiles = []
          const listFilesRecursive = async (dir, prefix = "") => {
              const entries = await fs.promises.readdir(dir, { withFileTypes: true })
              for (const ent of entries) {
                  const rel = prefix ? `${prefix}/${ent.name}` : ent.name
                  const abs = path.join(dir, ent.name)
                  
                  // Use pathPrefix to check against ignoreFiles (e.g. "mods/my-mod.jar")
                  const fullRel = pathPrefix ? `${pathPrefix}/${rel}` : rel
                  const isWhitelisted = this.shouldIgnore(fullRel, ignoreList)
                  
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

              const normalizedRel = f.rel.toLowerCase()
              const isValidExact = validSet.has(f.rel)
              // 🚨 CASE-INSENSITIVE CHECK: On Windows, we should be lenient with case
              const isValidCaseInsensitive = validLowercaseMap.has(normalizedRel)
              
              const isModFile = f.rel.startsWith('mods/')
              
              // For config files, we allow minor name mismatches (like case differences)
              const isConfig = f.rel.endsWith('.txt') || f.rel.endsWith('.options') || f.rel.endsWith('.json')
              const isValidByName = !isModFile && isConfig && lowerValidBasenames.has(f.name.toLowerCase())

              if (isValidExact || isValidCaseInsensitive || (isValidByName && f.rel.split('/')[0] === Array.from(validSet).find(v => path.basename(v).toLowerCase() === f.name.toLowerCase())?.split('/')[0])) {
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
              const existsCaseInsensitive = localFiles.some(f => f.rel.toLowerCase() === normValid.toLowerCase())
              const existsByName = localFiles.some(f => f.name.toLowerCase() === path.basename(valid).toLowerCase())
              
              if (!existsExact && !existsCaseInsensitive && !existsByName) {
                  if (!result.added.includes(valid)) result.added.push(valid)
              } else if (result.corrupt.includes(normValid) || (existsCaseInsensitive && result.corrupt.includes(localFiles.find(f => f.rel.toLowerCase() === normValid.toLowerCase()).rel))) {
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
  async cleanupFolder(folder, validFilenames = [], ignoreList = [], pathPrefix = "") {
      try {
          if (!fs.existsSync(folder)) return

          this.log(`[CLEANUP] Checking folder: ${folder} (Prefix: ${pathPrefix})`)
          
          // Use comparePatches logic to identify files to delete
          const { deleted } = await this.comparePatches(folder, validFilenames, ignoreList, pathPrefix)

          for (const file of deleted) {
              const filePath = path.join(folder, file)
              this.log(`[CLEANUP] Removing old/extra file: ${file}`)
              await fs.promises.rm(filePath, { recursive: true, force: true })
          }

          const pruneEmptyDirs = async (dir, prefix = "") => {
              const entries = await fs.promises.readdir(dir, { withFileTypes: true })
              for (const ent of entries) {
                  if (!ent.isDirectory()) continue
                  const rel = prefix ? `${prefix}/${ent.name}` : ent.name
                  const abs = path.join(dir, ent.name)
                  
                  const fullRel = pathPrefix ? `${pathPrefix}/${rel}` : rel
                  const isWhitelisted = this.shouldIgnore(fullRel, ignoreList)
                  
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
              // Use double quotes for paths and escape single quotes for PowerShell
              const escapedZipPath = zipPath.replace(/'/g, "''")
              const escapedTargetDir = targetDir.replace(/'/g, "''")
              
              // Use a more robust PowerShell command that handles UTF-8 paths better
              const psCommand = `Expand-Archive -Path '${escapedZipPath}' -DestinationPath '${escapedTargetDir}' -Force`
              const command = `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "${psCommand}"`
              
              childProcess = exec(command, { maxBuffer: 1024 * 1024, env: { ...process.env, LANG: 'en_US.UTF-8' } }, (error, stdout, stderr) => {
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
   * Helper to get zip entries safely with retries
   */
  async getZipEntries(zipPath) {
      for (let i = 0; i < 10; i++) {
          try {
              const zip = new AdmZip(zipPath)
              return zip.getEntries()
          } catch (e) {
              if (i === 9) throw e
              await this.sleep(1000)
          }
      }
      return []
  }

  /**
   * Extract Zip file with Progress
   * Enhanced: Returns list of extracted relative paths for cleanup whitelist.
   */
  async extractZip(zipPath, targetDir, options = {}) {
      const { signal = null, ignoreFiles = [] } = options
      if (signal?.aborted) throw new Error('Extraction aborted')

      this.log(`Extracting ${path.basename(zipPath)}...`)
      
      const entries = await this.getZipEntries(zipPath)
      const zip = new AdmZip(zipPath)
      
      // Use a temp directory for extraction to ensure atomicity
      const tempDir = path.join(path.dirname(targetDir), `extract_tmp_${Date.now()}`)
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

      try {
          // ----------------------------------------------------------------
          // 1. UNZIP
          // ----------------------------------------------------------------
          let extractionSuccess = false
          if (process.platform === 'win32') {
              try {
                  await this.nativeUnzip(zipPath, tempDir, signal)
                  extractionSuccess = true
              } catch (err) {
                  this.log(`Native unzip failed: ${err.message}`)
              }
          }

          if (!extractionSuccess) {
              const totalEntries = entries.length
              let extractedCount = 0
              for (const entry of entries) {
                  if (signal?.aborted) throw new Error('Extraction aborted')
                  zip.extractEntryTo(entry, tempDir, true, true)
                  extractedCount++
                  if (extractedCount % 50 === 0 || extractedCount === totalEntries) {
                      this.sendProgress('Extracting Modpack...', extractedCount, totalEntries)
                      await new Promise(resolve => setTimeout(resolve, 1))
                  }
              }
          }
          
          if (signal?.aborted) throw new Error('Extraction aborted')

          // ----------------------------------------------------------------
          // 2. ANALYZE STRUCTURE & FLATTEN
          // ----------------------------------------------------------------
          const files = fs.readdirSync(tempDir)
          const visibleFiles = files.filter(f => !f.startsWith('.'))
          let sourceDir = tempDir
          
          if (visibleFiles.length === 1) {
              const nestedPath = path.join(tempDir, visibleFiles[0])
              if (fs.statSync(nestedPath).isDirectory()) {
                  const standardFolders = ['mods', 'config', 'versions', 'saves', 'resourcepacks', 'shaderpacks', 'screenshots', 'logs']
                  if (!standardFolders.includes(visibleFiles[0].toLowerCase())) {
                      sourceDir = nestedPath
                  }
              }
          }
          
          // ----------------------------------------------------------------
          // 3. ATOMIC SYNC (Source -> Target)
          // ----------------------------------------------------------------
          const getAllFiles = async (dir, fileList = []) => {
              if (signal?.aborted) throw new Error('Extraction aborted')
              try {
                  const entries = await fs.promises.readdir(dir, { withFileTypes: true })
                  for (const ent of entries) {
                      const filePath = path.join(dir, ent.name)
                      if (ent.isDirectory()) {
                          await getAllFiles(filePath, fileList)
                      } else {
                          fileList.push(filePath)
                      }
                  }
              } catch (e) { }
              return fileList
          }

          if (!fs.existsSync(targetDir)) await fs.promises.mkdir(targetDir, { recursive: true })

          const sourceFiles = await getAllFiles(sourceDir)
          const sourceRelativePaths = sourceFiles.map(f => path.relative(sourceDir, f).replace(/\\/g, '/'))
          
          let processedFiles = 0
          const totalFiles = sourceRelativePaths.length
          
          for (const relPath of sourceRelativePaths) {
              if (signal?.aborted) throw new Error('Extraction aborted')

              const srcFile = path.join(sourceDir, relPath)
              const destFile = path.join(targetDir, relPath)
              
              const isSettings = relPath.toLowerCase() === 'options.txt' || 
                               (relPath.toLowerCase().startsWith('options') && relPath.endsWith('.txt'))
                               
              if (isSettings && fs.existsSync(destFile)) {
                  processedFiles++
                  continue
              }

              const destDir = path.dirname(destFile)
              if (!fs.existsSync(destDir)) await fs.promises.mkdir(destDir, { recursive: true })

              if (fs.existsSync(destFile)) {
                  try {
                      await fs.promises.rm(destFile, { recursive: true, force: true })
                  } catch (e) {
                      const trash = `${destFile}.old_${Date.now()}`
                      try { await fs.promises.rename(destFile, trash) } catch(err) {}
                  }
              }
              
              await this.safeMoveFile(srcFile, destFile)
              
              processedFiles++
              if (processedFiles % 25 === 0 || processedFiles === totalFiles) {
                  this.sendProgress('Installing Files...', processedFiles, totalFiles)
                  await new Promise(resolve => setTimeout(resolve, 1))
              }
          }
          
          this.log("Files installed successfully.")
          return sourceRelativePaths // Return list of files extracted

      } catch (e) {
          this.log(`Extraction/Sync failed: ${e.message}`)
          throw e
      } finally {
          if (fs.existsSync(tempDir)) {
              try { fs.rmSync(tempDir, { recursive: true, force: true }) } catch (e) { }
          }
      }
  }
}
