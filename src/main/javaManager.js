import fs from 'fs'
import path from 'path'
import axios from 'axios'
import { app } from 'electron'
import { exec } from 'child_process'
import AdmZip from 'adm-zip'

export class JavaManager {
    constructor(mainWindow) {
        this.mainWindow = mainWindow
        this.baseDir = path.join(app.getPath('userData'), 'java')
        if (!fs.existsSync(this.baseDir)) {
            fs.mkdirSync(this.baseDir, { recursive: true })
        }
    }

    getJavaVersionForMinecraft(mcVersion) {
        const parts = mcVersion.split('.').map(Number)
        const minor = parts[1]
        const patch = parts[2] || 0

        if (minor >= 21) return 21
        if (minor === 20 && patch >= 5) return 21
        if (minor >= 18) return 17
        if (minor === 17) return 17 // Fallback to 17 for 1.17
        return 8
    }

    async ensureJava(mcVersion, signal) {
        const javaVer = this.getJavaVersionForMinecraft(mcVersion)
        // We use a fixed folder name for the version to avoid re-downloading different minor updates constantly
        // unless we want to keep it updated. For now, simple cache by version number.
        const javaTargetDir = path.join(this.baseDir, `jre-${javaVer}`)
        
        // 1. Check if valid Java exists in this folder
        const existingJava = this.findJavaExec(javaTargetDir)
        if (existingJava) {
            console.log(`[JavaManager] Found existing Java ${javaVer} at: ${existingJava}`)
            return existingJava
        }

        // 2. Not found, download
        console.log(`[JavaManager] Java ${javaVer} not found. Downloading JRE...`)
        
        // Clean up partials
        if (fs.existsSync(javaTargetDir)) {
            fs.rmSync(javaTargetDir, { recursive: true, force: true })
        }
        fs.mkdirSync(javaTargetDir, { recursive: true })

        const downloadUrl = `https://api.adoptium.net/v3/binary/latest/${javaVer}/ga/windows/x64/jre/hotspot/normal/eclipse`
        const zipPath = path.join(this.baseDir, `jre-${javaVer}.zip`)

        try {
            this.sendProgress(`Downloading Java ${javaVer}...`, 0)
            await this.downloadFile(downloadUrl, zipPath, signal)
            
            this.sendProgress(`Extracting Java ${javaVer}...`, 0)
            await this.extractZip(zipPath, javaTargetDir, signal)
            
            // Clean zip
            fs.unlinkSync(zipPath)

            const javaExec = this.findJavaExec(javaTargetDir)
            if (!javaExec) {
                throw new Error(`Java executable not found after extraction in ${javaTargetDir}`)
            }

            console.log(`[JavaManager] Java installed successfully: ${javaExec}`)
            return javaExec

        } catch (e) {
            console.error(`[JavaManager] Failed to install Java ${javaVer}:`, e)
            // Cleanup
            if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath)
            if (fs.existsSync(javaTargetDir)) fs.rmSync(javaTargetDir, { recursive: true, force: true })
            throw e
        }
    }

    findJavaExec(dir) {
        if (!fs.existsSync(dir)) return null

        const items = fs.readdirSync(dir, { withFileTypes: true })
        
        // Check for bin/java.exe in current dir
        const binPath = path.join(dir, 'bin', 'java.exe')
        if (fs.existsSync(binPath)) return binPath

        // Check immediate subdirectories (e.g. jre-17.0.x/bin/java.exe)
        for (const item of items) {
            if (item.isDirectory()) {
                const subBinPath = path.join(dir, item.name, 'bin', 'java.exe')
                if (fs.existsSync(subBinPath)) return subBinPath
            }
        }
        
        return null
    }

    async downloadFile(url, dest, signal) {
        const writer = fs.createWriteStream(dest)
        
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
            signal // Pass AbortSignal to axios
        })

        const totalLength = response.headers['content-length']
        let downloaded = 0

        return new Promise((resolve, reject) => {
            response.data.on('data', (chunk) => {
                downloaded += chunk.length
                if (totalLength) {
                    const percent = Math.round((downloaded / totalLength) * 100)
                    // Throttle updates?
                    this.sendProgress(null, percent) // Null message keeps previous
                }
            })

            response.data.pipe(writer)

            writer.on('finish', resolve)
            writer.on('error', reject)
            
            // Handle abort manually if axios doesn't clean up stream immediately
            if (signal) {
                signal.addEventListener('abort', () => {
                    writer.destroy()
                    reject(new Error('Download aborted'))
                }, { once: true })
            }
        })
    }

    async extractZip(zipPath, targetDir, signal) {
        // Use PowerShell for non-blocking extraction if possible, or AdmZip
        // For Java (40MB), AdmZip is okay, but PowerShell is cleaner.
        // Let's use PowerShell logic similar to SyncManager
        
        return new Promise((resolve, reject) => {
            if (signal?.aborted) return reject(new Error('Extraction aborted'))

            const command = `powershell -NoProfile -NonInteractive -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${targetDir}' -Force"`
            
            const child = exec(command, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
                if (signal?.aborted) return
                if (error) {
                    // Fallback to AdmZip
                    try {
                        const zip = new AdmZip(zipPath)
                        zip.extractAllTo(targetDir, true)
                        resolve()
                    } catch (e) {
                        reject(e)
                    }
                } else {
                    resolve()
                }
            })

            if (signal) {
                signal.addEventListener('abort', () => {
                    try { child.kill() } catch (e) {}
                    reject(new Error('Extraction aborted'))
                }, { once: true })
            }
        })
    }

    sendProgress(status, progress) {
        if (this.mainWindow) {
            this.mainWindow.webContents.send('launch-progress', {
                type: 'progress',
                task: status || 'Installing Java',
                total: 100,
                current: progress || 0,
                version: 'Java'
            })
        }
    }
}
