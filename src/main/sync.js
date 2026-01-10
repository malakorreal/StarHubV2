import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import axios from 'axios'
import AdmZip from 'adm-zip'

// ----------------------------------------------------------------------
// 🔧 SYNC CONFIGURATION
// ----------------------------------------------------------------------
const CONCURRENCY_LIMIT = 5
const MAX_RETRIES = 3
const CHUNK_SIZE = 10 * 1024 * 1024 // 10MB chunks

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
   * Download a file with retry logic and progress tracking
   */
  async downloadFile(url, dest, options = {}) {
    const { 
        retries = MAX_RETRIES, 
        onProgress = () => {},
        checkSize = true,
        signal = null
    } = options

    let attempt = 0
    while (attempt <= retries) {
        if (signal?.aborted) throw new Error('Download aborted')
        try {
            // Check if file exists and has correct size (if possible)
            try {
                // Use async fs.stat
                const stats = await fs.promises.stat(dest)
                if (checkSize) {
                    const head = await axios.head(url)
                    const remoteSize = parseInt(head.headers['content-length'], 10)
                    if (remoteSize && remoteSize === stats.size) {
                        this.log(`File already exists and matches size: ${path.basename(dest)}`)
                        return true // Skip download
                    }
                } else {
                    // If we don't check size, existence is enough? 
                    // Usually we want to verify, but for speed, maybe existence is okay.
                    // Let's stick to size check if requested.
                }
            } catch (e) {
                // File doesn't exist or error checking, proceed to download
            }
            
            // If we are here, we need to download.
            // Check if we should use chunked download for large files?
            // For individual mods (usually small), stream is fine.
            // For modpacks (large), chunked is better.
            
            const response = await axios({
                method: 'get',
                url: url,
                responseType: 'stream'
            })

            const totalLength = response.headers['content-length']
            let downloaded = 0
            
            const writer = fs.createWriteStream(dest)
            
            // Throttle onProgress callback inside downloadFile too
            let lastOnProgress = 0
            
            response.data.on('data', (chunk) => {
                downloaded += chunk.length
                const now = Date.now()
                // Only fire callback every 100ms
                if (totalLength && (now - lastOnProgress > 100 || downloaded === parseInt(totalLength, 10))) {
                    onProgress(downloaded, parseInt(totalLength, 10))
                    lastOnProgress = now
                }
            })

            response.data.pipe(writer)

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve)
                writer.on('error', reject)
            })

            return true

        } catch (error) {
            attempt++
            this.log(`Download failed (Attempt ${attempt}/${retries}): ${path.basename(dest)} - ${error.message}`)
            if (attempt > retries) throw error
            await this.sleep(1000 * attempt) // Exponential backoffish
        }
    }
  }

  /**
   * Download a large file using chunks (Range requests)
   */
  async downloadLargeFile(url, dest, options = {}) {
     const { signal = null } = options
     
     // 1. Get file size
     let totalSize = 0
     try {
         if (signal?.aborted) throw new Error('Download aborted')
         const head = await axios.head(url)
         totalSize = parseInt(head.headers['content-length'], 10)
     } catch (e) {
         if (signal?.aborted || e.message === 'Download aborted') throw new Error('Download aborted')
         this.log("Could not determine file size for chunked download, falling back to stream.")
         return this.downloadFile(url, dest, options)
     }

     if (!totalSize) return this.downloadFile(url, dest, options)

     // 2. Setup chunks
     const chunks = Math.ceil(totalSize / CHUNK_SIZE)
     this.log(`Downloading ${path.basename(dest)} in ${chunks} chunks (Total: ${(totalSize/1024/1024).toFixed(2)} MB)`)

     const fd = await fs.promises.open(dest, 'w')
     let downloadedTotal = 0
     
     const downloadChunk = async (i) => {
         if (signal?.aborted) throw new Error('Download aborted')
         
         const start = i * CHUNK_SIZE
         const end = Math.min(start + CHUNK_SIZE - 1, totalSize - 1)
         
         let retries = 0
         while (retries <= MAX_RETRIES) {
             if (signal?.aborted) throw new Error('Download aborted')
             try {
                 const response = await axios({
                     method: 'get',
                     url: url,
                     headers: {
                         Range: `bytes=${start}-${end}`
                     },
                     responseType: 'arraybuffer'
                 })
                 
                 if (signal?.aborted) throw new Error('Download aborted')

                 // Write at specific position (safe for concurrency)
                 await fd.write(response.data, 0, response.data.length, start)
                 
                 // Update progress
                 downloadedTotal += response.data.length
                 // Explicitly free buffer memory
                 response.data = null 
                 
                 this.sendProgress('Downloading Modpack...', downloadedTotal, totalSize)
                 return // Success
             } catch (e) {
                 if (signal?.aborted || e.message === 'Download aborted') throw new Error('Download aborted')
                 retries++
                 if (retries > MAX_RETRIES) {
                     throw e
                 }
                 await this.sleep(1000 * retries)
             }
         }
     }

     // Parallel Execution with Limit
     const queue = Array.from({ length: chunks }, (_, i) => i)
     const workers = []
     
     // Shared error state to stop other workers
     let abortError = null

     for (let w = 0; w < CONCURRENCY_LIMIT; w++) {
         workers.push((async () => {
             while (queue.length > 0) {
                 if (abortError || signal?.aborted) return
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
     } catch (e) {
        await fd.close()
        throw e
     }
     
     await fd.close()
     return true
  }

  /**
   * Sync a list of mods with concurrency
   */
  async syncMods(mods, modsFolder, options = {}) {
      if (!mods || mods.length === 0) return
      const { signal = null } = options

      try {
          await fs.promises.access(modsFolder)
      } catch {
          await fs.promises.mkdir(modsFolder, { recursive: true })
      }

      this.log(`Syncing ${mods.length} mods...`)
      
      let completed = 0
      const total = mods.length
      
      // Simple queue for concurrency
      const queue = [...mods]
      
      let abortError = null

      const next = async () => {
          if (queue.length === 0 || abortError || signal?.aborted) return
          const modUrl = queue.shift()
          
          try {
            if (signal?.aborted) throw new Error('Download aborted')

            // Infer filename
            const fileName = decodeURIComponent(modUrl.split('/').pop().split('?')[0])
            const dest = path.join(modsFolder, fileName)

            // Check existence (simple cache) - Use async stat to avoid blocking loop
            try {
                await fs.promises.stat(dest)
                // Exists, skip
            } catch (e) {
                // Not exist, download
                await this.downloadFile(modUrl, dest, {
                    signal,
                    onProgress: (loaded, full) => {
                        // Too noisy to send progress for every mod's bytes
                        // Just track completion count
                    }
                })
            }
          } catch (e) {
              if (e.message === 'Download aborted') {
                  abortError = e
                  return
              }
              console.error(`Failed to sync mod: ${modUrl}`, e)
              // We don't stop everything for one failed mod, but we log it
          } finally {
              if (!abortError && !signal?.aborted) {
                  completed++
                  this.sendProgress('Checking/Downloading Mods', completed, total)
                  // Process next item
                  await next()
              }
          }
      }

      // Start initial batch
      const workers = []
      for (let i = 0; i < Math.min(CONCURRENCY_LIMIT, mods.length); i++) {
          workers.push(next())
      }
      
      await Promise.all(workers)
      
      if (signal?.aborted || abortError?.message === 'Download aborted') {
          throw new Error('Download aborted')
      }
      
      this.log("Mods sync completed.")
  }

  /**
   * Cleanup folder by removing files not in the whitelist
   */
  async cleanupFolder(folder, validFilenames = []) {
      try {
          if (!fs.existsSync(folder)) return

          this.log(`[CLEANUP] Checking folder: ${folder}`)
          const files = await fs.promises.readdir(folder)
          
          // Hardcoded whitelist for specific mods/folders that should never be deleted
          const systemWhitelist = ['figura', 'fragmentskin', 'cache', 'shaderpacks', 'screenshots']

          for (const file of files) {
              // Check if file is in validFilenames
              if (validFilenames.includes(file)) {
                  continue
              }

              // Check system whitelist
              if (systemWhitelist.some(w => file.toLowerCase().includes(w.toLowerCase()))) {
                   continue
              }

              // Delete
              const filePath = path.join(folder, file)
              this.log(`[CLEANUP] Removing old/extra file: ${file}`)
              await fs.promises.rm(filePath, { recursive: true, force: true })
          }
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
   * Extract Zip file
   */
  async extractZip(zipPath, targetDir, options = {}) {
      const { signal = null } = options
      if (signal?.aborted) throw new Error('Extraction aborted')

      this.log(`Extracting ${path.basename(zipPath)}...`)
      this.sendProgress('Extracting Modpack...', 0, 100) // Indeterminate
      
      // Use a temp directory to handle nested folder structures correctly
      const tempDir = path.join(path.dirname(targetDir), `temp_${Date.now()}`)
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

      try {
          // Use Native Unzip to save RAM
          await this.nativeUnzip(zipPath, tempDir, signal)
          
          if (signal?.aborted) throw new Error('Extraction aborted')

          this.log("Extraction complete. Analyzing structure...")
          
          try {
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
                          for (const relPath of sourceRelativePaths) {
                              if (signal?.aborted) throw new Error('Extraction aborted')

                              const srcFile = path.join(sourceDir, relPath)
                              const destFile = path.join(targetDir, relPath)
                              
                              // Rule: Don't overwrite User Settings (options.txt, etc)
                              const isSettings = relPath.toLowerCase() === 'options.txt' || 
                                               (relPath.toLowerCase().startsWith('options') && relPath.endsWith('.txt'))
                                               
                              if (isSettings && fs.existsSync(destFile)) {
                                  this.log(`Skipping settings file: ${relPath}`)
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
                          }
                          
                          // 3. Cleanup Extra Files (Target -> Delete)
                          // User request: "Check Config and Mods" -> Remove extras in these folders
                          const foldersToCheck = ['mods', 'config']
                          // User request: "Figura, fragmentskin ไม่ต้องตรวจสอบและไม่ต้องลบ"
                          const whitelist = ['figura', 'fragmentskin', 'emotes'] 
                          
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
                          
                          // Cleanup temp directory
                          try { await fs.promises.rm(tempDir, { recursive: true, force: true }) } catch (e) {}
                          
                          this.log("Files installed successfully.")
                          return true
                      } catch (err) {
                          console.error("Error handling nested folder:", err)
                          // Try to cleanup
                          try { fs.rmSync(tempDir, { recursive: true, force: true }) } catch (e) {}
                          throw err
                      }
          } catch (e) {
              try { fs.rmSync(tempDir, { recursive: true, force: true }) } catch (err) {}
              throw new Error(`Failed to load zip: ${e.message}`)
          }
  }
}
